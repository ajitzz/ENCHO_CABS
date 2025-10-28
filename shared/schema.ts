import { pgTable, text, serial, integer, boolean, timestamp, decimal, json, unique, date, primaryKey, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull().unique(),
  qrCode: text("qr_code"),
  company: text("company").notNull(), // "PMV" or "Letzryd"
  purchasedDate: date("purchased_date").notNull(),
  droppedDate: date("dropped_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  qrCode: text("qr_code"),
  hasAccommodation: boolean("has_accommodation").notNull().default(false),
  joinedDate: date("joined_date").notNull(),
  dismissDate: date("dismiss_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const vehicleDriverAssignments = pgTable("vehicle_driver_assignments", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull(),
  morningDriverId: integer("morning_driver_id"),
  eveningDriverId: integer("evening_driver_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const driverRentLogs = pgTable("driver_rent_logs", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull(),
  date: timestamp("date").notNull(),
  shift: text("shift").notNull(), // "morning" or "evening"
  rent: integer("rent").notNull(),
  amountCollected: integer("amount_collected").notNull().default(0),
  fuel: integer("fuel").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  vehicleId: integer("vehicle_id").notNull(),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
}, (table) => ({
  unique_driver_date_shift: unique("unique_driver_date_shift").on(table.driverId, table.date, table.shift)
}));

export const weeklySettlements = pgTable("weekly_settlements", {
  weekStart: date("week_start").notNull(),
  weekEnd: date("week_end").notNull(),
  companyRent: integer("company_rent"),
  companyWallet: integer("company_wallet"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.weekStart, t.weekEnd] }),
}));

export const substituteDrivers = pgTable("substitute_drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  vehicleId: integer("vehicle_id").notNull(),
  date: timestamp("date").notNull(),
  shift: text("shift").notNull(), // "morning" or "evening"
  shiftHours: integer("shift_hours").notNull(), // 6, 8, or 12
  tripCount: integer("trip_count").notNull(),
  charge: integer("charge").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const weeklySummaries = pgTable("weekly_summaries", {
  driverId: integer("driver_id").notNull(),
  startDate: date("start_date").notNull(), // inclusive
  endDate: date("end_date").notNull(),     // inclusive
  totalEarnings: integer("total_earnings").notNull().default(0),
  cash: integer("cash").notNull().default(0),
  refund: integer("refund").notNull().default(0),
  expenses: integer("expenses").notNull().default(0),
  dues: integer("dues").notNull().default(0),
  payout: integer("payout").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.driverId, t.startDate, t.endDate] }),
  byDriver: index("weekly_summaries_driver_idx").on(t.driverId),
}));

export const investments = pgTable("investments", {
  id: serial("id").primaryKey(),
  investorName: text("investor_name").notNull(),
  amountInvested: integer("amount_invested").notNull(),
  paymentGivenDate: date("payment_given_date").notNull(),
  paymentMethod: text("payment_method"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const investmentReturns = pgTable("investment_returns", {
  id: serial("id").primaryKey(),
  investmentId: integer("investment_id").notNull(),
  returnDate: date("return_date").notNull(),
  amountReturned: integer("amount_returned").notNull(),
  paymentMethod: text("payment_method"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  assignments: one(vehicleDriverAssignments, {
    fields: [vehicles.id],
    references: [vehicleDriverAssignments.vehicleId],
  }),
  substituteDrivers: many(substituteDrivers),
}));

export const driversRelations = relations(drivers, ({ many }) => ({
  rentLogs: many(driverRentLogs),
}));

export const vehicleDriverAssignmentsRelations = relations(vehicleDriverAssignments, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleDriverAssignments.vehicleId],
    references: [vehicles.id],
  }),
  morningDriver: one(drivers, {
    fields: [vehicleDriverAssignments.morningDriverId],
    references: [drivers.id],
  }),
  eveningDriver: one(drivers, {
    fields: [vehicleDriverAssignments.eveningDriverId],
    references: [drivers.id],
  }),
}));

export const driverRentLogsRelations = relations(driverRentLogs, ({ one }) => ({
  driver: one(drivers, {
    fields: [driverRentLogs.driverId],
    references: [drivers.id],
  }),
}));


export const substituteDriversRelations = relations(substituteDrivers, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [substituteDrivers.vehicleId],
    references: [vehicles.id],
  }),
}));

export const weeklySummariesRelations = relations(weeklySummaries, ({ one }) => ({
  driver: one(drivers, {
    fields: [weeklySummaries.driverId],
    references: [drivers.id],
  }),
}));

export const investmentsRelations = relations(investments, ({ many }) => ({
  returns: many(investmentReturns),
}));

export const investmentReturnsRelations = relations(investmentReturns, ({ one }) => ({
  investment: one(investments, {
    fields: [investmentReturns.investmentId],
    references: [investments.id],
  }),
}));

// Insert schemas
export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertDriverSchema = createInsertSchema(drivers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateDriverSchema = createInsertSchema(drivers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertVehicleDriverAssignmentSchema = createInsertSchema(vehicleDriverAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDriverRentLogSchema = createInsertSchema(driverRentLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.coerce.date(),
  weekStart: z.coerce.date(),
  weekEnd: z.coerce.date(),
});

export const upsertWeeklySettlementSchema = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
  companyRent: z.number().int().min(0).nullable().optional(),
  companyWallet: z.number().int().min(0).nullable().optional(),
});

export const insertSubstituteDriverSchema = createInsertSchema(substituteDrivers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.coerce.date(),
});

export const upsertWeeklySummarySchema = z.object({
  driverId: z.number().int().positive(),
  startDate: z.string(),
  endDate: z.string(),
  totalEarnings: z.number().int().min(0).default(0),
  cash: z.number().int().min(0).default(0),
  refund: z.number().int().min(0).default(0),
  expenses: z.number().int().min(0).default(0),
  dues: z.number().int().min(0).default(0),
  payout: z.number().int().min(0).default(0),
});

export const insertInvestmentSchema = createInsertSchema(investments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateInvestmentSchema = createInsertSchema(investments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertInvestmentReturnSchema = createInsertSchema(investmentReturns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateInvestmentReturnSchema = createInsertSchema(investmentReturns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

// Types
export type Vehicle = typeof vehicles.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type VehicleDriverAssignment = typeof vehicleDriverAssignments.$inferSelect;
export type DriverRentLog = typeof driverRentLogs.$inferSelect;
export type WeeklySettlement = typeof weeklySettlements.$inferSelect;
export type SubstituteDriver = typeof substituteDrivers.$inferSelect;
export type WeeklySummary = typeof weeklySummaries.$inferSelect;

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type UpdateVehicle = z.infer<typeof updateVehicleSchema>;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type UpdateDriver = z.infer<typeof updateDriverSchema>;
export type InsertVehicleDriverAssignment = z.infer<typeof insertVehicleDriverAssignmentSchema>;
export type InsertDriverRentLog = z.infer<typeof insertDriverRentLogSchema>;
export type UpsertWeeklySettlementInput = z.infer<typeof upsertWeeklySettlementSchema>;
export type InsertSubstituteDriver = z.infer<typeof insertSubstituteDriverSchema>;
export type UpsertWeeklySummary = z.infer<typeof upsertWeeklySummarySchema>;
export type Investment = typeof investments.$inferSelect;
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type UpdateInvestment = z.infer<typeof updateInvestmentSchema>;
export type InvestmentReturn = typeof investmentReturns.$inferSelect;
export type InsertInvestmentReturn = z.infer<typeof insertInvestmentReturnSchema>;
export type UpdateInvestmentReturn = z.infer<typeof updateInvestmentReturnSchema>;
