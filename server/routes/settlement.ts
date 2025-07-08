import { Request, Response } from "express";
import { z } from "zod";
import { processWeeklySettlement, getVehicleSettlements, getSettlementDetails, getCurrentWeekStatus } from "../services/settlementService";

// Settlement request schema
const settlementRequestSchema = z.object({
  vehicleId: z.number(),
  weekStart: z.string().transform(str => new Date(str)),
  processedBy: z.string().optional(),
  notes: z.string().optional()
});

// Process weekly settlement
export async function processSettlement(req: Request, res: Response) {
  try {
    const settlementRequest = settlementRequestSchema.parse(req.body);
    const result = await processWeeklySettlement(settlementRequest);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to process settlement", error: error.message });
  }
}

// Get all settlements for a vehicle
export async function getVehicleSettlementsRoute(req: Request, res: Response) {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    if (isNaN(vehicleId)) {
      return res.status(400).json({ message: "Invalid vehicle ID" });
    }
    
    const settlements = await getVehicleSettlements(vehicleId);
    res.json(settlements);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch settlements", error: error.message });
  }
}

// Get settlement details
export async function getSettlementDetailsRoute(req: Request, res: Response) {
  try {
    const settlementId = parseInt(req.params.settlementId);
    if (isNaN(settlementId)) {
      return res.status(400).json({ message: "Invalid settlement ID" });
    }
    
    const settlement = await getSettlementDetails(settlementId);
    res.json(settlement);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch settlement details", error: error.message });
  }
}

// Get current week status for a vehicle
export async function getCurrentWeekStatusRoute(req: Request, res: Response) {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    if (isNaN(vehicleId)) {
      return res.status(400).json({ message: "Invalid vehicle ID" });
    }
    
    const status = await getCurrentWeekStatus(vehicleId);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch week status", error: error.message });
  }
}