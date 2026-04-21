import { Hono } from "hono"
import { eq, and, asc, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { sectorQueues, athletes, sectors, categories } from "@/lib/db/schema"
import { authMiddleware, requireAuth, requireRole } from "@/lib/api/middleware/auth"
import { joinQueueSchema, popQueueSchema, dropQueueSchema } from "@/lib/api/validations"
import { validationErrorResponse, notFoundResponse, conflictResponse } from "@/lib/api/helpers"

const queueRoutes = new Hono()

queueRoutes.post("/join", authMiddleware, requireAuth(), async (c) => {
  const userId = c.get("userId")!
  const body = await c.req.json()

  const result = joinQueueSchema.safeParse(body)
  if (!result.success) {
    return validationErrorResponse(c, result.error.issues[0].message)
  }

  const { sectorId, athleteId: bodyAthleteId } = result.data

  let athleteId = bodyAthleteId

  if (!athleteId) {
    const [sector] = await db
      .select({ eventId: sectors.eventId })
      .from(sectors)
      .where(eq(sectors.id, sectorId))

    if (!sector) {
      return notFoundResponse(c, "Sector")
    }

    const [athlete] = await db
      .select({ id: athletes.id })
      .from(athletes)
      .innerJoin(categories, eq(athletes.categoryId, categories.id))
      .where(and(eq(athletes.userId, userId), eq(categories.eventId, sector.eventId)))

    if (!athlete) {
      return notFoundResponse(c, "Athlete registration for this event")
    }

    athleteId = athlete.id
  }

  const existing = await db
    .select()
    .from(sectorQueues)
    .where(
      and(
        eq(sectorQueues.athleteId, athleteId),
        inArray(sectorQueues.status, ["waiting", "active"]),
      ),
    )

  if (existing.length > 0) {
    return conflictResponse(c, "Athlete is already in a queue")
  }

  const [queue] = await db
    .insert(sectorQueues)
    .values({ sectorId, athleteId, status: "waiting" })
    .returning()

  return c.json({ success: true, data: queue }, 201)
})

queueRoutes.post("/pop", authMiddleware, requireRole("judge", "admin"), async (c) => {
  const body = await c.req.json()

  const result = popQueueSchema.safeParse(body)
  if (!result.success) {
    return validationErrorResponse(c, result.error.issues[0].message)
  }

  const { sectorId } = result.data

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
    .where(
      and(eq(sectorQueues.id, queueEntry.id), eq(sectorQueues.status, "waiting")),
    )
    .returning()

  if (!updated) {
    return c.json({ success: true, data: null })
  }

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

  const result = dropQueueSchema.safeParse(body)
  if (!result.success) {
    return validationErrorResponse(c, result.error.issues[0].message)
  }

  const { queueId } = result.data

  const [updated] = await db
    .update(sectorQueues)
    .set({ status: "dropped" })
    .where(eq(sectorQueues.id, queueId))
    .returning()

  if (!updated) {
    return notFoundResponse(c, "Queue entry")
  }

  return c.json({ success: true, data: updated })
})

queueRoutes.get("/status", authMiddleware, requireAuth(), async (c) => {
  const sectorId = c.req.query("sector_id")

  if (!sectorId) {
    return validationErrorResponse(c, "sector_id query param required")
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
        inArray(sectorQueues.status, ["waiting", "active"]),
      ),
    )
    .orderBy(asc(sectorQueues.createdAt))

  return c.json({ success: true, data: queue }, 200, {
    "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
  })
})

export { queueRoutes }
