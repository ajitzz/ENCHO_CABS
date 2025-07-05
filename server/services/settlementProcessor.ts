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
  driver1Data: { id: number; rent: number } | null;
  driver2Data: { id: number; rent: number } | null;
  totalDriverRent: number;
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
  
  // Calculate total trips
  const totalTrips = trips.reduce((sum, trip) => sum + trip.tripCount, 0);
  
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

  // Calculate weekly rent for each driver based on days worked
  const driverDataArray = Array.from(driverRentMap.entries()).map(([driverId, data]) => {
    const dailyRent = getDriverRent(data.driver.hasAccommodation);
    const weeklyRent = dailyRent * 7; // Always calculate full week rent
    return {
      driver: data.driver,
      rent: weeklyRent
    };
  });

  // Also include substitute drivers for this vehicle and week
  const substituteDrivers = await storage.getSubstituteDriversByVehicleAndDateRange(vehicleId, weekStart, weekEnd);
  let substituteRent = 0;
  for (const substitute of substituteDrivers) {
    substituteRent += substitute.charge;
  }

  // If there are substitute drivers, add them as a separate entry
  if (substituteRent > 0) {
    driverDataArray.push({
      driver: { id: -1, name: "Substitute Drivers" },
      rent: substituteRent
    });
  }

  // Convert to the expected format
  let driver1Data = null;
  let driver2Data = null;
  let totalDriverRent = 0;

  if (driverDataArray.length > 0) {
    driver1Data = { id: driverDataArray[0].driver.id, rent: driverDataArray[0].rent };
    totalDriverRent += driverDataArray[0].rent;
  }

  if (driverDataArray.length > 1) {
    driver2Data = { id: driverDataArray[1].driver.id, rent: driverDataArray[1].rent };
    totalDriverRent += driverDataArray[1].rent;
  }

  // Add any remaining drivers' rent to the total
  for (let i = 2; i < driverDataArray.length; i++) {
    totalDriverRent += driverDataArray[i].rent;
  }

  // Calculate profit: (Total Driver Rent + Substitute Rent) - (Slab Rent × 7 days)
  const profit = totalDriverRent - totalRentToCompany;

  return {
    vehicleId,
    weekStart,
    weekEnd,
    totalTrips,
    rentalRate,
    totalRentToCompany,
    driver1Data,
    driver2Data,
    totalDriverRent,
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

  if (existingSettlement) {
    // Update existing settlement with recalculated values
    await storage.updateWeeklySettlement(existingSettlement.id, {
      totalTrips: settlementData.totalTrips,
      rentalRate: settlementData.rentalRate,
      totalRentToCompany: settlementData.totalRentToCompany,
      driver1Data: settlementData.driver1Data,
      driver2Data: settlementData.driver2Data,
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
      driver1Data: settlementData.driver1Data,
      driver2Data: settlementData.driver2Data,
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

export async function generateDailyRentLogs(driverId: number, date: Date): Promise<void> {
  const driver = await storage.getDriver(driverId);
  if (!driver) {
    throw new Error(`Driver with ID ${driverId} not found`);
  }

  // Normalize the date to start of day
  const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

  // Check if rent log already exists for this driver on this date
  const existingRentLogs = await storage.getDriverRentLogsByDateRange(
    driverId, 
    normalizedDate, 
    nextDay
  );

  // Only create rent log if one doesn't already exist for this date
  if (existingRentLogs.length === 0) {
    const dailyRent = getDriverRent(driver.hasAccommodation);
    
    await storage.createDriverRentLog({
      driverId,
      date: normalizedDate,
      rent: dailyRent,
      paid: false,
    });
  }
}
