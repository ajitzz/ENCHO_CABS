import fs from 'fs';
import pkg from 'pg';
const { Pool } = pkg;

async function importRentLogs() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Read the JSON file
    const jsonData = fs.readFileSync('attached_assets/driver_rent_logs-3_1752128135719.json', 'utf8');
    const rentLogs = JSON.parse(jsonData);

    console.log(`Importing ${rentLogs.length} rent log records...`);

    // Insert each rent log
    for (const log of rentLogs) {
      const logDate = new Date(log.date);
      const weekStart = new Date(logDate);
      weekStart.setDate(logDate.getDate() - logDate.getDay()); // Start of week (Sunday)
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
      
      await pool.query(
        `INSERT INTO driver_rent_logs (id, driver_id, vehicle_id, date, rent, paid, created_at, updated_at, week_start, week_end)
         VALUES ($1, $2, (
           SELECT t.vehicle_id FROM trips t 
           WHERE t.driver_id = $2 AND DATE(t.trip_date) = DATE($3::timestamp)
           LIMIT 1
         ), $3, $4, $5, $6, $7, $8, $9)`,
        [
          log.id,
          log.driver_id,
          log.date,
          log.rent,
          log.paid,
          log.created_at,
          log.updated_at,
          weekStart.toISOString(),
          weekEnd.toISOString()
        ]
      );
    }

    console.log('Import completed successfully!');
    
    // Verify the import
    const result = await pool.query('SELECT COUNT(*) FROM driver_rent_logs');
    console.log(`Total rent logs in database: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('Error importing rent logs:', error);
  } finally {
    await pool.end();
  }
}

importRentLogs();