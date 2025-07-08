import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from './shared/schema.ts';
import fs from 'fs';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function importUserData() {
  try {
    console.log('Starting data import...');

    // Read and import vehicles
    const vehiclesData = JSON.parse(fs.readFileSync('./attached_assets/vehicles-3_1752005103906.json', 'utf8'));
    console.log(`Importing ${vehiclesData.length} vehicles...`);
    for (const vehicle of vehiclesData) {
      await db.insert(schema.vehicles).values({
        id: vehicle.id,
        vehicleNumber: vehicle.vehicle_number,
        company: vehicle.company
      }).onConflictDoNothing();
    }

    // Read and import drivers  
    const driversData = JSON.parse(fs.readFileSync('./attached_assets/drivers-3_1752005103906.json', 'utf8'));
    console.log(`Importing ${driversData.length} drivers...`);
    for (const driver of driversData) {
      await db.insert(schema.drivers).values({
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        hasAccommodation: driver.has_accommodation
      }).onConflictDoNothing();
    }

    // Read and import trips
    const tripsData = JSON.parse(fs.readFileSync('./attached_assets/trips-3_1752005103906.json', 'utf8'));
    console.log(`Importing ${tripsData.length} trips...`);
    for (const trip of tripsData) {
      await db.insert(schema.trips).values({
        id: trip.id,
        driverId: trip.driver_id,
        vehicleId: trip.vehicle_id,
        tripDate: new Date(trip.trip_date),
        shift: trip.shift,
        tripCount: trip.trip_count
      }).onConflictDoNothing();
    }

    // Read and import driver rent logs
    const rentLogsData = JSON.parse(fs.readFileSync('./attached_assets/driver_rent_logs-3_1752005103905.json', 'utf8'));
    console.log(`Importing ${rentLogsData.length} rent logs...`);
    for (const rentLog of rentLogsData) {
      await db.insert(schema.driverRentLogs).values({
        id: rentLog.id,
        driverId: rentLog.driver_id,
        date: new Date(rentLog.date),
        rent: rentLog.rent,
        paid: rentLog.paid
      }).onConflictDoNothing();
    }

    // Read and import substitute drivers
    const substituteData = JSON.parse(fs.readFileSync('./attached_assets/substitute_drivers-3_1752005103906.json', 'utf8'));
    console.log(`Importing ${substituteData.length} substitute drivers...`);
    for (const substitute of substituteData) {
      await db.insert(schema.substituteDrivers).values({
        id: substitute.id,
        name: substitute.name,
        vehicleId: substitute.vehicle_id,
        date: new Date(substitute.date),
        shift: substitute.shift,
        shiftHours: substitute.shift_hours,
        tripCount: substitute.trip_count,
        charge: substitute.charge
      }).onConflictDoNothing();
    }

    // Read and import vehicle driver assignments
    const assignmentsData = JSON.parse(fs.readFileSync('./attached_assets/vehicle_driver_assignments-2_1751922573457.json', 'utf8'));
    console.log(`Importing ${assignmentsData.length} vehicle driver assignments...`);
    for (const assignment of assignmentsData) {
      await db.insert(schema.vehicleDriverAssignments).values({
        id: assignment.id,
        vehicleId: assignment.vehicle_id,
        morningDriverId: assignment.morning_driver_id,
        eveningDriverId: assignment.evening_driver_id
      }).onConflictDoNothing();
    }

    console.log('Data import completed successfully!');
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importUserData();