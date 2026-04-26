import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"
import * as schema from "./schema"
import { validateEnv } from "@/lib/config/validate"

// Validate environment at startup
validateEnv()

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
})

export const db = drizzle(pool, { schema })
