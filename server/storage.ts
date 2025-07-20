import { 
  vehicles, drivers, vehicleDriverAssignments, trips, driverRentLogs, 
  weeklySettlements, substituteDrivers,
  type Vehicle, type Driver, type VehicleDriverAssignment, type Trip, 
  type DriverRentLog, type WeeklySettlement, type SubstituteDriver,
  type InsertVehicle, type InsertDriver, type InsertVehicleDriverAssignment, 
  type InsertTrip, type InsertDriverRentLog, type InsertWeeklySettlement, 
  type InsertSubstituteDriver
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, gte, lte, desc, asc } from "drizzle-orm";

export interface IStorage {
  // Vehicle operations
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  getVehicle(id: number): Promise<Vehicle | undefined>;
  getAllVehicles(): Promise<Vehicle[]>;
  getVehicleByNumber(vehicleNumber: string): Promise<Vehicle | undefined>;
  updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle>;
  deleteVehicle(id: number): Promise<void>;

  // Driver operations
  createDriver(driver: InsertDriver): Promise<Driver>;
  getDriver(id: number): Promise<Driver | undefined>;
  getAllDrivers(): Promise<Driver[]>;
  updateDriver(id: number, driver: Partial<InsertDriver>): Promise<Driver>;
  deleteDriver(id: number): Promise<void>;

  // Vehicle-Driver assignments
  createVehicleDriverAssignment(assignment: InsertVehicleDriverAssignment): Promise<VehicleDriverAssignment>;
  getVehicleDriverAssignment(vehicleId: number): Promise<VehicleDriverAssignment | undefined>;
  updateVehicleDriverAssignment(vehicleId: number, assignment: Partial<InsertVehicleDriverAssignment>): Promise<VehicleDriverAssignment>;

  // Trip operations
  createTrip(trip: InsertTrip): Promise<Trip>;
  getTrip(id: number): Promise<Trip | undefined>;
  getTripsByVehicleAndDateRange(vehicleId: number, startDate: Date, endDate: Date): Promise<Trip[]>;
  getTripsByDriverAndDateRange(driverId: number, startDate: Date, endDate: Date): Promise<Trip[]>;
  getRecentTrips(limit: number): Promise<Array<Trip & { driverName: string; vehicleNumber: string }>>;
  updateTrip(id: number, trip: Partial<InsertTrip>): Promise<Trip>;
  deleteTrip(id: number): Promise<void>;

  // Driver rent log operations
  createDriverRentLog(rentLog: InsertDriverRentLog): Promise<DriverRentLog>;
  getDriverRentLog(id: number): Promise<DriverRentLog | undefined>;
  getDriverRentLogsByDateRange(driverId: number, startDate: Date, endDate: Date): Promise<DriverRentLog[]>;
  updateDriverRentLogPaymentStatus(id: number, paid: boolean): Promise<DriverRentLog>;
  deleteDriverRentLog(id: number): Promise<void>;
  getUnpaidDriverRents(): Promise<Array<DriverRentLog & { driverName: string; vehicleNumber: string }>>;
  getAllDriverRentLogs(): Promise<Array<DriverRentLog & { driverName: string; vehicleNumber: string }>>;

  // Weekly settlement operations
  createWeeklySettlement(settlement: InsertWeeklySettlement): Promise<WeeklySettlement>;
  getWeeklySettlement(id: number): Promise<WeeklySettlement | undefined>;
  getWeeklySettlementByVehicleAndWeek(vehicleId: number, weekStart: Date, weekEnd: Date): Promise<WeeklySettlement | undefined>;
  updateWeeklySettlement(id: number, settlement: Partial<InsertWeeklySettlement>): Promise<WeeklySettlement>;
  getAllWeeklySettlements(): Promise<Array<WeeklySettlement & { vehicleNumber: string }>>;

