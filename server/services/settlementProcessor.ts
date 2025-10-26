import { storage } from "../storage";
import { getRentalRate, getDriverRent } from "./rentalCalculator";
import { startOfWeek, endOfWeek, addDays } from "date-fns";

export interface WeeklySettlementData {
  vehicleId: number;
  weekStart: Date;
  weekEnd: Date;
  totalTrips: number;
  rentalRate: number;
  totalRentToCompany: number;
  drivers: Array<{ id: number; name: string; rent: number; daysWorked: number }>;
  substitutes: Array<{ id: number; name: string; charge: number }>;
  totalDriverRent: number;
  totalSubstituteCharges: number;
  profit: number;
}

export async function calculateWeeklySettlement(vehicleId: number, weekStartDate: Date): Promise<WeeklySettlementData | null> {
  const vehicle = await storage.getVehicle(vehicleId);
  if (!vehicle) {
    throw new Error(`Vehicle with ID ${vehicleId} not found`);
  }

  const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 }); // Sunday end

  // Get all trips for this vehicle during the week
  const trips = await storage.getTripsByVehicleAndDateRange(vehicleId, weekStart, weekEnd);
  
  // Get substitute driver records for this vehicle during the week
  const weeklySubstituteDrivers = await storage.getSubstituteDriversByVehicleAndDateRange(vehicleId, weekStart, weekEnd);
  
  // Calculate total trips (regular trips + substitute driver trips)
  const regularTrips = trips.reduce((sum, trip) => sum + trip.tripCount, 0);
  const substituteTrips = weeklySubstituteDrivers.reduce((sum, sub) => sum + (sub.tripCount || 1), 0); // Use actual trip count from substitutes
  const totalTrips = regularTrips + substituteTrips;
  
  // Get rental rate based on company and trip count
  const rentalRate = getRentalRate(vehicle.company as "PMV" | "Letzryd", totalTrips);
  const totalRentToCompany = rentalRate * 7;

  // Calculate total expected rent from all drivers who actually drove the vehicle
  const driverRentMap = new Map<number, { driver: any, daysWorked: Set<string> }>();
  
  // Group trips by driver and track unique days worked
  for (const trip of trips) {
    const driver = await storage.getDriver(trip.driverId);
    if (driver) {
      const tripDateKey = trip.tripDate.toISOString().split('T')[0]; // Get date as YYYY-MM-DD
      const currentData = driverRentMap.get(driver.id);
      if (currentData) {
        currentData.daysWorked.add(tripDateKey);
      } else {
        driverRentMap.set(driver.id, {
          driver,
          daysWorked: new Set([tripDateKey])
        });
      }
    }
  }

  // Calculate income from regular drivers based on actual days worked
  let totalRegularDriverRent = 0;
  const drivers = Array.from(driverRentMap.entries()).map(([driverId, data]) => {
    const dailyRent = getDriverRent(data.driver.hasAccommodation);
    const actualRent = dailyRent * data.daysWorked.size; // Pay only for actual days worked
    totalRegularDriverRent += actualRent;
    return {
      id: data.driver.id,
      name: data.driver.name,
      rent: actualRent,
      daysWorked: data.daysWorked.size
    };
  });

  // Calculate income from substitute drivers (already fetched above)
  let totalSubstituteCharges = 0;
  const substitutes = weeklySubstituteDrivers.map(sub => {
    totalSubstituteCharges += sub.charge;
    return {
      id: sub.id,
      name: sub.name,
      charge: sub.charge
    };
  });

  // Total income = regular drivers + substitutes
  const totalDriverRent = totalRegularDriverRent;
  const totalIncome = totalRegularDriverRent + totalSubstituteCharges;

  // Calculate profit: Total Income - Company Rent
  const profit = totalIncome - totalRentToCompany;

  return {
    vehicleId,
    weekStart,
    weekEnd,
    totalTrips,
    rentalRate,
    totalRentToCompany,
    drivers,
    substitutes,
    totalDriverRent,
    totalSubstituteCharges,
    profit,
  };
}

