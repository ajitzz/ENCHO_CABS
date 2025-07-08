import { Request, Response } from "express";
import { storage } from "../storage";

// Mock settlement data for testing
const mockSettlements: any[] = [];

// Helper function to get week boundaries
function getWeekBoundaries(date: Date) {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { weekStart, weekEnd };
}

export async function processSettlementMock(req: Request, res: Response) {
  try {
    const { vehicleId, weekStart, processedBy = "User", notes } = req.body;
    
    if (!vehicleId || !weekStart) {
      return res.status(400).json({ message: "Vehicle ID and week start date are required" });
    }
    
    const weekStartDate = new Date(weekStart);
    const { weekEnd } = getWeekBoundaries(weekStartDate);
    
    // Get actual vehicle data
    const vehicle = await storage.getVehicle(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    
    // Get trips for the week
    const trips = await storage.getTripsByVehicleAndDateRange(vehicleId, weekStartDate, weekEnd);
    const totalTrips = trips.reduce((sum, trip) => sum + trip.tripCount, 0);
    
    // Get driver rent logs for the week
    const driverRentLogs = await storage.getAllDriverRentLogs();
    const weeklyDriverRents = driverRentLogs.filter(log => {
      const logDate = new Date(log.date);
      return log.vehicleId === vehicleId && 
             logDate >= weekStartDate && 
             logDate <= weekEnd;
    });
    const totalDriverRent = weeklyDriverRents.reduce((sum, log) => sum + log.rent, 0);
    
    // Get substitute driver charges for the week
    const substituteDrivers = await storage.getSubstituteDriversByVehicleAndDateRange(vehicleId, weekStartDate, weekEnd);
    const totalSubstituteRent = substituteDrivers.reduce((sum, sub) => sum + sub.charge, 0);
    
    // Calculate company rent based on trip count and company type
    const { getRentalRate } = await import("../services/rentalCalculator");
    const rentalRate = getRentalRate(vehicle.company as "PMV" | "Letzryd", totalTrips);
    const companyRent = rentalRate * 7; // Weekly rent
    
    // Create settlement record
    const settlement = {
      id: Date.now(),
      vehicleId,
      vehicleNumber: vehicle.vehicleNumber,
      weekStart: weekStartDate.toISOString(),
      weekEnd: weekEnd.toISOString(),
      totalTrips,
      rentalRate,
      companyRent,
      driverRent: totalDriverRent,
      substituteRent: totalSubstituteRent,
      totalRent: totalDriverRent + totalSubstituteRent,
      profit: (totalDriverRent + totalSubstituteRent) - companyRent,
      settlementDate: new Date().toISOString(),
      status: "settled",
      processedBy,
      notes: notes || null,
      driverDetails: weeklyDriverRents.map(log => ({
        driverId: log.driverId,
        driverName: log.driverName,
        rent: log.rent,
        date: log.date
      })),
      substituteDetails: substituteDrivers.map(sub => ({
        name: sub.name,
        charge: sub.charge,
        date: sub.date,
        shift: sub.shift
      }))
    };
    
    mockSettlements.push(settlement);
    
    res.json({
      success: true,
      message: "Weekly settlement processed successfully",
      settlementId: settlement.id,
      settlement
    });
  } catch (error) {
    console.error("Settlement processing error:", error);
    res.status(500).json({ message: "Failed to process settlement", error: error instanceof Error ? error.message : String(error) });
  }
}

export async function getVehicleSettlementsMock(req: Request, res: Response) {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    if (isNaN(vehicleId)) {
      return res.status(400).json({ message: "Invalid vehicle ID" });
    }
    
    const settlements = mockSettlements
      .filter(s => s.vehicleId === vehicleId)
      .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
    
    res.json(settlements);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch settlements", error: error instanceof Error ? error.message : String(error) });
  }
}

export async function getCurrentWeekStatusMock(req: Request, res: Response) {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    if (isNaN(vehicleId)) {
      return res.status(400).json({ message: "Invalid vehicle ID" });
    }
    
    // Get current week boundaries (Sunday to Saturday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Check if current week is already settled
    const existingSettlement = mockSettlements.find(s => 
      s.vehicleId === vehicleId && 
      Math.abs(new Date(s.weekStart).getTime() - weekStart.getTime()) < 24 * 60 * 60 * 1000
    );
    
    res.json({
      isSettled: !!existingSettlement,
      settlement: existingSettlement || null,
      canSettle: !existingSettlement, // Always allow settlement for demo purposes
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get week status", error: error instanceof Error ? error.message : String(error) });
  }
}

export async function getAllSettlementsMock(req: Request, res: Response) {
  try {
    const allSettlements = mockSettlements.sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
    res.json(allSettlements);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch settlements", error: error instanceof Error ? error.message : String(error) });
  }
}