import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertVehicleSchema, updateVehicleSchema, insertDriverSchema, updateDriverSchema, insertVehicleDriverAssignmentSchema,
  insertTripSchema, insertDriverRentLogSchema, insertSubstituteDriverSchema,
  upsertWeeklySummarySchema
} from "@shared/schema";
import { getRentalInfo, getAllSlabs, getDriverRent, getRentalRate } from "./services/rentalCalculator";
import { calculateWeeklySettlement, processWeeklySettlement, processAllVehicleSettlements, generateDailyRentLogs } from "./services/settlementProcessor";
import { resetAllSequences, checkSequenceSync } from "./utils/resetSequences";

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

  // Trip routes
  app.post("/api/trips", async (req, res) => {
    try {
      // Convert tripDate string to Date object before validation
      const tripDate = new Date(req.body.tripDate);
      const weekStart = getWeekStart(tripDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Add 6 days for the week end
      
      const body = {
        ...req.body,
        tripDate: tripDate,
        weekStart: weekStart,
        weekEnd: weekEnd
      };
      const tripData = insertTripSchema.parse(body);
      const trip = await storage.createTrip(tripData);
      
      // Automatically generate rent log for the driver with money details
      await generateDailyRentLogs(
        tripData.driverId, 
        tripData.tripDate, 
        tripData.vehicleId,
        tripData.shift,
        req.body.rent,
        req.body.amountCollected,
        req.body.fuel
      );
      
      res.status(201).json(trip);
    } catch (error) {
      res.status(400).json({ message: "Invalid trip data", error: error.message });
    }
  });

  app.put("/api/trips/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }
      // Convert tripDate string to Date object before validation
      const tripDate = new Date(req.body.tripDate);
      const weekStart = getWeekStart(tripDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Add 6 days for the week end
      
      const body = {
        ...req.body,
        tripDate: tripDate,
        weekStart: weekStart,
        weekEnd: weekEnd
      };
      const tripData = insertTripSchema.parse(body);
      const trip = await storage.updateTrip(id, tripData);
      
      // Ensure rent log exists for the updated trip date and driver
      await generateDailyRentLogs(
        tripData.driverId, 
        tripData.tripDate, 
        tripData.vehicleId,
        tripData.shift,
        req.body.rent,
        req.body.amountCollected,
        req.body.fuel
      );
      
      res.json(trip);
    } catch (error) {
      res.status(400).json({ message: "Failed to update trip", error: error.message });
    }
  });

  app.delete("/api/trips/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }

      // Get trip details before deletion for cascading cleanup
      const trip = await storage.getTrip(id);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      // Delete associated rent log for the same driver and date
      const tripDate = new Date(trip.tripDate);
      const startOfDay = new Date(tripDate.getFullYear(), tripDate.getMonth(), tripDate.getDate());
      const endOfDay = new Date(tripDate.getFullYear(), tripDate.getMonth(), tripDate.getDate() + 1);
      
      const rentLogs = await storage.getDriverRentLogsByDateRange(trip.driverId, startOfDay, endOfDay);
      for (const rentLog of rentLogs) {
        await storage.deleteDriverRentLog(rentLog.id);
      }

      // Delete the trip
      await storage.deleteTrip(id);

      res.json({ message: "Trip deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete trip", error: error.message });
    }
  });

  app.get("/api/trips/recent/:limit", async (req, res) => {
    try {
      const limit = parseInt(req.params.limit) || 10;
      const trips = await storage.getRecentTrips(limit);
      res.json(trips);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent trips", error: error.message });
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
      
      // Get ONLY current week's trips for this vehicle
      const weeklyTrips = await storage.getTripsByVehicleAndDateRange(id, weekStart, weekEnd);
      
      // Get substitute drivers for this specific vehicle in this week
      const weeklySubstituteDrivers = await storage.getSubstituteDriversByVehicleAndDateRange(id, weekStart, weekEnd);
      
      // Calculate total trips from regular trips + substitute driver trips (current week only)
      // Since trips no longer have tripCount, count the number of trip records (each shift = 1 trip entry)
      const regularTrips = weeklyTrips.length;
      const substituteTrips = weeklySubstituteDrivers.reduce((sum, sub) => sum + (sub.tripCount || 1), 0); // Use actual trip count from substitutes
      const totalTrips = regularTrips + substituteTrips;

      
      // Calculate total driver rent for this vehicle only
      // We need to get rent logs for drivers who worked on this specific vehicle
      let totalActualDriverRent = 0;
      
      // Create a Set to track unique driver-date combinations to avoid double counting
      const processedDriverDates = new Set<string>();
      
      // Get rent logs for each driver who worked on this vehicle during the week
      for (const trip of weeklyTrips) {
        const tripDate = new Date(trip.tripDate);
        const dateKey = `${trip.driverId}-${tripDate.toISOString().split('T')[0]}`;
        
        // Skip if we already processed this driver-date combination
        if (processedDriverDates.has(dateKey)) {
          continue;
        }
        processedDriverDates.add(dateKey);
        
        const dayStart = new Date(tripDate.getFullYear(), tripDate.getMonth(), tripDate.getDate());
        const dayEnd = new Date(tripDate.getFullYear(), tripDate.getMonth(), tripDate.getDate() + 1);
        
        const driverRentLogsForDay = await storage.getDriverRentLogsByDateRange(trip.driverId, dayStart, dayEnd);
        totalActualDriverRent += driverRentLogsForDay.reduce((sum, log) => sum + log.rent, 0);
      }
      
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

      // Fetch saved summaries for each driver
      const results = await Promise.all(
        aggregates.map(async (aggregate) => {
          const savedSummary = await storage.getWeeklySummary(
            aggregate.driverId,
            String(startDate),
            String(endDate)
          );

          return {
            driverId: aggregate.driverId,
            driverName: aggregate.driverName,
            rent: aggregate.totalRent,
            collection: aggregate.totalCollection,
            fuel: aggregate.totalFuel,
            totalEarnings: savedSummary?.totalEarnings || 0,
            cash: savedSummary?.cash || 0,
            refund: savedSummary?.refund || 0,
            expenses: savedSummary?.expenses || 0,
            dues: savedSummary?.dues || 0,
            payout: savedSummary?.payout || 0,
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
      const summary = await storage.upsertWeeklySummary(summaryData);
      res.json(summary);
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
    } catch (error: any) {
      res.status(500).json({ message: "Failed to clear weekly summary", error: error.message });
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
          data = await storage.getRecentTrips(1000); // Get last 1000 trips
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

  const httpServer = createServer(app);
  return httpServer;
}
