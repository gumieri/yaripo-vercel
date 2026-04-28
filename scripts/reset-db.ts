import { Client } from "pg"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const client = new Client({
  connectionString: process.env.DATABASE_URL,
})

async function resetDatabase() {
  try {
    await client.connect()
    console.log("Connected to database")

    // Step 1: Run reset script
    console.log("Step 1: Dropping all tables and data...")
    const resetSql = fs.readFileSync(path.join(__dirname, "../drizzle/0000_reset.sql"), "utf8")
    await client.query(resetSql)
    console.log("✓ Reset complete")

    // Step 2: Run all migrations in order
    console.log("Step 2: Running migrations...")
    const migrations = [
      "0000_elite_barracuda.sql",
      "0001_low_betty_ross.sql",
      "0002_lyrical_synch.sql",
      "0003_event_roles.sql",
    ]

    for (const migration of migrations) {
      console.log(`  Applying ${migration}...`)
      const sql = fs.readFileSync(path.join(__dirname, "../drizzle", migration), "utf8")
      await client.query(sql)
      console.log(`  ✓ ${migration} applied`)
    }

    console.log("✓ All migrations applied")

    // Step 3: Run seed script
    console.log("Step 3: Seeding database...")
    const seedSql = fs.readFileSync(path.join(__dirname, "../lib/db/seed/run.ts"), "utf8")
    // The seed script is TypeScript, so we need to execute it differently
    // For now, we'll just note that seeding needs to be done separately
    console.log("⚠ Seed script needs to be run separately (it's TypeScript)")
    console.log("  Run: pnpm db:seed")

    console.log("\n✅ Database reset complete!")
    console.log("Next steps:")
    console.log("  1. Run: pnpm db:seed")
    console.log("  2. Test login at https://yaripo.app/login")
  } catch (error) {
    console.error("❌ Error during reset:", error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

resetDatabase()
