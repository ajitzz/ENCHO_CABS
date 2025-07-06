import fs from 'fs';

// Read and parse the JSON files
const trips = JSON.parse(fs.readFileSync('attached_assets/trips_1751763244863.json', 'utf8'));
const driverRentLogs = JSON.parse(fs.readFileSync('attached_assets/driver_rent_logs_1751763244863.json', 'utf8'));
const substituteDrivers = JSON.parse(fs.readFileSync('attached_assets/substitute_drivers_1751763244863.json', 'utf8'));

// Generate SQL INSERT statements for trips
console.log('-- Insert trips');
console.log('INSERT INTO trips (id, driver_id, vehicle_id, trip_date, shift, trip_count) VALUES');
const tripValues = trips.map(trip => 
  `(${trip.id}, ${trip.driver_id}, ${trip.vehicle_id}, '${trip.trip_date}', '${trip.shift}', ${trip.trip_count})`
);
console.log(tripValues.join(',\n') + ';\n');

// Generate SQL INSERT statements for driver rent logs  
console.log('-- Insert driver rent logs');
console.log('INSERT INTO driver_rent_logs (id, driver_id, date, rent, paid) VALUES');
const rentLogValues = driverRentLogs.map(log => 
  `(${log.id}, ${log.driver_id}, '${log.date}', ${log.rent}, ${log.paid})`
);
console.log(rentLogValues.join(',\n') + ';\n');

// Generate SQL INSERT statements for substitute drivers
console.log('-- Insert substitute drivers');
console.log('INSERT INTO substitute_drivers (id, name, vehicle_id, date, shift, shift_hours, charge) VALUES');
const substituteValues = substituteDrivers.map(sub => 
  `(${sub.id}, '${sub.name}', ${sub.vehicle_id}, '${sub.date}', '${sub.shift}', ${sub.shift_hours}, ${sub.charge})`
);
console.log(substituteValues.join(',\n') + ';');