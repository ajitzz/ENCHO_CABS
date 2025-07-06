import { db } from "./db.js";
import { vehicles, drivers, vehicleDriverAssignments, trips, driverRentLogs, substituteDrivers } from "../shared/schema.js";
import fs from 'fs';
import path from 'path';

// Import data from JSON files
const vehiclesData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'attached_assets', 'vehicles_1751763244863.json'), 'utf8'));
const driversData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'attached_assets', 'drivers_1751763244863.json'), 'utf8'));
const vehicleDriverAssignmentsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'attached_assets', 'vehicle_driver_assignments_1751763244863.json'), 'utf8'));
const tripsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'attached_assets', 'trips_1751763244863.json'), 'utf8'));
const driverRentLogsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'attached_assets', 'driver_rent_logs_1751763244863.json'), 'utf8'));
const substituteDriversData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'attached_assets', 'substitute_drivers_1751763244863.json'), 'utf8'));

async function importUserData() {
  console.log('Starting data import...');
  
  try {
    // Clear existing data
    await db.delete(substituteDrivers);
    await db.delete(driverRentLogs);
    await db.delete(trips);
    await db.delete(vehicleDriverAssignments);
    await db.delete(drivers);
    await db.delete(vehicles);
    console.log('Cleared existing data');

    // Import vehicles
    for (const vehicle of vehiclesData) {
      await db.insert(vehicles).values({
        id: vehicle.id,
        vehicleNumber: vehicle.vehicle_number,
        company: vehicle.company as "PMV" | "Letzryd"
      });
    }
    console.log(`Imported ${vehiclesData.length} vehicles`);

    // Import drivers
    for (const driver of driversData) {
      await db.insert(drivers).values({
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        hasAccommodation: driver.has_accommodation
      });
    }
    console.log(`Imported ${driversData.length} drivers`);

    // Import vehicle driver assignments
    for (const assignment of vehicleDriverAssignmentsData) {
      await db.insert(vehicleDriverAssignments).values({
        id: assignment.id,
        vehicleId: assignment.vehicle_id,
        morningDriverId: assignment.morning_driver_id,
        eveningDriverId: assignment.evening_driver_id
      });
    }
    console.log(`Imported ${vehicleDriverAssignmentsData.length} vehicle driver assignments`);

    // Import trips
    for (const trip of tripsData) {
      await db.insert(trips).values({
        id: trip.id,
        driverId: trip.driver_id,
        vehicleId: trip.vehicle_id,
        tripDate: new Date(trip.trip_date),
        shift: trip.shift as "morning" | "evening",
        tripCount: trip.trip_count
      });
    }
    console.log(`Imported ${tripsData.length} trips`);

    // Import driver rent logs
    for (const rentLog of driverRentLogsData) {
      await db.insert(driverRentLogs).values({
        id: rentLog.id,
        driverId: rentLog.driver_id,
        date: new Date(rentLog.date),
        rent: rentLog.rent,
        paid: rentLog.paid
      });
    }
    console.log(`Imported ${driverRentLogsData.length} driver rent logs`);

    // Import substitute drivers
    for (const substitute of substituteDriversData) {
      await db.insert(substituteDrivers).values({
        id: substitute.id,
        name: substitute.name,
        vehicleId: substitute.vehicle_id,
        date: new Date(substitute.date),
        shift: substitute.shift as "morning" | "evening",
        shiftHours: substitute.shift_hours as 6 | 8 | 12,
        charge: substitute.charge
      });
    }
    console.log(`Imported ${substituteDriversData.length} substitute drivers`);

    console.log('Data import completed successfully!');
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  }
}

importUserData().then(() => process.exit(0));