  // Substitute driver operations
  createSubstituteDriver(substitute: InsertSubstituteDriver): Promise<SubstituteDriver>;
  getSubstituteDriver(id: number): Promise<SubstituteDriver | undefined>;
  getSubstituteDriversByVehicleAndDate(vehicleId: number, date: Date): Promise<SubstituteDriver[]>;
  getSubstituteDriversByVehicle(vehicleId: number): Promise<Array<SubstituteDriver & { vehicleNumber: string }>>;
  getSubstituteDriversByVehicleAndDateRange(vehicleId: number, startDate: Date, endDate: Date): Promise<Array<SubstituteDriver & { vehicleNumber: string }>>;
  getAllSubstituteDrivers(): Promise<Array<SubstituteDriver & { vehicleNumber: string }>>;
  deleteSubstituteDriver(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Vehicle operations
  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const [result] = await db.insert(vehicles).values(vehicle).returning();
    return result;
  }

  async getVehicle(id: number): Promise<Vehicle | undefined> {
    const [result] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return result || undefined;
  }

  async getAllVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles).orderBy(asc(vehicles.vehicleNumber));
  }

  async getVehicleByNumber(vehicleNumber: string): Promise<Vehicle | undefined> {
    const [result] = await db.select().from(vehicles).where(eq(vehicles.vehicleNumber, vehicleNumber));
    return result || undefined;
  }

  async updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle> {
    const [result] = await db.update(vehicles)
      .set(vehicle)
      .where(eq(vehicles.id, id))
      .returning();
    return result;
  }

  async deleteVehicle(id: number): Promise<void> {
    await db.delete(vehicles).where(eq(vehicles.id, id));
  }

  // Driver operations
  async createDriver(driver: InsertDriver): Promise<Driver> {
    const [result] = await db.insert(drivers).values(driver).returning();
    return result;
  }

  async getDriver(id: number): Promise<Driver | undefined> {
    const [result] = await db.select().from(drivers).where(eq(drivers.id, id));
    return result || undefined;
  }

  async getAllDrivers(): Promise<Driver[]> {
    return await db.select().from(drivers).orderBy(asc(drivers.name));
  }

  async updateDriver(id: number, driver: Partial<InsertDriver>): Promise<Driver> {
    const [result] = await db.update(drivers)
      .set(driver)
      .where(eq(drivers.id, id))
      .returning();
    return result;
  }

  async deleteDriver(id: number): Promise<void> {
    await db.delete(drivers).where(eq(drivers.id, id));
  }

  // Vehicle-Driver assignments
  async createVehicleDriverAssignment(assignment: InsertVehicleDriverAssignment): Promise<VehicleDriverAssignment> {
    const [result] = await db.insert(vehicleDriverAssignments).values(assignment).returning();
    return result;
  }

  async getVehicleDriverAssignment(vehicleId: number): Promise<VehicleDriverAssignment | undefined> {
    const [result] = await db.select().from(vehicleDriverAssignments).where(eq(vehicleDriverAssignments.vehicleId, vehicleId));
    return result || undefined;
  }

  async updateVehicleDriverAssignment(vehicleId: number, assignment: Partial<InsertVehicleDriverAssignment>): Promise<VehicleDriverAssignment> {
    const [result] = await db.update(vehicleDriverAssignments)
      .set(assignment)
      .where(eq(vehicleDriverAssignments.vehicleId, vehicleId))
      .returning();
    return result;
  }

  // Trip operations
  async createTrip(trip: InsertTrip): Promise<Trip> {
    const [result] = await db.insert(trips).values(trip).returning();
    return result;
  }

  async getTrip(id: number): Promise<Trip | undefined> {
    const [result] = await db.select().from(trips).where(eq(trips.id, id));
    return result || undefined;
  }

  async getTripsByVehicleAndDateRange(vehicleId: number, startDate: Date, endDate: Date): Promise<Trip[]> {
    return await db.select().from(trips)
      .where(and(
        eq(trips.vehicleId, vehicleId),
        gte(trips.tripDate, startDate),
        lte(trips.tripDate, endDate)
      ))
      .orderBy(desc(trips.tripDate));
  }

  async getTripsByDriverAndDateRange(driverId: number, startDate: Date, endDate: Date): Promise<Trip[]> {
    return await db.select().from(trips)
      .where(and(
        eq(trips.driverId, driverId),
        gte(trips.tripDate, startDate),
        lte(trips.tripDate, endDate)
      ))
      .orderBy(desc(trips.tripDate));
  }

  async getRecentTrips(limit: number): Promise<Array<Trip & { driverName: string; vehicleNumber: string }>> {
    const result = await db.select({
      id: trips.id,
      driverId: trips.driverId,
      vehicleId: trips.vehicleId,
      tripDate: trips.tripDate,
      shift: trips.shift,
      tripCount: trips.tripCount,
      createdAt: trips.createdAt,
      updatedAt: trips.updatedAt,
      driverName: drivers.name,
      vehicleNumber: vehicles.vehicleNumber,
    }).from(trips)
      .innerJoin(drivers, eq(trips.driverId, drivers.id))
      .innerJoin(vehicles, eq(trips.vehicleId, vehicles.id))
      .orderBy(desc(trips.tripDate))
      .limit(limit);
    
    return result;
  }

  async updateTrip(id: number, trip: Partial<InsertTrip>): Promise<Trip> {
    const [result] = await db.update(trips)
      .set({ ...trip, updatedAt: new Date() })
      .where(eq(trips.id, id))
      .returning();
    return result;
  }

  async deleteTrip(id: number): Promise<void> {
    await db.delete(trips).where(eq(trips.id, id));
  }

  // Driver rent log operations
  async createDriverRentLog(rentLog: InsertDriverRentLog): Promise<DriverRentLog> {
    const [result] = await db.insert(driverRentLogs).values(rentLog).returning();
    return result;
  }

  async getDriverRentLog(id: number): Promise<DriverRentLog | undefined> {
    const [result] = await db.select().from(driverRentLogs).where(eq(driverRentLogs.id, id));
    return result || undefined;
  }

  async getDriverRentLogsByDateRange(driverId: number, startDate: Date, endDate: Date): Promise<DriverRentLog[]> {
    return await db.select().from(driverRentLogs)
      .where(and(
        eq(driverRentLogs.driverId, driverId),
        gte(driverRentLogs.date, startDate),
        lte(driverRentLogs.date, endDate)
      ))
      .orderBy(desc(driverRentLogs.date));
  }

  async updateDriverRentLogPaymentStatus(id: number, paid: boolean): Promise<DriverRentLog> {
    const [result] = await db.update(driverRentLogs)
      .set({ paid })
      .where(eq(driverRentLogs.id, id))
      .returning();
    return result;
  }

  async deleteDriverRentLog(id: number): Promise<void> {
    await db.delete(driverRentLogs).where(eq(driverRentLogs.id, id));
  }

  async getUnpaidDriverRents(): Promise<Array<DriverRentLog & { driverName: string; vehicleNumber: string }>> {
    // Get unpaid rent logs with driver names
    const rentLogs = await db.select({
      id: driverRentLogs.id,
      driverId: driverRentLogs.driverId,
      date: driverRentLogs.date,
      shift: driverRentLogs.shift,
      rent: driverRentLogs.rent,
      paid: driverRentLogs.paid,
      vehicleId: driverRentLogs.vehicleId,
      weekStart: driverRentLogs.weekStart,
      weekEnd: driverRentLogs.weekEnd,
      createdAt: driverRentLogs.createdAt,
      updatedAt: driverRentLogs.updatedAt,
      driverName: drivers.name,
    }).from(driverRentLogs)
      .innerJoin(drivers, eq(driverRentLogs.driverId, drivers.id))
      .where(eq(driverRentLogs.paid, false))
      .orderBy(desc(driverRentLogs.date));

    // Add vehicle information for each rent log
    const result: Array<DriverRentLog & { driverName: string; vehicleNumber: string }> = [];
    for (const rentLog of rentLogs) {
      // Find vehicle assignment for this driver
      const assignment = await db.select({
        vehicleId: vehicleDriverAssignments.vehicleId,
        vehicleNumber: vehicles.vehicleNumber,
      }).from(vehicleDriverAssignments)
        .innerJoin(vehicles, eq(vehicleDriverAssignments.vehicleId, vehicles.id))
        .where(or(
          eq(vehicleDriverAssignments.morningDriverId, rentLog.driverId),
          eq(vehicleDriverAssignments.eveningDriverId, rentLog.driverId)
        ))
        .limit(1);

      const vehicleNumber = assignment[0]?.vehicleNumber || "Unassigned";
      
      result.push({
        ...rentLog,
        vehicleNumber: vehicleNumber as string,
      });
    }
    
    return result;
  }

  async getAllDriverRentLogs(): Promise<Array<DriverRentLog & { driverName: string; vehicleNumber: string }>> {
    // Get all rent logs with driver names
    const rentLogs = await db.select({
      id: driverRentLogs.id,
      driverId: driverRentLogs.driverId,
      date: driverRentLogs.date,
      shift: driverRentLogs.shift,
      rent: driverRentLogs.rent,
      paid: driverRentLogs.paid,
      vehicleId: driverRentLogs.vehicleId,
      weekStart: driverRentLogs.weekStart,
      weekEnd: driverRentLogs.weekEnd,
      createdAt: driverRentLogs.createdAt,
      updatedAt: driverRentLogs.updatedAt,
      driverName: drivers.name,
    }).from(driverRentLogs)
      .innerJoin(drivers, eq(driverRentLogs.driverId, drivers.id))
      .orderBy(desc(driverRentLogs.date));

    // Add vehicle information for each rent log
    const result: Array<DriverRentLog & { driverName: string; vehicleNumber: string }> = [];
    for (const rentLog of rentLogs) {
      // Find vehicle assignment for this driver
      const assignment = await db.select({
        vehicleId: vehicleDriverAssignments.vehicleId,
        vehicleNumber: vehicles.vehicleNumber,
      }).from(vehicleDriverAssignments)
        .innerJoin(vehicles, eq(vehicleDriverAssignments.vehicleId, vehicles.id))
        .where(or(
          eq(vehicleDriverAssignments.morningDriverId, rentLog.driverId),
          eq(vehicleDriverAssignments.eveningDriverId, rentLog.driverId)
        ))
        .limit(1);

      const vehicleNumber = assignment[0]?.vehicleNumber || "Unassigned";
      
      result.push({
        ...rentLog,
        vehicleNumber: vehicleNumber as string,
      });
    }

    return result;
  }

  // Weekly settlement operations
  async createWeeklySettlement(settlement: InsertWeeklySettlement): Promise<WeeklySettlement> {
    const [result] = await db.insert(weeklySettlements).values(settlement).returning();
    return result;
  }

  async getWeeklySettlement(id: number): Promise<WeeklySettlement | undefined> {
    const [result] = await db.select().from(weeklySettlements).where(eq(weeklySettlements.id, id));
    return result || undefined;
  }

  async getWeeklySettlementByVehicleAndWeek(vehicleId: number, weekStart: Date, weekEnd: Date): Promise<WeeklySettlement | undefined> {
    const [result] = await db.select().from(weeklySettlements)
      .where(and(
        eq(weeklySettlements.vehicleId, vehicleId),
        eq(weeklySettlements.weekStart, weekStart),
        eq(weeklySettlements.weekEnd, weekEnd)
      ));
    return result || undefined;
  }

  async updateWeeklySettlement(id: number, settlement: Partial<InsertWeeklySettlement>): Promise<WeeklySettlement> {
    const [result] = await db.update(weeklySettlements)
      .set({ ...settlement, updatedAt: new Date() })
      .where(eq(weeklySettlements.id, id))
      .returning();
    return result;
  }

  async getAllWeeklySettlements(): Promise<Array<WeeklySettlement & { vehicleNumber: string }>> {
    const result = await db.select({
      id: weeklySettlements.id,
      vehicleId: weeklySettlements.vehicleId,
      weekStart: weeklySettlements.weekStart,
      weekEnd: weeklySettlements.weekEnd,
      totalTrips: weeklySettlements.totalTrips,
      rentalRate: weeklySettlements.rentalRate,
      totalRentToCompany: weeklySettlements.totalRentToCompany,
      driver1Data: weeklySettlements.driver1Data,
      driver2Data: weeklySettlements.driver2Data,
      totalDriverRent: weeklySettlements.totalDriverRent,
      profit: weeklySettlements.profit,
      paid: weeklySettlements.paid,
      createdAt: weeklySettlements.createdAt,
      updatedAt: weeklySettlements.updatedAt,
      vehicleNumber: vehicles.vehicleNumber,
    }).from(weeklySettlements)
      .innerJoin(vehicles, eq(weeklySettlements.vehicleId, vehicles.id))
      .orderBy(desc(weeklySettlements.weekStart));
    
    return result;
  }

  // Substitute driver operations
  async createSubstituteDriver(substitute: InsertSubstituteDriver): Promise<SubstituteDriver> {
    const [result] = await db.insert(substituteDrivers).values(substitute).returning();
    return result;
  }

  async getSubstituteDriver(id: number): Promise<SubstituteDriver | undefined> {
    const [result] = await db.select().from(substituteDrivers).where(eq(substituteDrivers.id, id));
    return result || undefined;
  }

  async getSubstituteDriversByVehicleAndDate(vehicleId: number, date: Date): Promise<SubstituteDriver[]> {
    return await db.select().from(substituteDrivers)
      .where(and(
        eq(substituteDrivers.vehicleId, vehicleId),
        eq(substituteDrivers.date, date)
      ))
      .orderBy(desc(substituteDrivers.createdAt));
  }

  async getSubstituteDriversByVehicle(vehicleId: number): Promise<Array<SubstituteDriver & { vehicleNumber: string }>> {
    const result = await db.select({
      id: substituteDrivers.id,
      name: substituteDrivers.name,
      vehicleId: substituteDrivers.vehicleId,
      date: substituteDrivers.date,
      shift: substituteDrivers.shift,
      shiftHours: substituteDrivers.shiftHours,
      tripCount: substituteDrivers.tripCount,
      charge: substituteDrivers.charge,
      createdAt: substituteDrivers.createdAt,
      updatedAt: substituteDrivers.updatedAt,
      vehicleNumber: vehicles.vehicleNumber,
    }).from(substituteDrivers)
      .innerJoin(vehicles, eq(substituteDrivers.vehicleId, vehicles.id))
      .where(eq(substituteDrivers.vehicleId, vehicleId))
      .orderBy(desc(substituteDrivers.date));
    
    return result;
  }

  async getSubstituteDriversByVehicleAndDateRange(vehicleId: number, startDate: Date, endDate: Date): Promise<Array<SubstituteDriver & { vehicleNumber: string }>> {
    const result = await db.select({
      id: substituteDrivers.id,
      name: substituteDrivers.name,
      vehicleId: substituteDrivers.vehicleId,
      date: substituteDrivers.date,
      shift: substituteDrivers.shift,
      shiftHours: substituteDrivers.shiftHours,
      tripCount: substituteDrivers.tripCount,
      charge: substituteDrivers.charge,
      createdAt: substituteDrivers.createdAt,
      updatedAt: substituteDrivers.updatedAt,
      vehicleNumber: vehicles.vehicleNumber,
    }).from(substituteDrivers)
      .innerJoin(vehicles, eq(substituteDrivers.vehicleId, vehicles.id))
      .where(and(
        eq(substituteDrivers.vehicleId, vehicleId),
        gte(substituteDrivers.date, startDate),
        lte(substituteDrivers.date, endDate)
      ))
      .orderBy(desc(substituteDrivers.date));
    
    return result;
  }

  async getAllSubstituteDrivers(): Promise<Array<SubstituteDriver & { vehicleNumber: string }>> {
    const result = await db.select({
      id: substituteDrivers.id,
      name: substituteDrivers.name,
      vehicleId: substituteDrivers.vehicleId,
      date: substituteDrivers.date,
      shift: substituteDrivers.shift,
      shiftHours: substituteDrivers.shiftHours,
      tripCount: substituteDrivers.tripCount,
      charge: substituteDrivers.charge,
      createdAt: substituteDrivers.createdAt,
      updatedAt: substituteDrivers.updatedAt,
      vehicleNumber: vehicles.vehicleNumber,
    }).from(substituteDrivers)
      .innerJoin(vehicles, eq(substituteDrivers.vehicleId, vehicles.id))
      .orderBy(desc(substituteDrivers.date));
    
    return result;
  }

  async deleteSubstituteDriver(id: number): Promise<void> {
    await db.delete(substituteDrivers).where(eq(substituteDrivers.id, id));
  }
}

export const storage = new DatabaseStorage();
