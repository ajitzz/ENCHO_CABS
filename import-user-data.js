import { readFileSync } from 'fs';
import { db } from './server/db.ts';
import { vehicles, drivers, vehicleDriverAssignments, trips, driverRentLogs, substituteDrivers } from './shared/schema.ts';

async function importUserData() {
  try {
    console.log('Starting data import...');

    // Read the JSON files
    const vehiclesData = JSON.parse(readFileSync('./attached_assets/vehicles-2_1751922573457.json', 'utf8'));
    const driversData = JSON.parse(readFileSync('./attached_assets/drivers-2_1751922573457.json', 'utf8'));
    const assignmentsData = JSON.parse(readFileSync('./attached_assets/vehicle_driver_assignments-2_1751922573457.json', 'utf8'));
    const tripsData = JSON.parse(readFileSync('./attached_assets/trips-2_1751922573457.json', 'utf8'));
    const rentLogsData = JSON.parse(readFileSync('./attached_assets/driver_rent_logs-2_1751922573455.json', 'utf8'));
    const substitutesData = JSON.parse(readFileSync('./attached_assets/substitute_drivers-2_1751922573457.json', 'utf8'));

    // Clear existing data (in reverse order due to foreign keys)
    console.log('Clearing existing data...');
    await db.delete(substituteDrivers);
    await db.delete(driverRentLogs);
    await db.delete(trips);
    await db.delete(vehicleDriverAssignments);
    await db.delete(drivers);
    await db.delete(vehicles);

    // Insert vehicles
    console.log('Importing vehicles...');
    for (const vehicle of vehiclesData) {
      await db.insert(vehicles).values({
        id: vehicle.id,
        vehicleNumber: vehicle.vehicle_number,
        company: vehicle.company,
        createdAt: new Date(vehicle.created_at),
        updatedAt: new Date(vehicle.updated_at)
      });
    }

    // Insert drivers
    console.log('Importing drivers...');
    for (const driver of driversData) {
      await db.insert(drivers).values({
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        hasAccommodation: driver.has_accommodation,
        createdAt: new Date(driver.created_at),
        updatedAt: new Date(driver.updated_at)
      });
    }

    // Insert vehicle driver assignments
    console.log('Importing vehicle driver assignments...');
    for (const assignment of assignmentsData) {
      await db.insert(vehicleDriverAssignments).values({
        id: assignment.id,
        vehicleId: assignment.vehicle_id,
        morningDriverId: assignment.morning_driver_id,
        eveningDriverId: assignment.evening_driver_id,
        createdAt: new Date(assignment.created_at),
        updatedAt: new Date(assignment.updated_at)
      });
    }

    // Insert trips
    console.log('Importing trips...');
    for (const trip of tripsData) {
      await db.insert(trips).values({
        id: trip.id,
        driverId: trip.driver_id,
        vehicleId: trip.vehicle_id,
        tripDate: new Date(trip.trip_date),
        shift: trip.shift,
        tripCount: trip.trip_count,
        createdAt: new Date(trip.created_at),
        updatedAt: new Date(trip.updated_at)
      });
    }

    // Insert driver rent logs
    console.log('Importing driver rent logs...');
    for (const rentLog of rentLogsData) {
      await db.insert(driverRentLogs).values({
        id: rentLog.id,
        driverId: rentLog.driver_id,
        date: new Date(rentLog.date),
        rent: rentLog.rent,
        paid: rentLog.paid,
        createdAt: new Date(rentLog.created_at),
        updatedAt: new Date(rentLog.updated_at)
      });
    }

    // Insert substitute drivers
    console.log('Importing substitute drivers...');
    for (const substitute of substitutesData) {
      await db.insert(substituteDrivers).values({
        id: substitute.id,
        name: substitute.name,
        vehicleId: substitute.vehicle_id,
        date: new Date(substitute.date),
        shift: substitute.shift,
        shiftHours: substitute.shift_hours,
        charge: substitute.charge,
        tripCount: substitute.trip_count,
        createdAt: new Date(substitute.created_at),
        updatedAt: new Date(substitute.updated_at)
      });
    }

    console.log('Data import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  }
}

importUserData();