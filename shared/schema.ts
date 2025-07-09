import { pgTable, text, serial, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull().unique(),
  company: text("company").notNull(), // "PMV" or "Letzryd"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  hasAccommodation: boolean("has_accommodation").notNull().default(false),
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

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull(),
  vehicleId: integer("vehicle_id").notNull(),
  tripDate: timestamp("trip_date").notNull(),
  shift: text("shift").notNull(), // "morning" or "evening"
  tripCount: integer("trip_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
});

export const driverRentLogs = pgTable("driver_rent_logs", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull(),
  vehicleId: integer("vehicle_id").notNull(),
  date: timestamp("date").notNull(),
  rent: integer("rent").notNull(),
  paid: boolean("paid").notNull().default(false),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const weeklySettlements = pgTable("weekly_settlements", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull(),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
  totalTrips: integer("total_trips").notNull().default(0),
  rentalRate: integer("rental_rate").notNull(),
  totalRentToCompany: integer("total_rent_to_company").notNull(),
  driver1Data: json("driver1_data"), // { id: number, rent: number }
  driver2Data: json("driver2_data"), // { id: number, rent: number }
  totalDriverRent: integer("total_driver_rent").notNull(),
  profit: integer("profit").notNull(),
  paid: boolean("paid").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

// Relations
export const vehiclesRelations = relations(vehicles, ({ many, one }) => ({
  trips: many(trips),
  assignments: one(vehicleDriverAssignments, {
    fields: [vehicles.id],
    references: [vehicleDriverAssignments.vehicleId],
  }),
  weeklySettlements: many(weeklySettlements),
  substituteDrivers: many(substituteDrivers),
}));

export const driversRelations = relations(drivers, ({ many }) => ({
  trips: many(trips),
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

export const tripsRelations = relations(trips, ({ one }) => ({
  driver: one(drivers, {
    fields: [trips.driverId],
    references: [drivers.id],
  }),
  vehicle: one(vehicles, {
    fields: [trips.vehicleId],
    references: [vehicles.id],
  }),
}));

export const driverRentLogsRelations = relations(driverRentLogs, ({ one }) => ({
  driver: one(drivers, {
    fields: [driverRentLogs.driverId],
    references: [drivers.id],
  }),
}));

export const weeklySettlementsRelations = relations(weeklySettlements, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [weeklySettlements.vehicleId],
    references: [vehicles.id],
  }),
}));

export const substituteDriversRelations = relations(substituteDrivers, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [substituteDrivers.vehicleId],
    references: [vehicles.id],
  }),
}));

// Insert schemas
export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDriverSchema = createInsertSchema(drivers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVehicleDriverAssignmentSchema = createInsertSchema(vehicleDriverAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDriverRentLogSchema = createInsertSchema(driverRentLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWeeklySettlementSchema = createInsertSchema(weeklySettlements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubstituteDriverSchema = createInsertSchema(substituteDrivers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.coerce.date(),
});

// Types
export type Vehicle = typeof vehicles.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type VehicleDriverAssignment = typeof vehicleDriverAssignments.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type DriverRentLog = typeof driverRentLogs.$inferSelect;
export type WeeklySettlement = typeof weeklySettlements.$inferSelect;
export type SubstituteDriver = typeof substituteDrivers.$inferSelect;

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type InsertVehicleDriverAssignment = z.infer<typeof insertVehicleDriverAssignmentSchema>;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type InsertDriverRentLog = z.infer<typeof insertDriverRentLogSchema>;
export type InsertWeeklySettlement = z.infer<typeof insertWeeklySettlementSchema>;
export type InsertSubstituteDriver = z.infer<typeof insertSubstituteDriverSchema>;
