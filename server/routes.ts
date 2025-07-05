import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertVehicleSchema, insertDriverSchema, insertVehicleDriverAssignmentSchema,
  insertTripSchema, insertDriverRentLogSchema, insertSubstituteDriverSchema 
} from "@shared/schema";
import { getRentalInfo, getAllSlabs, getDriverRent } from "./services/rentalCalculator";
import { calculateWeeklySettlement, processWeeklySettlement, processAllVehicleSettlements, generateDailyRentLogs } from "./services/settlementProcessor";

// Validation schemas
const vehicleIdSchema = z.object({
  id: z.string().transform(Number),
});

const rentLogStatusSchema = z.object({
  paid: z.boolean(),
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
      const vehicleData = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(vehicleData);
      res.status(201).json(vehicle);
    } catch (error) {
      res.status(400).json({ message: "Invalid vehicle data", error: error.message });
    }
  });

  app.put("/api/vehicles/:id", async (req, res) => {
    try {
      const { id } = vehicleIdSchema.parse(req.params);
      const vehicleData = insertVehicleSchema.parse(req.body);
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
      const driver = await storage.createDriver(driverData);
      res.status(201).json(driver);
    } catch (error) {
      res.status(400).json({ message: "Invalid driver data", error: error.message });
    }
  });

  app.put("/api/drivers/:id", async (req, res) => {
    try {
      const { id } = vehicleIdSchema.parse(req.params);
      const driverData = insertDriverSchema.parse(req.body);
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
      const body = {
        ...req.body,
        tripDate: new Date(req.body.tripDate)
      };
      const tripData = insertTripSchema.parse(body);
      const trip = await storage.createTrip(tripData);
      
      // Automatically generate unpaid rent log for the driver
      await generateDailyRentLogs(tripData.driverId, tripData.tripDate);
      
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
      const body = {
        ...req.body,
        tripDate: new Date(req.body.tripDate)
      };
      const tripData = insertTripSchema.parse(body);
      const trip = await storage.updateTrip(id, tripData);
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

      // Recalculate weekly settlement for the affected vehicle
      const weekStart = getWeekStart(tripDate);
      try {
        // Calculate new settlement data
        const settlementData = await calculateWeeklySettlement(trip.vehicleId, weekStart);
        if (settlementData) {
          // Check if settlement already exists and update it
          const existingSettlement = await storage.getWeeklySettlementByVehicleAndWeek(
            trip.vehicleId, 
            weekStart, 
            new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
          );
          
          if (existingSettlement) {
            // Create backward compatibility fields
            const driver1Data = settlementData.drivers.length > 0 ? 
              { id: settlementData.drivers[0].id, rent: settlementData.drivers[0].rent } : null;
            const driver2Data = settlementData.drivers.length > 1 ? 
              { id: settlementData.drivers[1].id, rent: settlementData.drivers[1].rent } : null;

            // Update existing settlement
            await storage.updateWeeklySettlement(existingSettlement.id, {
              totalTrips: settlementData.totalTrips,
              rentalRate: settlementData.rentalRate,
              totalRentToCompany: settlementData.totalRentToCompany,
              driver1Data,
              driver2Data,
              totalDriverRent: settlementData.totalDriverRent,
              profit: settlementData.profit,
            });
          }
        }
      } catch (settlementError) {
        console.error("Failed to recalculate settlement after trip deletion:", settlementError);
        // Don't fail the deletion if settlement calculation fails
      }

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
      const rentLogData = insertDriverRentLogSchema.parse(req.body);
      const rentLog = await storage.createDriverRentLog(rentLogData);
      res.status(201).json(rentLog);
    } catch (error) {
      res.status(400).json({ message: "Invalid rent log data", error: error.message });
    }
  });

  app.patch("/api/driver-rent-logs/:id/status", async (req, res) => {
    try {
      const { id } = vehicleIdSchema.parse(req.params);
      const { paid } = rentLogStatusSchema.parse(req.body);
      const updatedRentLog = await storage.updateDriverRentLogPaymentStatus(id, paid);
      res.json(updatedRentLog);
    } catch (error) {
      res.status(400).json({ message: "Failed to update rent log status", error: error.message });
    }
  });

  app.get("/api/driver-rent-logs/unpaid", async (req, res) => {
    try {
      const unpaidRents = await storage.getUnpaidDriverRents();
      res.json(unpaidRents);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch unpaid rents", error: error.message });
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

  // Vehicle weekly summary route
  app.get("/api/vehicles/:id/weekly-summary", async (req, res) => {
    try {
      const { id } = vehicleIdSchema.parse(req.params);
      const weekStartDate = req.query.weekStart ? new Date(req.query.weekStart as string) : new Date();
      
      const vehicle = await storage.getVehicle(id);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      const settlementData = await calculateWeeklySettlement(id, weekStartDate);
      if (!settlementData) {
        return res.status(404).json({ message: "No settlement data available" });
      }

      const rentalInfo = getRentalInfo(vehicle.company as "PMV" | "Letzryd", settlementData.totalTrips);
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
        ...settlementData,
        rentalInfo,
        morningDriver,
        eveningDriver,
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
  app.post("/api/settlements", async (req, res) => {
    try {
      const { vehicleId, weekStartDate } = weeklySettlementSchema.parse(req.body);
      await processWeeklySettlement(vehicleId, weekStartDate);
      res.status(201).json({ message: "Settlement processed successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to process settlement", error: error.message });
    }
  });

  app.post("/api/settlements/process-all", async (req, res) => {
    try {
      const weekStartDate = req.body.weekStartDate ? new Date(req.body.weekStartDate) : new Date();
      await processAllVehicleSettlements(weekStartDate);
      res.status(201).json({ message: "All settlements processed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to process all settlements", error: error.message });
    }
  });

  app.get("/api/settlements", async (req, res) => {
    try {
      const settlements = await storage.getAllWeeklySettlements();
      res.json(settlements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settlements", error: error.message });
    }
  });

  // Dashboard profit graph data
  app.get("/api/dashboard/profit-graph", async (req, res) => {
    try {
      const settlements = await storage.getAllWeeklySettlements();
      
      const profitData = await Promise.all(settlements.map(async (settlement) => {
        // Get vehicle details for company info
        const vehicle = await storage.getVehicle(settlement.vehicleId);
        
        // Recalculate settlement data to get the new driver structure
        const settlementData = await calculateWeeklySettlement(settlement.vehicleId, settlement.weekStart);
        
        if (!settlementData) {
          return null;
        }
        
        // Calculate breakdown components
        const slabRentPerDay = settlement.rentalRate;
        const totalCompanyRent = settlement.totalRentToCompany;
        const totalDriverRent = settlement.totalDriverRent;
        
        return {
          vehicleNumber: settlement.vehicleNumber,
          vehicleId: settlement.vehicleId,
          profit: settlement.profit,
          totalTrips: settlement.totalTrips,
          weekStart: settlement.weekStart,
          weekEnd: settlement.weekEnd,
          // Breakdown components with actual driver names
          breakdown: {
            revenue: {
              drivers: settlementData.drivers,
              substitutes: settlementData.substitutes,
              totalDriverRent: settlementData.totalDriverRent,
              totalSubstituteCharges: settlementData.totalSubstituteCharges
            },
            expenses: {
              slabRentPerDay: slabRentPerDay,
              totalDays: 7,
              totalCompanyRent: totalCompanyRent,
              company: vehicle?.company || 'Unknown'
            },
            calculation: {
              totalRevenue: settlementData.totalDriverRent + settlementData.totalSubstituteCharges,
              totalExpenses: totalCompanyRent,
              netProfit: settlement.profit
            }
          }
        };
      }));

      // Filter out null results and send response
      const validProfitData = profitData.filter(data => data !== null);
      res.json(validProfitData);
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

  // Export routes
  app.get("/api/export/:type", async (req, res) => {
    try {
      const { type } = req.params;
      let data: any[] = [];
      let filename = "";

      switch (type) {
        case "settlements":
          data = await storage.getAllWeeklySettlements();
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
