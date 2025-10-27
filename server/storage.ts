import { 
  vehicles, drivers, vehicleDriverAssignments, driverRentLogs, 
  weeklySettlements, substituteDrivers, weeklySummaries, investments, investmentReturns,
  type Vehicle, type Driver, type VehicleDriverAssignment, 
  type DriverRentLog, type WeeklySettlement, type SubstituteDriver, type WeeklySummary, type Investment, type InvestmentReturn,
  type InsertVehicle, type InsertDriver, type InsertVehicleDriverAssignment, 
  type InsertDriverRentLog, type UpsertWeeklySettlementInput, 
  type InsertSubstituteDriver, type UpsertWeeklySummary, type InsertInvestment, type UpdateInvestment,
  type InsertInvestmentReturn, type UpdateInvestmentReturn
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, gte, lte, desc, asc, ne, sql } from "drizzle-orm";

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

  // Driver rent log operations
  getRecentRentLogs(limit: number): Promise<Array<DriverRentLog & { driverName: string; vehicleNumber: string }>>;
  createDriverRentLog(rentLog: InsertDriverRentLog): Promise<DriverRentLog>;
  getDriverRentLog(id: number): Promise<DriverRentLog | undefined>;
  getDriverRentLogsByDateRange(driverId: number, startDate: Date, endDate: Date): Promise<DriverRentLog[]>;
  updateDriverRentLog(id: number, rentLog: Partial<InsertDriverRentLog>): Promise<DriverRentLog>;
  deleteDriverRentLog(id: number): Promise<void>;
  getAllDriverRentLogs(): Promise<Array<DriverRentLog & { driverName: string; vehicleNumber: string }>>;

  // Weekly settlement operations
  getTripDateBounds(): Promise<{min: string | null; max: string | null}>;
  listWeeklyWindows(): Promise<Array<{weekStart: string; weekEnd: string}>>;
  aggregateWeek(weekStart: string, weekEnd: string): Promise<{
    weekStart: string;
    weekEnd: string;
    rent: number;
    wallet: number;
    companyRent: number | null;
    companyWallet: number | null;
    roomRent: number;
    profit: number | null;
  }>;
  listWeeklySettlements(): Promise<Array<{
    weekStart: string;
    weekEnd: string;
    rent: number;
    wallet: number;
    companyRent: number | null;
    companyWallet: number | null;
    roomRent: number;
    profit: number | null;
  }>>;
  upsertWeeklySettlement(input: {weekStart: string; weekEnd: string; companyRent: number | null; companyWallet: number | null}): Promise<void>;
  deleteWeeklySettlement(weekStart: string, weekEnd: string): Promise<void>;

  // Substitute driver operations
  createSubstituteDriver(substitute: InsertSubstituteDriver): Promise<SubstituteDriver>;
  getSubstituteDriver(id: number): Promise<SubstituteDriver | undefined>;
  getSubstituteDriversByVehicleAndDate(vehicleId: number, date: Date): Promise<SubstituteDriver[]>;
  getSubstituteDriversByVehicle(vehicleId: number): Promise<Array<SubstituteDriver & { vehicleNumber: string }>>;
  getSubstituteDriversByVehicleAndDateRange(vehicleId: number, startDate: Date, endDate: Date): Promise<Array<SubstituteDriver & { vehicleNumber: string }>>;
  getAllSubstituteDrivers(): Promise<Array<SubstituteDriver & { vehicleNumber: string }>>;
  deleteSubstituteDriver(id: number): Promise<void>;

  // QR Code validation operations
  checkQrCodeExists(qrCode: string, excludeVehicleId?: number, excludeDriverId?: number): Promise<{ exists: boolean; type: 'vehicle' | 'driver' | null; name: string | null }>;

  // Weekly summary operations
  getDriverAggregatesForDateRange(startDate: string, endDate: string): Promise<Array<{
    driverId: number;
    driverName: string;
    totalRent: number;
    totalCollection: number;
    totalFuel: number;
    tripCount: number;
  }>>;
  upsertWeeklySummary(summary: UpsertWeeklySummary): Promise<WeeklySummary>;
  getWeeklySummary(driverId: number, startDate: string, endDate: string): Promise<WeeklySummary | undefined>;
  clearWeeklySummary(driverId: number, startDate: string, endDate: string): Promise<void>;
  
  // Investment operations
  createInvestment(investment: InsertInvestment): Promise<Investment>;
  getInvestment(id: number): Promise<Investment | undefined>;
  getAllInvestments(): Promise<Array<Investment & { totalReturned: number; balance: number }>>;
  getInvestmentsByInvestor(): Promise<any[]>;
  updateInvestment(id: number, investment: UpdateInvestment): Promise<Investment>;
  deleteInvestment(id: number): Promise<void>;
  
  // Investment return operations
  createInvestmentReturn(investmentReturn: InsertInvestmentReturn): Promise<InvestmentReturn>;
  getInvestmentReturn(id: number): Promise<InvestmentReturn | undefined>;
  getInvestmentReturnsByInvestment(investmentId: number): Promise<InvestmentReturn[]>;
  updateInvestmentReturn(id: number, investmentReturn: UpdateInvestmentReturn): Promise<InvestmentReturn>;
  deleteInvestmentReturn(id: number): Promise<void>;
  
  // Meta operations
  getFirstTripDate(): Promise<string | null>;
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

  // Driver rent log operations
  async getRecentRentLogs(limit: number): Promise<Array<DriverRentLog & { driverName: string; vehicleNumber: string }>> {
    const result = await db.select({
      id: driverRentLogs.id,
      driverId: driverRentLogs.driverId,
      vehicleId: driverRentLogs.vehicleId,
      date: driverRentLogs.date,
      shift: driverRentLogs.shift,
      rent: driverRentLogs.rent,
      amountCollected: driverRentLogs.amountCollected,
      fuel: driverRentLogs.fuel,
      weekStart: driverRentLogs.weekStart,
      weekEnd: driverRentLogs.weekEnd,
      createdAt: driverRentLogs.createdAt,
      updatedAt: driverRentLogs.updatedAt,
      driverName: drivers.name,
      vehicleNumber: vehicles.vehicleNumber,
    }).from(driverRentLogs)
      .innerJoin(drivers, eq(driverRentLogs.driverId, drivers.id))
      .innerJoin(vehicles, eq(driverRentLogs.vehicleId, vehicles.id))
      .orderBy(desc(driverRentLogs.date))
      .limit(limit);
    
    return result;
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

  async updateDriverRentLog(id: number, rentLog: Partial<InsertDriverRentLog>): Promise<DriverRentLog> {
    const [result] = await db.update(driverRentLogs)
      .set({ ...rentLog, updatedAt: new Date() })
      .where(eq(driverRentLogs.id, id))
      .returning();
    return result;
  }

  async deleteDriverRentLog(id: number): Promise<void> {
    await db.delete(driverRentLogs).where(eq(driverRentLogs.id, id));
  }


  async getAllDriverRentLogs(): Promise<Array<DriverRentLog & { driverName: string; vehicleNumber: string }>> {
    // Get all rent logs with driver names
    const rentLogs = await db.select({
      id: driverRentLogs.id,
      driverId: driverRentLogs.driverId,
      date: driverRentLogs.date,
      shift: driverRentLogs.shift,
      rent: driverRentLogs.rent,
      amountCollected: driverRentLogs.amountCollected,
      fuel: driverRentLogs.fuel,
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
  async getTripDateBounds(): Promise<{min: string | null; max: string | null}> {
    const result = await db.execute(sql`
      SELECT 
        MIN(DATE(date))::text AS min_date, 
        MAX(DATE(date))::text AS max_date 
      FROM driver_rent_logs
    `);
    const row = result.rows?.[0];
    return { 
      min: row?.min_date ? String(row.min_date) : null, 
      max: row?.max_date ? String(row.max_date) : null 
    };
  }

  async listWeeklyWindows(): Promise<Array<{weekStart: string; weekEnd: string}>> {
    const { min, max } = await this.getTripDateBounds();
    if (!min || !max) return [];

    const result = await db.execute(sql`
      WITH bounds AS (
        SELECT
          (${min}::date - (EXTRACT(ISODOW FROM ${min}::date)::int - 1))::date AS week_start,
          (${max}::date - (EXTRACT(ISODOW FROM ${max}::date)::int - 1) + 6)::date AS week_end_all
      ),
      weeks AS (
        SELECT generate_series(
          (SELECT week_start FROM bounds),
          (SELECT week_end_all FROM bounds),
          interval '7 days'
        )::date AS week_start
      )
      SELECT 
        week_start::text, 
        (week_start + 6)::text AS week_end 
      FROM weeks 
      ORDER BY week_start ASC
    `);
    
    return (result.rows || []).map((r: any) => ({ 
      weekStart: String(r.week_start), 
      weekEnd: String(r.week_end) 
    }));
  }

  async aggregateWeek(weekStart: string, weekEnd: string): Promise<{
    weekStart: string;
    weekEnd: string;
    rent: number;
    wallet: number;
    companyRent: number | null;
    companyWallet: number | null;
    roomRent: number;
    profit: number | null;
  }> {
    // Get rent from driver_rent_logs
    const rentResult = await db.execute(sql`
      SELECT COALESCE(SUM(rent), 0)::int AS rent_sum
      FROM driver_rent_logs
      WHERE DATE(date) BETWEEN ${weekStart}::date AND ${weekEnd}::date
    `);
    const rent = Number(rentResult.rows?.[0]?.rent_sum) || 0;

    // Get wallet sum from weekly_summaries
    const walletResult = await db.execute(sql`
      SELECT COALESCE(SUM(total_earnings - cash + refund - expenses - 100), 0)::int AS wallet_sum
      FROM weekly_summaries
      WHERE start_date = ${weekStart}::date AND end_date = ${weekEnd}::date
    `);
    const wallet = Number(walletResult.rows?.[0]?.wallet_sum) || 0;

    // Get company fields from weekly_settlements
    const compResult = await db.execute(sql`
      SELECT company_rent, company_wallet
      FROM weekly_settlements
      WHERE week_start = ${weekStart}::date AND week_end = ${weekEnd}::date
    `);
    let companyRent: number | null = null;
    let companyWallet: number | null = null;
    const crow = compResult.rows?.[0];
    if (crow) {
      companyRent = crow.company_rent === null ? null : Number(crow.company_rent);
      companyWallet = crow.company_wallet === null ? null : Number(crow.company_wallet);
    }

    const ROOM_RENT = 4666;
    const canCalc = companyRent !== null && companyWallet !== null;
    const profit = canCalc ? (rent - wallet - (companyRent || 0) + (companyWallet || 0) - ROOM_RENT) : null;

    return { weekStart, weekEnd, rent, wallet, companyRent, companyWallet, roomRent: ROOM_RENT, profit };
  }

  async listWeeklySettlements(): Promise<Array<{
    weekStart: string;
    weekEnd: string;
    rent: number;
    wallet: number;
    companyRent: number | null;
    companyWallet: number | null;
    roomRent: number;
    profit: number | null;
  }>> {
    const weeks = await this.listWeeklyWindows();
    const rows = [];
    for (const w of weeks) {
      rows.push(await this.aggregateWeek(w.weekStart, w.weekEnd));
    }
    return rows;
  }

  async upsertWeeklySettlement(input: {weekStart: string; weekEnd: string; companyRent: number | null; companyWallet: number | null}): Promise<void> {
    const now = new Date();
    await db.execute(sql`
      INSERT INTO weekly_settlements (week_start, week_end, company_rent, company_wallet, created_at, updated_at)
      VALUES (${input.weekStart}::date, ${input.weekEnd}::date, ${input.companyRent}, ${input.companyWallet}, ${now}, ${now})
      ON CONFLICT (week_start, week_end) 
      DO UPDATE SET 
        company_rent = ${input.companyRent},
        company_wallet = ${input.companyWallet},
        updated_at = ${now}
    `);
  }

  async deleteWeeklySettlement(weekStart: string, weekEnd: string): Promise<void> {
    await db.execute(sql`
      DELETE FROM weekly_settlements 
      WHERE week_start = ${weekStart}::date AND week_end = ${weekEnd}::date
    `);
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

  // QR Code validation operations
  async checkQrCodeExists(qrCode: string, excludeVehicleId?: number, excludeDriverId?: number): Promise<{ exists: boolean; type: 'vehicle' | 'driver' | null; name: string | null }> {
    if (!qrCode || qrCode.trim() === '') {
      return { exists: false, type: null, name: null };
    }

    const trimmedQrCode = qrCode.trim();

    // Check if QR code exists in vehicles (excluding current vehicle if updating)
    const vehicleConditions = [eq(vehicles.qrCode, trimmedQrCode)];
    if (excludeVehicleId) {
      vehicleConditions.push(ne(vehicles.id, excludeVehicleId));
    }

    const [existingVehicle] = await db.select({
      id: vehicles.id,
      vehicleNumber: vehicles.vehicleNumber,
      qrCode: vehicles.qrCode
    }).from(vehicles).where(and(...vehicleConditions));
    if (existingVehicle) {
      return { 
        exists: true, 
        type: 'vehicle', 
        name: existingVehicle.vehicleNumber 
      };
    }

    // Check if QR code exists in drivers (excluding current driver if updating)
    const driverConditions = [eq(drivers.qrCode, trimmedQrCode)];
    if (excludeDriverId) {
      driverConditions.push(ne(drivers.id, excludeDriverId));
    }

    const [existingDriver] = await db.select({
      id: drivers.id,
      name: drivers.name,
      qrCode: drivers.qrCode
    }).from(drivers).where(and(...driverConditions));
    if (existingDriver) {
      return { 
        exists: true, 
        type: 'driver', 
        name: existingDriver.name 
      };
    }

    return { exists: false, type: null, name: null };
  }

  // Weekly summary operations
  async getDriverAggregatesForDateRange(startDate: string, endDate: string): Promise<Array<{
    driverId: number;
    driverName: string;
    totalRent: number;
    totalCollection: number;
    totalFuel: number;
    tripCount: number;
  }>> {
    const result = await db.select({
      driverId: driverRentLogs.driverId,
      driverName: drivers.name,
      totalRent: sql<number>`CAST(COALESCE(SUM(${driverRentLogs.rent}), 0) AS INTEGER)`,
      totalCollection: sql<number>`CAST(COALESCE(SUM(${driverRentLogs.amountCollected}), 0) AS INTEGER)`,
      totalFuel: sql<number>`CAST(COALESCE(SUM(${driverRentLogs.fuel}), 0) AS INTEGER)`,
      tripCount: sql<number>`CAST(COUNT(*) AS INTEGER)`,
    })
      .from(driverRentLogs)
      .innerJoin(drivers, eq(driverRentLogs.driverId, drivers.id))
      .where(
        sql`DATE(${driverRentLogs.date}) BETWEEN ${startDate} AND ${endDate}`
      )
      .groupBy(driverRentLogs.driverId, drivers.name)
      .orderBy(asc(drivers.name));

    return result;
  }

  async upsertWeeklySummary(summary: UpsertWeeklySummary): Promise<WeeklySummary> {
    const [result] = await db.insert(weeklySummaries)
      .values({
        driverId: summary.driverId,
        startDate: summary.startDate,
        endDate: summary.endDate,
        trips: summary.trips || 0,
        totalEarnings: summary.totalEarnings || 0,
        cash: summary.cash || 0,
        refund: summary.refund || 0,
        expenses: summary.expenses || 0,
        dues: summary.dues || 0,
        payout: summary.payout || 0,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [weeklySummaries.driverId, weeklySummaries.startDate, weeklySummaries.endDate],
        set: {
          trips: summary.trips || 0,
          totalEarnings: summary.totalEarnings || 0,
          cash: summary.cash || 0,
          refund: summary.refund || 0,
          expenses: summary.expenses || 0,
          dues: summary.dues || 0,
          payout: summary.payout || 0,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  }

  async getWeeklySummary(driverId: number, startDate: string, endDate: string): Promise<WeeklySummary | undefined> {
    const [result] = await db.select()
      .from(weeklySummaries)
      .where(
        and(
          eq(weeklySummaries.driverId, driverId),
          eq(weeklySummaries.startDate, startDate),
          eq(weeklySummaries.endDate, endDate)
        )
      );

    return result || undefined;
  }

  async clearWeeklySummary(driverId: number, startDate: string, endDate: string): Promise<void> {
    await db.delete(weeklySummaries)
      .where(
        and(
          eq(weeklySummaries.driverId, driverId),
          eq(weeklySummaries.startDate, startDate),
          eq(weeklySummaries.endDate, endDate)
        )
      );
  }

  // Investment operations
  async createInvestment(investment: InsertInvestment): Promise<Investment> {
    const [result] = await db.insert(investments).values(investment).returning();
    return result;
  }

  async getInvestment(id: number): Promise<Investment | undefined> {
    const [result] = await db.select().from(investments).where(eq(investments.id, id));
    return result || undefined;
  }

  async getAllInvestments(): Promise<Array<Investment & { totalReturned: number; balance: number }>> {
    const allInvestments = await db.select().from(investments).orderBy(desc(investments.paymentGivenDate));
    
    const investmentsWithReturns = await Promise.all(
      allInvestments.map(async (investment) => {
        const returns = await db
          .select()
          .from(investmentReturns)
          .where(eq(investmentReturns.investmentId, investment.id));
        
        const totalReturned = returns.reduce((sum, ret) => sum + ret.amountReturned, 0);
        const balance = investment.amountInvested - totalReturned;
        
        return {
          ...investment,
          totalReturned,
          balance,
        };
      })
    );
    
    return investmentsWithReturns;
  }

  async getInvestmentsByInvestor(): Promise<any[]> {
    // Get all investments
    const allInvestments = await db.select().from(investments).orderBy(investments.investorName, desc(investments.paymentGivenDate));
    
    // Get all returns
    const allReturns = await db.select().from(investmentReturns).orderBy(desc(investmentReturns.returnDate));
    
    // Group by investor name
    const investorMap = new Map<string, any>();
    
    for (const investment of allInvestments) {
      if (!investorMap.has(investment.investorName)) {
        investorMap.set(investment.investorName, {
          investorName: investment.investorName,
          investments: [],
          returns: [],
          totalInvested: 0,
          totalReturned: 0,
          balance: 0,
        });
      }
      
      const investor = investorMap.get(investment.investorName)!;
      investor.investments.push(investment);
      investor.totalInvested += investment.amountInvested;
    }
    
    // Add returns to each investor
    for (const ret of allReturns) {
      // Find which investment this return belongs to
      const investment = allInvestments.find(inv => inv.id === ret.investmentId);
      if (investment) {
        const investor = investorMap.get(investment.investorName);
        if (investor) {
          investor.returns.push({
            ...ret,
            investmentId: ret.investmentId,
            investmentDate: investment.paymentGivenDate,
          });
          investor.totalReturned += ret.amountReturned;
        }
      }
    }
    
    // Calculate balance for each investor
    for (const investor of investorMap.values()) {
      investor.balance = investor.totalInvested - investor.totalReturned;
    }
    
    return Array.from(investorMap.values());
  }

  async updateInvestment(id: number, investment: UpdateInvestment): Promise<Investment> {
    const [result] = await db.update(investments)
      .set(investment)
      .where(eq(investments.id, id))
      .returning();
    return result;
  }

  async deleteInvestment(id: number): Promise<void> {
    await db.delete(investments).where(eq(investments.id, id));
  }

  // Investment return operations
  async createInvestmentReturn(investmentReturn: InsertInvestmentReturn): Promise<InvestmentReturn> {
    const [result] = await db.insert(investmentReturns).values(investmentReturn).returning();
    return result;
  }

  async getInvestmentReturn(id: number): Promise<InvestmentReturn | undefined> {
    const [result] = await db.select().from(investmentReturns).where(eq(investmentReturns.id, id));
    return result || undefined;
  }

  async getInvestmentReturnsByInvestment(investmentId: number): Promise<InvestmentReturn[]> {
    return await db
      .select()
      .from(investmentReturns)
      .where(eq(investmentReturns.investmentId, investmentId))
      .orderBy(desc(investmentReturns.returnDate));
  }

  async updateInvestmentReturn(id: number, investmentReturn: UpdateInvestmentReturn): Promise<InvestmentReturn> {
    const [result] = await db.update(investmentReturns)
      .set(investmentReturn)
      .where(eq(investmentReturns.id, id))
      .returning();
    return result;
  }

  async deleteInvestmentReturn(id: number): Promise<void> {
    await db.delete(investmentReturns).where(eq(investmentReturns.id, id));
  }

  // Meta operations
  async getFirstTripDate(): Promise<string | null> {
    const result = await db.execute(sql`SELECT MIN(DATE(date)) AS min_date FROM driver_rent_logs`);
    const rows = Array.isArray(result) ? result : result.rows;
    const min = rows?.[0]?.min_date;
    return min ? String(min) : null;
  }
}

export const storage = new DatabaseStorage();
