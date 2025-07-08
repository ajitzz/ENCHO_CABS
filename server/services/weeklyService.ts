import { storage } from "../storage";
import { getRentalRate, getDriverRent, getSubstituteDriverCharge } from "./rentalCalculator";
import { getWeekBoundaries } from "../utils/weekUtils";
import { startOfWeek, endOfWeek } from "date-fns";

export interface WeeklyData {
  vehicleId: number;
  weekStart: Date;
  weekEnd: Date;
  totalTrips: number;
  rentalRate: number;
  companyRent: number; // rentalRate * 7 days
  driverRent: number;
  substituteRent: number;
  totalRent: number; // driverRent + substituteRent
  profit: number; // totalRent - companyRent
  drivers: Array<{
    id: number;
    name: string;
    daysWorked: number;
    dailyRent: number;
    totalRent: number;
    paid: boolean;
  }>;
  substitutes: Array<{
    id: number;
    name: string;
    shiftHours: number;
    charge: number;
    tripCount: number;
  }>;
}

export interface WeeklySummary {
  currentWeek: WeeklyData;
  availableWeeks: Array<{
    weekStart: Date;
    weekEnd: Date;
    label: string; // e.g., "Jun 29 - Jul 5, 2025"
  }>;
}

/**
 * Calculate weekly data for a specific vehicle and week
 */
export async function calculateWeeklyData(vehicleId: number, weekStartDate: Date): Promise<WeeklyData> {
  const vehicle = await storage.getVehicle(vehicleId);
  if (!vehicle) {
    throw new Error(`Vehicle with ID ${vehicleId} not found`);
  }

  const { weekStart, weekEnd } = getWeekBoundaries(weekStartDate);

  // Get trips for this week
  const trips = await storage.getTripsByVehicleAndDateRange(vehicleId, weekStart, weekEnd);
  const regularTrips = trips.reduce((sum, trip) => sum + trip.tripCount, 0);

  // Get substitute drivers for this week
  const substitutes = await storage.getSubstituteDriversByVehicleAndDateRange(vehicleId, weekStart, weekEnd);
  const substituteTrips = substitutes.reduce((sum, sub) => sum + (sub.tripCount || 1), 0);
  
  const totalTrips = regularTrips + substituteTrips;

  // Calculate rental rate and company rent
  const rentalRate = getRentalRate(vehicle.company as "PMV" | "Letzryd", totalTrips);
  const companyRent = rentalRate * 7; // 7 days per week

  // Calculate driver rent (group by driver and count unique days worked)
  const driverWorkMap = new Map<number, Set<string>>();
  
  for (const trip of trips) {
    const dateKey = trip.tripDate.toISOString().split('T')[0];
    if (!driverWorkMap.has(trip.driverId)) {
      driverWorkMap.set(trip.driverId, new Set());
    }
    driverWorkMap.get(trip.driverId)!.add(dateKey);
  }

  const drivers = [];
  let totalDriverRent = 0;

  for (const [driverId, workDays] of driverWorkMap) {
    const driver = await storage.getDriver(driverId);
    if (driver) {
      const daysWorked = workDays.size;
      const dailyRent = getDriverRent(driver.hasAccommodation);
      const driverTotalRent = dailyRent * daysWorked;
      
      // Check if rent is paid for this week
      const rentLogs = await storage.getDriverRentLogsByDateRange(driverId, weekStart, weekEnd);
      const paid = rentLogs.length > 0 && rentLogs.every(log => log.paid);

      drivers.push({
        id: driver.id,
        name: driver.name,
        daysWorked,
        dailyRent,
        totalRent: driverTotalRent,
        paid
      });

      totalDriverRent += driverTotalRent;
    }
  }

  // Calculate substitute rent
  const substituteData = substitutes.map(sub => ({
    id: sub.id,
    name: sub.name,
    shiftHours: sub.shiftHours,
    charge: sub.charge,
    tripCount: sub.tripCount || 1
  }));

  const totalSubstituteRent = substitutes.reduce((sum, sub) => sum + sub.charge, 0);
  const totalRent = totalDriverRent + totalSubstituteRent;
  const profit = totalRent - companyRent;

  return {
    vehicleId,
    weekStart,
    weekEnd,
    totalTrips,
    rentalRate,
    companyRent,
    driverRent: totalDriverRent,
    substituteRent: totalSubstituteRent,
    totalRent,
    profit,
    drivers,
    substitutes: substituteData
  };
}

/**
 * Get available weeks with data for a vehicle
 */
export async function getAvailableWeeksForVehicle(vehicleId: number): Promise<Array<{weekStart: Date; weekEnd: Date; label: string}>> {
  // Get all unique weeks from trips and substitute drivers
  const trips = await storage.getTripsByVehicleAndDateRange(vehicleId, new Date('2020-01-01'), new Date('2030-12-31'));
  const substitutes = await storage.getSubstituteDriversByVehicleAndDateRange(vehicleId, new Date('2020-01-01'), new Date('2030-12-31'));

  const weekSet = new Set<string>();
  
  // Add weeks from trips
  trips.forEach(trip => {
    const { weekStart } = getWeekBoundaries(trip.tripDate);
    weekSet.add(weekStart.toISOString().split('T')[0]);
  });

  // Add weeks from substitutes
  substitutes.forEach(sub => {
    const { weekStart } = getWeekBoundaries(sub.date);
    weekSet.add(weekStart.toISOString().split('T')[0]);
  });

  // Convert to array and sort (newest first)
  const weeks = Array.from(weekSet)
    .map(dateStr => {
      const weekStart = new Date(dateStr);
      const { weekEnd } = getWeekBoundaries(weekStart);
      return {
        weekStart,
        weekEnd,
        label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      };
    })
    .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());

  return weeks;
}

/**
 * Get weekly summary for a vehicle (current week + available weeks)
 */
export async function getWeeklySummary(vehicleId: number, selectedWeekStart?: Date): Promise<WeeklySummary> {
  const currentWeekStart = selectedWeekStart || getWeekBoundaries(new Date()).weekStart;
  const currentWeek = await calculateWeeklyData(vehicleId, currentWeekStart);
  const availableWeeks = await getAvailableWeeksForVehicle(vehicleId);

  return {
    currentWeek,
    availableWeeks
  };
}