export async function processWeeklySettlement(vehicleId: number, weekStartDate: Date): Promise<void> {
  const settlementData = await calculateWeeklySettlement(vehicleId, weekStartDate);
  
  if (!settlementData) {
    throw new Error(`Could not calculate settlement for vehicle ${vehicleId}`);
  }

  // Check if settlement already exists
  const existingSettlement = await storage.getWeeklySettlementByVehicleAndWeek(
    vehicleId,
    settlementData.weekStart,
    settlementData.weekEnd
  );

  // Create backward compatibility fields
  const driver1Data = settlementData.drivers.length > 0 ? 
    { id: settlementData.drivers[0].id, rent: settlementData.drivers[0].rent } : null;
  const driver2Data = settlementData.drivers.length > 1 ? 
    { id: settlementData.drivers[1].id, rent: settlementData.drivers[1].rent } : null;

  if (existingSettlement) {
    // Update existing settlement with recalculated values
    await storage.updateWeeklySettlement(existingSettlement.id, {
      totalTrips: settlementData.totalTrips,
      rentalRate: settlementData.rentalRate,
      totalRentToCompany: settlementData.totalRentToCompany,
      driver1Data,
      driver2Data,
      totalDriverRent: settlementData.totalDriverRent,
      profit: settlementData.profit,
    });
  } else {
    // Create new settlement
    await storage.createWeeklySettlement({
      vehicleId: settlementData.vehicleId,
      weekStart: settlementData.weekStart,
      weekEnd: settlementData.weekEnd,
      totalTrips: settlementData.totalTrips,
      rentalRate: settlementData.rentalRate,
      totalRentToCompany: settlementData.totalRentToCompany,
      driver1Data,
      driver2Data,
      totalDriverRent: settlementData.totalDriverRent,
      profit: settlementData.profit,
      paid: false,
    });
  }
}

export async function processAllVehicleSettlements(weekStartDate: Date): Promise<void> {
  const vehicles = await storage.getAllVehicles();
  
  for (const vehicle of vehicles) {
    try {
      await processWeeklySettlement(vehicle.id, weekStartDate);
    } catch (error) {
      console.error(`Failed to process settlement for vehicle ${vehicle.vehicleNumber}:`, error);
      // Continue processing other vehicles
    }
  }
}

export async function generateDailyRentLogs(
  driverId: number, 
  date: Date, 
  vehicleId: number,
  shift: string,
  rent?: number,
  amountCollected?: number,
  fuel?: number
): Promise<void> {
  const driver = await storage.getDriver(driverId);
  if (!driver) {
    throw new Error(`Driver with ID ${driverId} not found`);
  }

  // Normalize the date to start of day
  const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

  // Check if rent log already exists for this driver on this date and shift
  const existingRentLogs = await storage.getDriverRentLogsByDateRange(
    driverId, 
    normalizedDate, 
    nextDay
  );

  // Filter by shift
  const existingForShift = existingRentLogs.filter(log => log.shift === shift);

  // Only create rent log if one doesn't already exist for this date and shift
  if (existingForShift.length === 0) {
    const dailyRent = rent !== undefined ? rent : getDriverRent(driver.hasAccommodation);
    
    // Calculate week start and end for the date
    function getWeekStart(date: Date): Date {
      const d = new Date(date); // Create a copy to avoid modifying original
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    
    const weekStart = getWeekStart(normalizedDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    try {
      await storage.createDriverRentLog({
        driverId,
        date: normalizedDate,
        shift: shift,
        rent: dailyRent,
        amountCollected: amountCollected || 0,
        fuel: fuel || 0,
        vehicleId: vehicleId,
        weekStart: weekStart,
        weekEnd: weekEnd,
      });
    } catch (error) {
      console.error('Failed to create driver rent log:', error);
      console.error('Rent log data:', {
        driverId,
        date: normalizedDate,
        shift: shift,
        rent: dailyRent,
        amountCollected: amountCollected || 0,
        fuel: fuel || 0,
        vehicleId: vehicleId,
        weekStart: weekStart,
        weekEnd: weekEnd,
      });
      throw error;
    }
  }
}
