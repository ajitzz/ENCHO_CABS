import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertVehicleSchema, updateVehicleSchema, insertDriverSchema, updateDriverSchema, insertVehicleDriverAssignmentSchema,
  insertDriverRentLogSchema, insertSubstituteDriverSchema,
  upsertWeeklySummarySchema, insertInvestmentSchema, updateInvestmentSchema,
  insertInvestmentReturnSchema, updateInvestmentReturnSchema
} from "@shared/schema";
import { getRentalInfo, getAllSlabs, getDriverRent, getRentalRate } from "./services/rentalCalculator";
import { calculateWeeklySettlement, processWeeklySettlement, processAllVehicleSettlements, generateDailyRentLogs } from "./services/settlementProcessor";
import { resetAllSequences, checkSequenceSync } from "./utils/resetSequences";
import { bus, broadcast } from "./eventBus";

// Validation schemas
const vehicleIdSchema = z.object({
  id: z.string().transform(Number),
});


const weeklySettlementSchema = z.object({
  vehicleId: z.number(),
  weekStartDate: z.string().transform(str => new Date(str)),
});

// Utility function to get week start (Monday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  return new Date(d.setDate(diff));
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Server-Sent Events for real-time updates
  app.get("/api/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const listener = (e: { type: string; payload?: any }) => {
      res.write(`event: ${e.type}\n`);
      res.write(`data: ${JSON.stringify(e.payload ?? {})}\n\n`);
    };

    bus.on("event", listener);

    req.on("close", () => {
      bus.off("event", listener);
    });
  });

  // Vehicle routes
  app.get("/api/vehicles", async (req, res) => {
    try {
      const vehicles = await storage.getAllVehicles();
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vehicles", error: error.message });
    }
  });

  app.post("/api/vehicles", async (req, res) => {
    try {
      console.log("Creating vehicle with data:", req.body);
      const vehicleData = insertVehicleSchema.parse(req.body);
      console.log("Parsed vehicle data:", vehicleData);
      
      // Check QR code uniqueness if provided
      if (vehicleData.qrCode && vehicleData.qrCode.trim()) {
        const qrCheck = await storage.checkQrCodeExists(vehicleData.qrCode);
        if (qrCheck.exists) {
          return res.status(400).json({ 
            message: "QR Code already exists", 
            error: `This QR code is already assigned to ${qrCheck.type} "${qrCheck.name}". Please use a different QR code.`
          });
        }
      }
      
      const vehicle = await storage.createVehicle(vehicleData);
      res.status(201).json(vehicle);
    } catch (error) {
      console.error("Vehicle creation error:", error);
      res.status(400).json({ message: "Invalid vehicle data", error: error.message });
    }
  });

  app.put("/api/vehicles/:id", async (req, res) => {
    try {
      const { id } = vehicleIdSchema.parse(req.params);
      const vehicleData = updateVehicleSchema.parse(req.body);
      
      // Check QR code uniqueness if provided (excluding current vehicle)
      if (vehicleData.qrCode && vehicleData.qrCode.trim()) {
        const qrCheck = await storage.checkQrCodeExists(vehicleData.qrCode, id);
        if (qrCheck.exists) {
          return res.status(400).json({ 
            message: "QR Code already exists", 
            error: `This QR code is already assigned to ${qrCheck.type} "${qrCheck.name}". Please use a different QR code.`
          });
        }
      }
      
      const vehicle = await storage.updateVehicle(id, vehicleData);
      res.json(vehicle);
    } catch (error) {
      res.status(400).json({ message: "Failed to update vehicle", error: error.message });
    }
  });

  app.delete("/api/vehicles/:id", async (req, res) => {
    try {
      const { id } = vehicleIdSchema.parse(req.params);
      await storage.deleteVehicle(id);
      res.json({ message: "Vehicle deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete vehicle", error: error.message });
    }
  });

  app.get("/api/vehicles/:id", async (req, res) => {
    try {
      const { id } = vehicleIdSchema.parse(req.params);
      const vehicle = await storage.getVehicle(id);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error) {
      res.status(400).json({ message: "Invalid vehicle ID", error: error.message });
    }
  });

  // Driver routes
  app.get("/api/drivers", async (req, res) => {
    try {
      const drivers = await storage.getAllDrivers();
      res.json(drivers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch drivers", error: error.message });
    }
  });

  app.post("/api/drivers", async (req, res) => {
    try {
      const driverData = insertDriverSchema.parse(req.body);
      
      // Check QR code uniqueness if provided
      if (driverData.qrCode && driverData.qrCode.trim()) {
        const qrCheck = await storage.checkQrCodeExists(driverData.qrCode);
        if (qrCheck.exists) {
          return res.status(400).json({ 
            message: "QR Code already exists", 
            error: `This QR code is already assigned to ${qrCheck.type} "${qrCheck.name}". Please use a different QR code.`
          });
        }
      }
      
      const driver = await storage.createDriver(driverData);
      res.status(201).json(driver);
    } catch (error) {
      console.error("Driver creation error:", error);
      
      // Handle specific database errors
      if (error.message.includes("duplicate key value violates unique constraint")) {
        if (error.message.includes("drivers_pkey")) {
          console.log("Attempting to auto-fix sequence issue...");
          try {
            await resetAllSequences();
            console.log("Sequences reset successfully. Retrying driver creation...");
            const driver = await storage.createDriver(driverData);
            return res.status(201).json(driver);
          } catch (resetError) {
            console.error("Failed to reset sequences:", resetError);
            return res.status(500).json({ 
              message: "Database error", 
              error: "Failed to auto-repair database. Please contact administrator." 
            });
          }
        }
        return res.status(400).json({ 
          message: "Duplicate driver", 
          error: "A driver with this information already exists." 
        });
      }
      
      res.status(400).json({ message: "Invalid driver data", error: error.message });
    }
  });

  app.put("/api/drivers/:id", async (req, res) => {
    try {
      const { id } = vehicleIdSchema.parse(req.params);
      const driverData = updateDriverSchema.parse(req.body);
      
      // Check QR code uniqueness if provided (excluding current driver)
      if (driverData.qrCode && driverData.qrCode.trim()) {
        const qrCheck = await storage.checkQrCodeExists(driverData.qrCode, undefined, id);
        if (qrCheck.exists) {
          return res.status(400).json({ 
            message: "QR Code already exists", 
            error: `This QR code is already assigned to ${qrCheck.type} "${qrCheck.name}". Please use a different QR code.`
          });
        }
      }
      
      const driver = await storage.updateDriver(id, driverData);
      res.json(driver);
    } catch (error) {
      res.status(400).json({ message: "Failed to update driver", error: error.message });
    }
  });

  app.delete("/api/drivers/:id", async (req, res) => {
    try {
      const { id } = vehicleIdSchema.parse(req.params);
      await storage.deleteDriver(id);
      res.json({ message: "Driver deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete driver", error: error.message });
    }
  });

  // Vehicle-Driver assignment routes
  app.post("/api/vehicle-assignments", async (req, res) => {
    try {
      const assignmentData = insertVehicleDriverAssignmentSchema.parse(req.body);
      const assignment = await storage.createVehicleDriverAssignment(assignmentData);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(400).json({ message: "Invalid assignment data", error: error.message });
    }
  });

  app.get("/api/vehicles/:id/assignment", async (req, res) => {
    try {
      const { id } = vehicleIdSchema.parse(req.params);
      const assignment = await storage.getVehicleDriverAssignment(id);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      res.status(400).json({ message: "Invalid vehicle ID", error: error.message });
    }
  });

  // Driver rent log routes
  app.post("/api/driver-rent-logs", async (req, res) => {
    try {
      // Convert date strings to Date objects before validation
      const body = {
        ...req.body,
        date: new Date(req.body.date),
        weekStart: new Date(req.body.weekStart),
        weekEnd: new Date(req.body.weekEnd)
      };
      const rentLogData = insertDriverRentLogSchema.parse(body);
      const rentLog = await storage.createDriverRentLog(rentLogData);
      res.status(201).json(rentLog);
    } catch (error) {
      console.error("Driver rent log creation error:", error);
      console.error("Request body:", req.body);
      res.status(400).json({ message: "Invalid rent log data", error: error.message });
    }
  });

  app.put("/api/driver-rent-logs/:id", async (req, res) => {
    try {
      const { id } = vehicleIdSchema.parse(req.params);
      const body = {
        ...req.body,
      };
      if (req.body.date) {
        body.date = new Date(req.body.date);
      }
      if (req.body.weekStart) {
        body.weekStart = new Date(req.body.weekStart);
      }
      if (req.body.weekEnd) {
        body.weekEnd = new Date(req.body.weekEnd);
      }
      const rentLog = await storage.updateDriverRentLog(id, body);
      res.json(rentLog);
    } catch (error) {
      console.error("Driver rent log update error:", error);
      res.status(400).json({ message: "Failed to update rent log", error: error.message });
    }
  });



  app.get("/api/driver-rent-logs", async (req, res) => {
    try {
      const allRentLogs = await storage.getAllDriverRentLogs();
      res.json(allRentLogs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch all driver rent logs", error: error.message });
    }
  });

  // Alternative endpoint path for all rent logs
  app.get("/api/driver-rent-logs/all", async (req, res) => {
    try {
      const allRentLogs = await storage.getAllDriverRentLogs();
      res.json(allRentLogs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch all driver rent logs", error: error.message });
    }
  });

  // Recent rent logs endpoint
  app.get("/api/driver-rent-logs/recent/:limit", async (req, res) => {
    try {
      const limit = parseInt(req.params.limit) || 10;
      const rentLogs = await storage.getRecentRentLogs(limit);
      res.json(rentLogs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch recent rent logs", error: error.message });
    }
  });

  // Vehicle weekly summary route
  app.get("/api/vehicles/:id/weekly-summary", async (req, res) => {
    try {
      const { id } = vehicleIdSchema.parse(req.params);
      
      const vehicle = await storage.getVehicle(id);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      // Get weekly settlement data for profit calculation (current week)
      const weekStartDate = req.query.weekStart ? new Date(req.query.weekStart as string) : new Date();
      const weekStart = new Date(weekStartDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Get Monday of current week
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // Get Sunday of current week
      
      // Get all rent logs and filter for this vehicle and week
      const allRentLogs = await storage.getAllDriverRentLogs();
      const weeklyRentLogs = allRentLogs.filter(log => {
        const logDate = new Date(log.date);
        return log.vehicleId === id && logDate >= weekStart && logDate <= weekEnd;
      });
      
      // Get substitute drivers for this specific vehicle in this week
      const weeklySubstituteDrivers = await storage.getSubstituteDriversByVehicleAndDateRange(id, weekStart, weekEnd);
      
      // Calculate total trips from rent logs + substitute driver trips (current week only)
      const regularTrips = weeklyRentLogs.length;
      const substituteTrips = weeklySubstituteDrivers.reduce((sum, sub) => sum + (sub.tripCount || 1), 0);
      const totalTrips = regularTrips + substituteTrips;

      
      // Calculate total driver rent for this vehicle from rent logs
      const totalActualDriverRent = weeklyRentLogs.reduce((sum, log) => sum + log.rent, 0);
      
      // Calculate total substitute charges for this vehicle
      const totalSubstituteCharges = weeklySubstituteDrivers.reduce((sum, sub) => sum + sub.charge, 0);
      
      // Calculate total income for this vehicle = driver rent + substitute charges
      const totalIncome = totalActualDriverRent + totalSubstituteCharges;
      
      // Calculate company rent based on total trips
      const rentalRate = getRentalRate(vehicle.company as "PMV" | "Letzryd", totalTrips);
      const totalRentToCompany = rentalRate * 7; // Weekly rent
      
      // Calculate actual profit: Total Income - Company Rent
      const actualProfit = totalIncome - totalRentToCompany;
      
      // Use total trips for rental info calculation
      const rentalInfo = getRentalInfo(vehicle.company as "PMV" | "Letzryd", totalTrips);
      const assignment = await storage.getVehicleDriverAssignment(id);
      
      let morningDriver = null;
      let eveningDriver = null;
      
      if (assignment?.morningDriverId) {
        morningDriver = await storage.getDriver(assignment.morningDriverId);
      }
      
      if (assignment?.eveningDriverId) {
        eveningDriver = await storage.getDriver(assignment.eveningDriverId);
      }

      const summary = {
        vehicle,
        totalTrips, // Current week trips only
        rentalRate: rentalRate,
        totalRentToCompany: totalRentToCompany,
        totalDriverRent: totalActualDriverRent,
        totalSubstituteCharges: totalSubstituteCharges,
        totalIncome: totalIncome,
        profit: actualProfit, // Use actual profit based on real rent logs
        rentalInfo,
        morningDriver,
        eveningDriver,
        weekStart: weekStart,
        weekEnd: weekEnd,
      };

      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vehicle summary", error: error.message });
    }
  });

  // Rental slab information route
  app.get("/api/rental-slabs/:company", async (req, res) => {
    try {
      const company = req.params.company as "PMV" | "Letzryd";
      if (company !== "PMV" && company !== "Letzryd") {
        return res.status(400).json({ message: "Invalid company. Must be PMV or Letzryd" });
      }
      
      const slabs = getAllSlabs(company);
      res.json(slabs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rental slabs", error: error.message });
    }
  });

  // Weekly settlement routes
  app.get("/api/settlements", async (req, res) => {
    try {
      const items = await storage.listWeeklySettlements();
      res.json({ items });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settlements", error: error.message });
    }
  });

  app.post("/api/settlements", async (req, res) => {
    try {
      const { weekStart, weekEnd, companyRent, companyWallet } = req.body;
      if (!weekStart || !weekEnd) {
        return res.status(400).json({ error: "weekStart and weekEnd required" });
      }
      await storage.upsertWeeklySettlement({
        weekStart,
        weekEnd,
        companyRent: companyRent ?? null,
        companyWallet: companyWallet ?? null,
      });
      const items = await storage.listWeeklySettlements();
      res.json({ ok: true, items });
      broadcast("settlements:changed", { weekStart, weekEnd });
    } catch (error) {
      res.status(500).json({ message: "Failed to save settlement", error: error.message });
    }
  });

  app.delete("/api/settlements", async (req, res) => {
    try {
      const { weekStart, weekEnd } = req.query as { weekStart?: string; weekEnd?: string };
      if (!weekStart || !weekEnd) {
        return res.status(400).json({ error: "weekStart and weekEnd required" });
      }
      await storage.deleteWeeklySettlement(weekStart, weekEnd);
      const items = await storage.listWeeklySettlements();
      res.json({ ok: true, items });
      broadcast("settlements:changed", { weekStart, weekEnd });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete settlement", error: error.message });
    }
  });

  // QR Code validation endpoint
  app.get("/api/validate-qr-code", async (req, res) => {
    try {
      const { qrCode, excludeVehicleId, excludeDriverId } = req.query;
      
      if (!qrCode || typeof qrCode !== 'string') {
        return res.status(400).json({ message: "QR code is required" });
      }
      
      const result = await storage.checkQrCodeExists(
        qrCode, 
        excludeVehicleId ? Number(excludeVehicleId) : undefined,
        excludeDriverId ? Number(excludeDriverId) : undefined
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to validate QR code", error: error.message });
    }
  });

  // Dashboard profit graph data
  app.get("/api/dashboard/profit-graph", async (req, res) => {
    try {
      const settlements = await storage.listWeeklySettlements();
      
      // Map to the format expected by the dashboard
      const profitData = settlements.map((settlement) => {
        return {
          weekStart: settlement.weekStart,
          weekEnd: settlement.weekEnd,
          profit: settlement.profit,
          rent: settlement.rent,
          wallet: settlement.wallet,
          companyRent: settlement.companyRent,
          companyWallet: settlement.companyWallet,
          roomRent: settlement.roomRent,
        };
      });

      res.json(profitData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profit graph data", error: error.message });
    }
  });

  // Substitute driver routes
  app.post("/api/substitute-drivers", async (req, res) => {
    try {
      const substituteData = insertSubstituteDriverSchema.parse(req.body);
      const substitute = await storage.createSubstituteDriver(substituteData);
      
      res.status(201).json(substitute);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid substitute driver data", error: error.message });
    }
  });

  app.post("/api/substitute-drivers", async (req, res) => {
    try {
      const { name, vehicleId, date, shift, shiftHours, charge, tripCount } = req.body;
      
      const substituteData = {
        name,
        vehicleId: parseInt(vehicleId),
        date: new Date(date),
        shift,
        shiftHours: parseInt(shiftHours),
        tripCount: tripCount || 1,
        charge: parseInt(charge)
      };
      
      const newSubstitute = await storage.createSubstituteDriver(substituteData);
      res.status(201).json(newSubstitute);
    } catch (error) {
      res.status(500).json({ message: "Failed to create substitute driver", error: error.message });
    }
  });

  app.get("/api/substitute-drivers", async (req, res) => {
    try {
      const { vehicleId, weekStart, weekEnd } = req.query;
      
      let substitutes;
      if (vehicleId) {
        const vehicleIdNum = parseInt(vehicleId as string);
        const startDate = weekStart ? new Date(weekStart as string) : undefined;
        const endDate = weekEnd ? new Date(weekEnd as string) : undefined;
        
        if (startDate && endDate) {
          substitutes = await storage.getSubstituteDriversByVehicleAndDateRange(vehicleIdNum, startDate, endDate);
        } else {
          substitutes = await storage.getSubstituteDriversByVehicle(vehicleIdNum);
        }
      } else {
        substitutes = await storage.getAllSubstituteDrivers();
      }
      
      res.json(substitutes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch substitute drivers", error: error.message });
    }
  });

  // Create substitute driver
  app.post("/api/substitute-drivers", async (req, res) => {
    try {
      const substituteData = insertSubstituteDriverSchema.parse(req.body);
      const substitute = await storage.createSubstituteDriver(substituteData);
      res.status(201).json(substitute);
    } catch (error) {
      res.status(400).json({ message: "Failed to create substitute driver", error: error.message });
    }
  });

  // Delete substitute driver
  app.delete("/api/substitute-drivers/:id", async (req, res) => {
    try {
      const { id } = vehicleIdSchema.parse(req.params);
      const substitute = await storage.getSubstituteDriver(id);
      
      if (!substitute) {
        return res.status(404).json({ message: "Substitute driver not found" });
      }
      
      await storage.deleteSubstituteDriver(id);
      res.json({ message: "Substitute driver deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete substitute driver", error: error.message });
    }
  });

  // Weekly Summary routes
  app.get("/api/weekly-summary/aggregates", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }

      const aggregates = await storage.getDriverAggregatesForDateRange(
        String(startDate),
        String(endDate)
      );

      // Fetch saved summaries for each driver (may span multiple weeks)
      const results = await Promise.all(
        aggregates.map(async (aggregate) => {
          // Get all weekly summaries that overlap with the selected date range
          const overlappingSummaries = await storage.getWeeklySummariesOverlappingRange(
            aggregate.driverId,
            String(startDate),
            String(endDate)
          );

          // Sum up values from all overlapping weeks
          const totals = overlappingSummaries.reduce(
            (acc, summary) => ({
              totalEarnings: acc.totalEarnings + (summary.totalEarnings || 0),
              cash: acc.cash + (summary.cash || 0),
              refund: acc.refund + (summary.refund || 0),
              expenses: acc.expenses + (summary.expenses || 0),
              dues: acc.dues + (summary.dues || 0),
              payout: acc.payout + (summary.payout || 0),
            }),
            { totalEarnings: 0, cash: 0, refund: 0, expenses: 0, dues: 0, payout: 0 }
          );

          return {
            driverId: aggregate.driverId,
            driverName: aggregate.driverName,
            rent: aggregate.totalRent,
            collection: aggregate.totalCollection,
            fuel: aggregate.totalFuel,
            trips: aggregate.tripCount,
            totalEarnings: totals.totalEarnings,
            cash: totals.cash,
            refund: totals.refund,
            expenses: totals.expenses,
            dues: totals.dues,
            payout: totals.payout,
          };
        })
      );

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch driver aggregates", error: error.message });
    }
  });

  app.post("/api/weekly-summary", async (req, res) => {
    try {
      const summaryData = upsertWeeklySummarySchema.parse(req.body);
      
      // First, clear any overlapping summaries to avoid duplicates with different date ranges
      await storage.clearWeeklySummary(
        summaryData.driverId,
        summaryData.startDate,
        summaryData.endDate
      );
      
      // Then insert the new summary
      const summary = await storage.upsertWeeklySummary(summaryData);
      res.json(summary);
      broadcast("weeklysummary:changed", { range: { start: summaryData.startDate, end: summaryData.endDate } });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to save weekly summary", error: error.message });
    }
  });

  app.delete("/api/weekly-summary", async (req, res) => {
    try {
      const { driverId, startDate, endDate } = req.query;
      
      if (!driverId || !startDate || !endDate) {
        return res.status(400).json({ message: "driverId, startDate, and endDate are required" });
      }

      await storage.clearWeeklySummary(
        Number(driverId),
        String(startDate),
        String(endDate)
      );

      res.json({ message: "Weekly summary cleared successfully" });
      broadcast("weeklysummary:changed", { range: { start: startDate, end: endDate } });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to clear weekly summary", error: error.message });
    }
  });

  app.post("/api/import/weekly-summary", async (req, res) => {
    try {
      const { csvData, confirmOverwrite } = req.body;

      if (!csvData || !Array.isArray(csvData)) {
        return res.status(400).json({ message: "csvData array is required" });
      }

      // Helper function to get Monday of the week for a given date
      const getMondayOfWeek = (date: Date): Date => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
      };

      // Helper function to get Sunday of the week for a given date
      const getSundayOfWeek = (date: Date): Date => {
        const monday = getMondayOfWeek(date);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        return sunday;
      };

      const results = {
        success: 0,
        skipped: 0,
        errors: [] as string[],
        driversNotFound: [] as string[],
      };

      // Track existing data for duplicate detection
      const existingData: Array<{ driverName: string; weekStart: string; weekEnd: string }> = [];

      // Group rows by week and driver
      const weeklyData = new Map<string, Map<number, any>>();

      // Process each CSV row
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        
        try {
          // Validate Date field
          if (!row.Date || typeof row.Date !== 'string' || !row.Date.trim()) {
            results.errors.push(`Row ${i + 2}: Missing or invalid Date`);
            continue;
          }

          // Parse date (supports DD/MM/YYYY and other formats)
          const dateParts = row.Date.trim().split('/');
          let rowDate: Date;
          if (dateParts.length === 3) {
            // DD/MM/YYYY format
            rowDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
          } else {
            rowDate = new Date(row.Date.trim());
          }

          if (isNaN(rowDate.getTime())) {
            results.errors.push(`Row ${i + 2}: Invalid date format`);
            continue;
          }

          // Calculate week range
          const weekStart = getMondayOfWeek(rowDate);
          const weekEnd = getSundayOfWeek(rowDate);
          const weekKey = `${weekStart.toISOString().split('T')[0]}_${weekEnd.toISOString().split('T')[0]}`;

          // Validate required fields
          if (!row.Driver || typeof row.Driver !== 'string' || !row.Driver.trim()) {
            results.errors.push(`Row ${i + 2}: Missing or invalid driver name`);
            continue;
          }

          const driverName = row.Driver.trim();

          // Parse numeric fields (handle case variations)
          const trips = row.Trips || row.trips ? parseInt(String(row.Trips || row.trips)) : 0;
          const totalEarnings = row['Total earnings'] || row['Total Earnings'] || row['total earnings'] ? 
            Math.round(parseFloat(String(row['Total earnings'] || row['Total Earnings'] || row['total earnings']))) : 0;
          const cash = row['Cash collected'] || row['Cash Collected'] || row['cash collected'] ? 
            Math.round(Math.abs(parseFloat(String(row['Cash collected'] || row['Cash Collected'] || row['cash collected'])))) : 0;
          const refund = row.Refunds || row.Refund || row.refunds || row.refund ? 
            Math.round(parseFloat(String(row.Refunds || row.Refund || row.refunds || row.refund))) : 0;

          // Validate parsed numbers
          if (isNaN(trips) || isNaN(totalEarnings) || isNaN(cash) || isNaN(refund)) {
            results.errors.push(`Row ${i + 2}: Invalid numeric values for ${driverName}`);
            continue;
          }

          // Store data grouped by week
          if (!weeklyData.has(weekKey)) {
            weeklyData.set(weekKey, new Map());
          }

          weeklyData.get(weekKey)!.set(driverName.toUpperCase(), {
            driverName,
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            trips,
            totalEarnings,
            cash,
            refund,
          });
        } catch (error: any) {
          results.errors.push(`Row ${i + 2}: ${error.message}`);
        }
      }

      // Now process each week's data
      for (const [weekKey, driversMap] of weeklyData.entries()) {
        const firstDriver = driversMap.values().next().value;
        const weekStart = firstDriver.weekStart;
        const weekEnd = firstDriver.weekEnd;

        // Get aggregates for this week to validate drivers
        const aggregates = await storage.getDriverAggregatesForDateRange(weekStart, weekEnd);

        // Create driver map for this week
        const driverMap = new Map<string, { driverId: number; driverName: string }>();
        aggregates.forEach(agg => {
          driverMap.set(agg.driverName.toUpperCase(), {
            driverId: agg.driverId,
            driverName: agg.driverName
          });
        });

        // Check for existing data if not confirming overwrite
        if (!confirmOverwrite) {
          for (const [driverNameUpper, data] of driversMap.entries()) {
            const driverInfo = driverMap.get(driverNameUpper);
            if (!driverInfo) continue;

            // Check if this driver already has data for this week
            const existingSummary = await storage.getWeeklySummary(
              driverInfo.driverId,
              data.weekStart,
              data.weekEnd
            );

            if (existingSummary && (existingSummary.trips > 0 || existingSummary.totalEarnings > 0 || existingSummary.cash > 0 || existingSummary.refund > 0)) {
              existingData.push({
                driverName: driverInfo.driverName,
                weekStart: data.weekStart,
                weekEnd: data.weekEnd,
              });
            }
          }
        }
      }

      // If duplicates found and not confirming overwrite, return them
      if (existingData.length > 0 && !confirmOverwrite) {
        return res.json({
          duplicatesFound: true,
          existingData,
          message: "Data already exists for some drivers in these weeks. Please confirm to overwrite."
        });
      }

      // Proceed with import (either no duplicates or confirmed overwrite)
      for (const [weekKey, driversMap] of weeklyData.entries()) {
        const firstDriver = driversMap.values().next().value;
        const weekStart = firstDriver.weekStart;
        const weekEnd = firstDriver.weekEnd;

        // Get aggregates for this week to validate drivers
        const aggregates = await storage.getDriverAggregatesForDateRange(weekStart, weekEnd);

        // Create driver map for this week
        const driverMap = new Map<string, { driverId: number; driverName: string }>();
        aggregates.forEach(agg => {
          driverMap.set(agg.driverName.toUpperCase(), {
            driverId: agg.driverId,
            driverName: agg.driverName
          });
        });

        // Save data for each driver in this week
        for (const [driverNameUpper, data] of driversMap.entries()) {
          const driverInfo = driverMap.get(driverNameUpper);

          if (!driverInfo) {
            // Driver not found in computed weekly summary for this week
            if (!results.driversNotFound.includes(data.driverName)) {
              results.driversNotFound.push(data.driverName);
            }
            results.skipped++;
            continue;
          }

          // Update weekly summary for this driver
          await storage.upsertWeeklySummary({
            driverId: driverInfo.driverId,
            startDate: data.weekStart,
            endDate: data.weekEnd,
            trips: data.trips,
            totalEarnings: data.totalEarnings,
            cash: data.cash,
            refund: data.refund,
            expenses: 0, // Not provided in CSV
            dues: 0,     // Not provided in CSV
            payout: 0,   // Not provided in CSV
          });

          results.success++;
        }

        broadcast("weeklysummary:changed", { range: { start: weekStart, end: weekEnd } });
      }

      res.json({
        message: "Import completed",
        ...results
      });
    } catch (error: any) {
      console.error("Weekly summary import error:", error);
      res.status(500).json({ message: "Failed to import weekly summary data", error: error.message });
    }
  });

  // Investment routes
  app.get("/api/investments", async (req, res) => {
    try {
      const investments = await storage.getAllInvestments();
      res.json(investments);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch investments", error: error.message });
    }
  });

  app.get("/api/investments/by-investor", async (req, res) => {
    try {
      const investors = await storage.getInvestmentsByInvestor();
      res.json(investors);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch investments by investor", error: error.message });
    }
  });

  app.post("/api/investments", async (req, res) => {
    try {
      const investmentData = insertInvestmentSchema.parse(req.body);
      const investment = await storage.createInvestment(investmentData);
      res.status(201).json(investment);
      broadcast("investments:changed", {});
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create investment", error: error.message });
    }
  });

  app.put("/api/investments/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid investment ID" });
      }
      const investmentData = updateInvestmentSchema.parse(req.body);
      const investment = await storage.updateInvestment(id, investmentData);
      res.json(investment);
      broadcast("investments:changed", {});
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update investment", error: error.message });
    }
  });

  app.delete("/api/investments/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid investment ID" });
      }
      await storage.deleteInvestment(id);
      res.json({ message: "Investment deleted successfully" });
      broadcast("investments:changed", {});
    } catch (error: any) {
      res.status(400).json({ message: "Failed to delete investment", error: error.message });
    }
  });

  // Investment return routes
  app.get("/api/investments/:id/returns", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid investment ID" });
      }
      const returns = await storage.getInvestmentReturnsByInvestment(id);
      res.json(returns);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch investment returns", error: error.message });
    }
  });

  app.post("/api/investment-returns", async (req, res) => {
    try {
      const returnData = insertInvestmentReturnSchema.parse(req.body);
      const investmentReturn = await storage.createInvestmentReturn(returnData);
      res.status(201).json(investmentReturn);
      broadcast("investments:changed", {});
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create investment return", error: error.message });
    }
  });

  app.put("/api/investment-returns/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid return ID" });
      }
      const returnData = updateInvestmentReturnSchema.parse(req.body);
      const investmentReturn = await storage.updateInvestmentReturn(id, returnData);
      res.json(investmentReturn);
      broadcast("investments:changed", {});
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update investment return", error: error.message });
    }
  });

  app.delete("/api/investment-returns/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid return ID" });
      }
      await storage.deleteInvestmentReturn(id);
      res.json({ message: "Investment return deleted successfully" });
      broadcast("investments:changed", {});
    } catch (error: any) {
      res.status(400).json({ message: "Failed to delete investment return", error: error.message });
    }
  });

  // Meta routes
  app.get("/api/meta/first-trip-date", async (req, res) => {
    try {
      const firstTripDate = await storage.getFirstTripDate();
      res.json({ firstTripDate });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch first trip date", error: error.message });
    }
  });

  // Export routes
  app.get("/api/export/:type", async (req, res) => {
    try {
      const { type } = req.params;
      let data: any[] = [];
      let filename = "";

      switch (type) {
        case "settlements":
          data = await storage.listWeeklySettlements();
          filename = "settlements_export.json";
          break;
        case "trips":
          data = await storage.getRecentRentLogs(1000); // Get last 1000 rent logs
          filename = "trips_export.json";
          break;
        case "drivers":
          data = await storage.getAllDrivers();
          filename = "drivers_export.json";
          break;
        case "vehicles":
          data = await storage.getAllVehicles();
          filename = "vehicles_export.json";
          break;
        default:
          return res.status(400).json({ message: "Invalid export type" });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json');
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to export data", error: error.message });
    }
  });

  // Import route for bulk trip log data
  app.post("/api/import/trip-logs", async (req, res) => {
    try {
      const { csvData } = req.body;
      
      if (!csvData || !Array.isArray(csvData)) {
        return res.status(400).json({ message: "Invalid CSV data format" });
      }

      // STEP 1: Pre-validate CSV file for internal duplicates
      const driverDateMap = new Map<string, Set<string>>();
      const duplicates: Array<{ driver: string; date: string; rows: number[] }> = [];
      
      for (let i = 0; i < csvData.length; i++) {
        const rawRow = csvData[i];
        
        // Normalize field names
        let driverName = '';
        let dateStr = '';
        
        for (const [key, value] of Object.entries(rawRow)) {
          const normalizedKey = key.trim().toLowerCase();
          if (normalizedKey === 'driver' && value && typeof value === 'string') {
            driverName = value.toString().trim().toUpperCase();
          }
          if (normalizedKey === 'date' && value && typeof value === 'string') {
            dateStr = value.toString().trim();
          }
        }
        
        // Skip if no driver or date (will be caught later as validation error)
        if (!driverName || !dateStr) continue;
        
        // Skip "No Vehicle" and "Leave" entries
        let shift = '';
        let vehicle = '';
        for (const [key, value] of Object.entries(rawRow)) {
          const normalizedKey = key.trim().toLowerCase();
          if (normalizedKey === 'shift') shift = value?.toString().toLowerCase() || '';
          if (normalizedKey === 'vehicle') vehicle = value?.toString().toLowerCase() || '';
        }
        
        if (vehicle.includes('no vechicle') || shift === 'leave' || shift.includes('no vechicle')) {
          continue;
        }
        
        // Check for duplicates
        const key = `${driverName}|${dateStr}`;
        if (!driverDateMap.has(key)) {
          driverDateMap.set(key, new Set([i.toString()]));
        } else {
          const existingRows = driverDateMap.get(key)!;
          existingRows.add(i.toString());
          
          // Check if we already recorded this duplicate
          const existing = duplicates.find(d => d.driver === driverName && d.date === dateStr);
          if (!existing) {
            duplicates.push({
              driver: driverName,
              date: dateStr,
              rows: Array.from(existingRows).map(r => parseInt(r) + 2) // +2 for Excel row numbers (header + 0-index)
            });
          } else {
            existing.rows = Array.from(existingRows).map(r => parseInt(r) + 2);
          }
        }
      }
      
      // If duplicates found, reject the entire file
      if (duplicates.length > 0) {
        const duplicateMessages = duplicates.map(d => 
          `Driver "${d.driver}" on ${d.date} (rows: ${d.rows.join(', ')})`
        );
        
        return res.status(400).json({
          message: "CSV file contains duplicate driver entries on the same day. Please fix these duplicates and try again.",
          duplicates: duplicateMessages,
          rejected: true
        });
      }

      const results = {
        success: 0,
        skipped: 0,
        errors: [] as string[],
        details: {
          vehiclesCreated: [] as string[],
          driversCreated: [] as string[],
          rentLogsCreated: 0,
        }
      };

      // Get all existing vehicles and drivers
      const allVehicles = await storage.getAllVehicles();
      const allDrivers = await storage.getAllDrivers();
      
      const vehicleMap = new Map(allVehicles.map(v => [v.vehicleNumber.toUpperCase(), v]));
      const driverMap = new Map(allDrivers.map(d => [d.name.toUpperCase(), d]));

      // Process each row
      for (let i = 0; i < csvData.length; i++) {
        const rawRow = csvData[i];
        
        try {
          // Normalize field names to be case-insensitive
          const row: any = {};
          for (const [key, value] of Object.entries(rawRow)) {
            const normalizedKey = key.trim().toLowerCase();
            if (normalizedKey === 'date') row.Date = value;
            else if (normalizedKey === 'vehicle') row.Vehicle = value;
            else if (normalizedKey === 'driver') row.Driver = value;
            else if (normalizedKey === 'shift') row.Shift = value;
            else if (normalizedKey === 'rent') row.Rent = value;
            else if (normalizedKey === 'fuel') row.Fuel = value;
            // For Collection, take the first non-empty value
            else if (normalizedKey === 'collection' && !row.Collection) row.Collection = value;
          }
          
          // Validate required fields exist
          if (!row.Date || typeof row.Date !== 'string' || !row.Date.trim()) {
            results.errors.push(`Row ${i + 2}: Missing or invalid date`);
            continue;
          }

          if (!row.Vehicle || typeof row.Vehicle !== 'string' || !row.Vehicle.trim()) {
            results.errors.push(`Row ${i + 2}: Missing or invalid vehicle`);
            continue;
          }

          if (!row.Driver || typeof row.Driver !== 'string' || !row.Driver.trim()) {
            results.errors.push(`Row ${i + 2}: Missing or invalid driver`);
            continue;
          }

          // Skip rows with "No Vechicle", "Leave", or empty vehicle/driver
          if (row.Vehicle.toLowerCase().includes('no vechicle') || 
              row.Shift?.toLowerCase() === 'leave' ||
              row.Shift?.toLowerCase().includes('no vechicle')) {
            results.skipped++;
            continue;
          }

          // Parse date (DD/MM/YYYY format)
          const dateParts = row.Date.trim().split('/');
          if (dateParts.length !== 3) {
            results.errors.push(`Row ${i + 2}: Invalid date format (expected DD/MM/YYYY)`);
            continue;
          }

          const [day, month, year] = dateParts.map((p: string) => parseInt(p.trim()));
          
          if (isNaN(day) || isNaN(month) || isNaN(year)) {
            results.errors.push(`Row ${i + 2}: Invalid date values`);
            continue;
          }

          const tripDate = new Date(year, month - 1, day);
          
          if (isNaN(tripDate.getTime()) || tripDate.getFullYear() !== year || 
              tripDate.getMonth() !== month - 1 || tripDate.getDate() !== day) {
            results.errors.push(`Row ${i + 2}: Invalid date (${row.Date})`);
            continue;
          }

          // Get or create vehicle
          let vehicle = vehicleMap.get(row.Vehicle.toUpperCase());
          if (!vehicle) {
            // Create new vehicle
            vehicle = await storage.createVehicle({
              vehicleNumber: row.Vehicle,
              company: "PMV", // Default company
              purchasedDate: tripDate.toISOString().split('T')[0],
            });
            vehicleMap.set(row.Vehicle.toUpperCase(), vehicle);
            results.details.vehiclesCreated.push(row.Vehicle);
          }

          // Get or create driver
          let driver = driverMap.get(row.Driver.toUpperCase());
          if (!driver) {
            // Create new driver
            driver = await storage.createDriver({
              name: row.Driver,
              phone: "0000000000", // Placeholder phone
              hasAccommodation: false,
              joinedDate: tripDate.toISOString().split('T')[0],
            });
            driverMap.set(row.Driver.toUpperCase(), driver);
            results.details.driversCreated.push(row.Driver);
          }

          // Parse shift
          const shift = row.Shift?.toLowerCase() === 'evening' ? 'evening' : 'morning';

          // Parse rent, collection, fuel (default to 0 if empty or invalid)
          const parseNumber = (value: any): number => {
            if (!value || value === '') return 0;
            const str = value.toString().trim();
            // Handle non-numeric values like "X"
            if (str.toLowerCase() === 'x' || str === '-') return 0;
            const num = parseFloat(str);
            return isNaN(num) ? 0 : num;
          };
          
          const rent = parseNumber(row.Rent);
          const amountCollected = parseNumber(row.Collection);
          const fuel = parseNumber(row.Fuel);

          // Calculate week boundaries
          const weekStart = new Date(tripDate);
          const day2 = weekStart.getDay();
          const diff = weekStart.getDate() - day2 + (day2 === 0 ? -6 : 1);
          weekStart.setDate(diff);
          weekStart.setHours(0, 0, 0, 0);
          
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);

          // Check if driver already has an entry for this date
          const startOfDay = new Date(tripDate.getFullYear(), tripDate.getMonth(), tripDate.getDate());
          const endOfDay = new Date(tripDate.getFullYear(), tripDate.getMonth(), tripDate.getDate() + 1);
          const existingLogs = await storage.getDriverRentLogsByDateRange(driver.id, startOfDay, endOfDay);
          
          if (existingLogs.length > 0) {
            // Skip this entry - driver already has a rent log for this date
            results.skipped++;
            continue;
          }

          // Create rent log
          const rentLog = await storage.createDriverRentLog({
            driverId: driver.id,
            vehicleId: vehicle.id,
            date: tripDate,
            shift,
            rent: Math.round(rent),
            amountCollected: Math.round(amountCollected),
            fuel: Math.round(fuel),
            weekStart: weekStart,
            weekEnd: weekEnd,
          });
          results.details.rentLogsCreated++;

          results.success++;
        } catch (error: any) {
          // Handle duplicate key errors more gracefully
          if (error.message && error.message.includes('duplicate key value violates unique constraint')) {
            results.skipped++;
          } else {
            results.errors.push(`Row ${i + 2}: ${error.message}`);
          }
        }
      }

      broadcast("triplogs:changed");

      res.json({
        message: "Import completed",
        ...results
      });
    } catch (error: any) {
      console.error("Import error:", error);
      res.status(500).json({ message: "Failed to import data", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
