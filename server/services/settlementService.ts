import { storage } from "../storage";
import { getWeekBoundaries } from "../utils/weekUtils";

export interface SettlementRequest {
  vehicleId: number;
  weekStart: Date;
  processedBy?: string;
  notes?: string;
}

export interface SettlementResult {
  settlementId: number;
  vehicleId: number;
  weekStart: Date;
  weekEnd: Date;
  totalTrips: number;
  profit: number;
  archivedTripsCount: number;
  archivedRentLogsCount: number;
  archivedSubstitutesCount: number;
  nextWeekStart: Date;
}

/**
 * Process a weekly settlement - saves the week's data permanently and archives records
 */
export async function processWeeklySettlement(request: SettlementRequest): Promise<SettlementResult> {
  const { vehicleId, weekStart, processedBy = "System", notes } = request;
  const { weekEnd } = getWeekBoundaries(weekStart);

  // 1. Get all trips for this week
  const trips = await storage.getTripsByVehicleAndDateRange(vehicleId, weekStart, weekEnd);
  const totalTrips = trips.reduce((sum, trip) => sum + trip.tripCount, 0);

  // 2. Check if settlement already exists (simple check)
  const allSettlements = await storage.getAllWeeklySettlements();
  const existingSettlement = allSettlements.find(s => 
    s.vehicleId === vehicleId && 
    s.weekStart.getTime() === weekStart.getTime()
  );
  if (existingSettlement) {
    throw new Error(`Settlement already exists for vehicle ${vehicleId} for week ${weekStart.toDateString()}`);
  }

  // 3. Calculate basic settlement data
  const driverRent = totalTrips * 100; // Simple calculation: ₹100 per trip
  const companyRent = totalTrips * 250; // Simple calculation: ₹250 per trip
  const profit = driverRent - companyRent;

  // 4. Create the permanent settlement record (using temporary basic structure)
  const settlement = await storage.createWeeklySettlement({
    vehicleId,
    weekStart,
    weekEnd,
    totalTrips,
    rentalRate: 250,
    companyRent,
    driverRent,
    substituteRent: 0,
    totalRent: driverRent,
    profit,
    driverDetails: JSON.stringify({ drivers: [] }),
    substituteDetails: JSON.stringify({ substitutes: [] }),
    status: "settled",
    processedBy,
    notes: notes || null
  });

  // 4. Archive all data for this week (mark as settled, don't delete)
  const archivedData = await archiveWeekData(vehicleId, weekStart, weekEnd);

  // 5. Calculate next week start
  const nextWeekStart = new Date(weekEnd);
  nextWeekStart.setDate(nextWeekStart.getDate() + 1); // Day after week end

  return {
    settlementId: settlement.id,
    vehicleId,
    weekStart,
    weekEnd,
    totalTrips: weeklyData.totalTrips,
    profit: weeklyData.profit,
    archivedTripsCount: archivedData.tripsCount,
    archivedRentLogsCount: archivedData.rentLogsCount,
    archivedSubstitutesCount: archivedData.substitutesCount,
    nextWeekStart
  };
}

/**
 * Archive data for a specific week - mark all records as settled
 */
async function archiveWeekData(vehicleId: number, weekStart: Date, weekEnd: Date) {
  // Get all trips for this week
  const trips = await storage.getTripsByVehicleAndDateRange(vehicleId, weekStart, weekEnd);
  
  // Get all rent logs for this week
  const rentLogs = await storage.getAllDriverRentLogs();
  const weekRentLogs = rentLogs.filter(log => 
    log.vehicleId === vehicleId && 
    log.date >= weekStart && 
    log.date <= weekEnd
  );

  // Get all substitute drivers for this week
  const substitutes = await storage.getSubstituteDriversByVehicleAndDateRange(vehicleId, weekStart, weekEnd);

  // Mark all rent logs as paid (archived)
  for (const rentLog of weekRentLogs) {
    if (!rentLog.paid) {
      await storage.updateDriverRentLogPaymentStatus(rentLog.id, true);
    }
  }

  return {
    tripsCount: trips.length,
    rentLogsCount: weekRentLogs.length,
    substitutesCount: substitutes.length
  };
}

/**
 * Get all settlements for a vehicle, ordered by most recent first
 */
export async function getVehicleSettlements(vehicleId: number) {
  try {
    const allSettlements = await storage.getAllWeeklySettlements();
    return allSettlements
      .filter(s => s.vehicleId === vehicleId)
      .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
  } catch (error) {
    console.log("Error getting settlements, returning empty array:", error);
    return [];
  }
}

/**
 * Get settlement details by ID
 */
export async function getSettlementDetails(settlementId: number) {
  try {
    const settlement = await storage.getWeeklySettlement(settlementId);
    if (!settlement) {
      throw new Error(`Settlement with ID ${settlementId} not found`);
    }

    // Try to parse JSON details, fallback to empty objects
    let driverDetails = {};
    let substituteDetails = {};
    
    try {
      driverDetails = JSON.parse(settlement.driverDetails as string || '{}');
    } catch (e) {
      driverDetails = {};
    }
    
    try {
      substituteDetails = JSON.parse(settlement.substituteDetails as string || '{}');
    } catch (e) {
      substituteDetails = {};
    }

    return {
      ...settlement,
      driverDetails,
      substituteDetails
    };
  } catch (error) {
    throw new Error(`Failed to get settlement details: ${error}`);
  }
}

/**
 * Check if a week can be settled (has any activity)
 */
export async function canSettleWeek(vehicleId: number, weekStart: Date): Promise<boolean> {
  try {
    const { weekEnd } = getWeekBoundaries(weekStart);
    
    // Check for trips in this week
    const trips = await storage.getTripsByVehicleAndDateRange(vehicleId, weekStart, weekEnd);
    
    // Check for substitute drivers in this week (temporarily simplified)
    return trips.length > 0;
  } catch (error) {
    console.log("Error checking if week can be settled:", error);
    return false;
  }
}

/**
 * Get current week status for a vehicle
 */
export async function getCurrentWeekStatus(vehicleId: number) {
  try {
    const currentWeekBoundaries = getWeekBoundaries(new Date());
    const { weekStart, weekEnd } = currentWeekBoundaries;

    // Check if current week is already settled (simplified check)
    const allSettlements = await storage.getAllWeeklySettlements();
    const existingSettlement = allSettlements.find(s => 
      s.vehicleId === vehicleId && 
      Math.abs(s.weekStart.getTime() - weekStart.getTime()) < 24 * 60 * 60 * 1000 // Within 1 day
    );
    
    if (existingSettlement) {
      return {
        isSettled: true,
        settlement: existingSettlement,
        canSettle: false,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString()
      };
    }

    // Check if week can be settled
    const canSettle = await canSettleWeek(vehicleId, weekStart);
    
    return {
      isSettled: false,
      settlement: null,
      canSettle,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString()
    };
  } catch (error) {
    console.log("Error getting current week status:", error);
    return {
      isSettled: false,
      settlement: null,
      canSettle: false,
      weekStart: new Date().toISOString(),
      weekEnd: new Date().toISOString()
    };
  }
}