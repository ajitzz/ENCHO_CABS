import { readFileSync } from 'fs';
import { storage } from './storage.js';
import { pool } from './db.js';

async function importData() {
  try {
    console.log('Starting data import...');
    
    // Read JSON files
    const driversData = JSON.parse(readFileSync('./attached_assets/drivers_1751747903940.json', 'utf8'));
    const tripsData = JSON.parse(readFileSync('./attached_assets/trips_1751747903940.json', 'utf8'));
    const rentLogsData = JSON.parse(readFileSync('./attached_assets/driver_rent_logs_1751747903940.json', 'utf8'));
    
    // Clear existing data
    await pool.query('DELETE FROM driver_rent_logs');
    await pool.query('DELETE FROM trips');
    await pool.query('DELETE FROM drivers');
    await pool.query('DELETE FROM vehicles');
    
    // Reset sequences
    await pool.query('ALTER SEQUENCE drivers_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE vehicles_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE trips_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE driver_rent_logs_id_seq RESTART WITH 1');
    
    // Create some vehicles first
    const vehicles = [
      { vehicleNumber: 'KA01AB1234', company: 'PMV' as const },
      { vehicleNumber: 'KA02CD5678', company: 'Letzryd' as const },
      { vehicleNumber: 'KA03EF9012', company: 'PMV' as const },
      { vehicleNumber: 'KA04GH3456', company: 'Letzryd' as const }
    ];
    
    for (const vehicle of vehicles) {
      await storage.createVehicle(vehicle);
    }
    
    // Import drivers
    console.log(`Importing ${driversData.length} drivers...`);
    for (const driver of driversData) {
      await storage.createDriver({
        name: driver.name,
        phone: driver.phone,
        hasAccommodation: driver.has_accommodation
      });
    }
    
    // Import trips
    console.log(`Importing ${tripsData.length} trips...`);
    for (const trip of tripsData) {
      // Map vehicle_id to available vehicles (1-4)
      const vehicleId = ((trip.vehicle_id - 1) % 4) + 1;
      
      await storage.createTrip({
        driverId: trip.driver_id,
        vehicleId: vehicleId,
        tripDate: new Date(trip.trip_date),
        shift: trip.shift,
        tripCount: trip.trip_count
      });
    }
    
    // Import driver rent logs
    console.log(`Importing ${rentLogsData.length} rent logs...`);
    for (const rentLog of rentLogsData) {
      await storage.createDriverRentLog({
        driverId: rentLog.driver_id,
        date: new Date(rentLog.date),
        rent: rentLog.rent,
        paid: rentLog.paid
      });
    }
    
    console.log('Data import completed successfully!');
    
  } catch (error) {
    console.error('Error importing data:', error);
  } finally {
    process.exit(0);
  }
}

importData();