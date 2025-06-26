// this is just a comment 
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Good for Neon
});

pool.connect()
.then(() => {
  console.log("✅ Connected to PostgreSQL successfully!");
})
.catch((err) => {
  console.error("❌ Failed to connect to PostgreSQL:", err);
});


export const db = drizzle(pool, { schema });