import { Request, Response } from "express";

// Mock settlement data for testing
const mockSettlements: any[] = [];

export async function processSettlementMock(req: Request, res: Response) {
  try {
    const { vehicleId, weekStart, processedBy = "User", notes } = req.body;
    
    // Create a mock settlement
    const settlement = {
      id: Date.now(),
      vehicleId,
      vehicleNumber: `Vehicle-${vehicleId}`,
      weekStart,
      weekEnd: new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      totalTrips: Math.floor(Math.random() * 50) + 10,
      profit: Math.floor(Math.random() * 5000) + 1000,
      companyRent: Math.floor(Math.random() * 3000) + 500,
      driverRent: Math.floor(Math.random() * 4000) + 800,
      substituteRent: Math.floor(Math.random() * 500),
      totalRent: 0,
      settlementDate: new Date().toISOString(),
      status: "settled",
      processedBy,
      notes: notes || null
    };
    
    settlement.totalRent = settlement.driverRent + settlement.substituteRent;
    settlement.profit = settlement.totalRent - settlement.companyRent;
    
    mockSettlements.push(settlement);
    
    res.json({
      success: true,
      settlementId: settlement.id,
      ...settlement
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to process settlement", error: error instanceof Error ? error.message : String(error) });
  }
}

export async function getVehicleSettlementsMock(req: Request, res: Response) {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
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
      canSettle: !existingSettlement,
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