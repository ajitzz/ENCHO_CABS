import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Reset all database sequences to match the current maximum IDs
 * This prevents "duplicate key value violates unique constraint" errors
 * that can occur after importing data manually
 */
export async function resetAllSequences() {
  const tables = [
    { table: 'vehicles', sequence: 'vehicles_id_seq' },
    { table: 'drivers', sequence: 'drivers_id_seq' },
    { table: 'vehicle_driver_assignments', sequence: 'vehicle_driver_assignments_id_seq' },
    { table: 'trips', sequence: 'trips_id_seq' },
    { table: 'driver_rent_logs', sequence: 'driver_rent_logs_id_seq' },
    { table: 'weekly_settlements', sequence: 'weekly_settlements_id_seq' },
    { table: 'substitute_drivers', sequence: 'substitute_drivers_id_seq' }
  ];

  const results = [];
  
  for (const { table, sequence } of tables) {
    try {
      // Get the current maximum ID
      const maxResult = await db.execute(sql.raw(`SELECT MAX(id) FROM ${table}`));
      const maxId = maxResult.rows[0]?.[0] || 0;
      
      // Reset the sequence to the maximum ID
      await db.execute(sql.raw(`SELECT setval('${sequence}', ${maxId})`));
      
      console.log(`Reset ${sequence}: max ID = ${maxId}`);
      results.push({ table, sequence, maxId, success: true });
    } catch (error) {
      console.error(`Failed to reset sequence for ${table}:`, error);
      results.push({ table, sequence, error: error.message, success: false });
    }
  }
  
  return results;
}

/**
 * Check if any sequences are out of sync
 */
export async function checkSequenceSync() {
  const tables = [
    { table: 'vehicles', sequence: 'vehicles_id_seq' },
    { table: 'drivers', sequence: 'drivers_id_seq' },
    { table: 'vehicle_driver_assignments', sequence: 'vehicle_driver_assignments_id_seq' },
    { table: 'trips', sequence: 'trips_id_seq' },
    { table: 'driver_rent_logs', sequence: 'driver_rent_logs_id_seq' },
    { table: 'weekly_settlements', sequence: 'weekly_settlements_id_seq' },
    { table: 'substitute_drivers', sequence: 'substitute_drivers_id_seq' }
  ];

  const issues = [];
  
  for (const { table, sequence } of tables) {
    try {
      const maxResult = await db.execute(sql.raw(`SELECT MAX(id) FROM ${table}`));
      const maxId = maxResult.rows[0]?.[0] || 0;
      
      const seqResult = await db.execute(sql.raw(`SELECT last_value FROM ${sequence}`));
      const lastValue = seqResult.rows[0]?.[0] || 0;
      
      if (lastValue < maxId) {
        issues.push({ table, sequence, maxId, lastValue, outOfSync: true });
      }
    } catch (error) {
      issues.push({ table, sequence, error: error.message });
    }
  }
  
  return issues;
}