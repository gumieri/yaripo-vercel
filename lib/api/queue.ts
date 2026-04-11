import { Hono } from "hono"
import { eq, and, asc, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { sectorQueues, athletes } from "@/lib/db/schema"
import { authMiddleware, requireAuth, requireRole } from "@/lib/api/middleware/auth"

const queueRoutes = new Hono()

queueRoutes.post("/join", authMiddleware, requireAuth(), async (c) => {
  const body = await c.req.json()
  const { sectorId, athleteId } = body

  if (!sectorId || !athleteId) {
    return c.json(
      {
        success: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "sector_id and athlete_id required",
        },
      },
      400,
    )
  }

  const existing = await db
    .select()
    .from(sectorQueues)
    .where(
      and(
        eq(sectorQueues.athleteId, athleteId),
        sql`${sectorQueues.status} IN ('waiting', 'active')`,
      ),
    )

  if (existing.length > 0) {
    return c.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: "Athlete is already in a queue",
        },
      },
      409,
    )
  }

  const [queue] = await db
    .insert(sectorQueues)
    .values({ sectorId, athleteId, status: "waiting" })
    .returning()

  return c.json({ success: true, data: queue }, 201)
})

queueRoutes.post("/pop", authMiddleware, requireRole("judge", "admin"), async (c) => {
  const body = await c.req.json()
  const { sectorId } = body

  if (!sectorId) {
    return c.json(
      {
        success: false,
        error: { code: "VALIDATION_FAILED", message: "sector_id required" },
      },
      400,
    )
  }

  const [queueEntry] = await db
    .select()
    .from(sectorQueues)
    .where(and(eq(sectorQueues.sectorId, sectorId), eq(sectorQueues.status, "waiting")))
    .orderBy(asc(sectorQueues.createdAt))
    .limit(1)

  if (!queueEntry) {
    return c.json({ success: true, data: null })
  }

  const [updated] = await db
    .update(sectorQueues)
    .set({ status: "active" })
    .where(eq(sectorQueues.id, queueEntry.id))
    .returning()

  const [athlete] = await db.select().from(athletes).where(eq(athletes.id, updated.athleteId))

  return c.json({
    success: true,
    data: {
      id: updated.id,
      athlete: athlete ? { id: athlete.id, name: athlete.name } : null,
      status: updated.status,
    },
  })
})

queueRoutes.post("/drop", authMiddleware, requireRole("judge", "admin"), async (c) => {
  const body = await c.req.json()
  const { queueId } = body

  if (!queueId) {
    return c.json(
      {
        success: false,
        error: { code: "VALIDATION_FAILED", message: "queue_id required" },
      },
      400,
    )
  }

  const [updated] = await db
    .update(sectorQueues)
    .set({ status: "dropped" })
    .where(eq(sectorQueues.id, queueId))
    .returning()

  if (!updated) {
    return c.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Queue entry not found" },
      },
      404,
    )
  }

  return c.json({ success: true, data: updated })
})

queueRoutes.get("/status", authMiddleware, requireAuth(), async (c) => {
  const sectorId = c.req.query("sector_id")

  if (!sectorId) {
    return c.json(
      {
        success: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "sector_id query param required",
        },
      },
      400,
    )
  }

  const queue = await db
    .select({
      id: sectorQueues.id,
      athleteId: sectorQueues.athleteId,
      athleteName: athletes.name,
      status: sectorQueues.status,
      createdAt: sectorQueues.createdAt,
    })
    .from(sectorQueues)
    .innerJoin(athletes, eq(sectorQueues.athleteId, athletes.id))
    .where(
      and(
        eq(sectorQueues.sectorId, sectorId),
        sql`${sectorQueues.status} IN ('waiting', 'active')`,
      ),
    )
    .orderBy(asc(sectorQueues.createdAt))

  return c.json({ success: true, data: queue }, 200, {
    "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
  })
})

export { queueRoutes }
