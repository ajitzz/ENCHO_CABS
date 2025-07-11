import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with better error handling and connection settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  maxUses: 1000,
  allowExitOnIdle: false
});

export const db = drizzle({ client: pool, schema });

// Handle connection errors gracefully
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Handle process exit to close connections properly
process.on('exit', () => {
  pool.end();
});

process.on('SIGINT', () => {
  pool.end();
  process.exit(0);
});

process.on('SIGTERM', () => {
  pool.end();
  process.exit(0);
});