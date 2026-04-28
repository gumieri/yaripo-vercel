import { Hono } from "hono"
import { eq, and, asc, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { sectorQueues, athletes, sectors, categories, eventMembers } from "@/lib/db/schema"
import { authMiddleware, requireAuth } from "@/lib/api/middleware/auth"
import { joinQueueSchema, popQueueSchema, dropQueueSchema } from "@/lib/api/validations"
import {
  validationErrorResponse,
  notFoundResponse,
  conflictResponse,
  forbiddenResponse,
  cacheHeaders,
} from "@/lib/api/helpers"

const queueRoutes = new Hono()

queueRoutes.post("/join", authMiddleware, requireAuth, async (c) => {
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

queueRoutes.post("/pop", authMiddleware, requireAuth, async (c) => {
  const userId = c.get("userId")!
  const body = await c.req.json()

  const parseResult = popQueueSchema.safeParse(body)
  if (!parseResult.success) {
    return validationErrorResponse(c, parseResult.error.issues[0].message)
  }

  const { sectorId } = parseResult.data

  const [sector] = await db
    .select({ eventId: sectors.eventId })
    .from(sectors)
    .where(eq(sectors.id, sectorId))

  if (!sector) {
    return notFoundResponse(c, "Sector")
  }

  const [membership] = await db
    .select({ role: eventMembers.role })
    .from(eventMembers)
    .where(and(eq(eventMembers.eventId, sector.eventId), eq(eventMembers.userId, userId)))

  if (!membership || (membership.role !== "organizer" && membership.role !== "judge")) {
    return forbiddenResponse(c, "Judge access required")
  }

  const result = await db.transaction(async (tx) => {
    const queueResult = await tx.execute<{
      id: string
      athlete_id: string
      status: string
    }>(sql`
      UPDATE sector_queues
      SET status = 'active'
      WHERE id = (
        SELECT id FROM sector_queues
        WHERE sector_id = ${sectorId} AND status = 'waiting'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, athlete_id, status
    `)

    const row = queueResult.rows[0]

    if (!row) {
      return null
    }

    const [athlete] = await tx.select().from(athletes).where(eq(athletes.id, row.athlete_id))

    return { row, athlete }
  })

  if (!result) {
    return c.json({ success: true, data: null })
  }

  return c.json({
    success: true,
    data: {
      id: result.row.id,
      athlete: result.athlete ? { id: result.athlete.id, name: result.athlete.name } : null,
      status: result.row.status,
    },
  })
})

queueRoutes.post("/drop", authMiddleware, requireAuth, async (c) => {
  const userId = c.get("userId")!
  const body = await c.req.json()

  const result = dropQueueSchema.safeParse(body)
  if (!result.success) {
    return validationErrorResponse(c, result.error.issues[0].message)
  }

  const { queueId } = result.data

  const [queueEntry] = await db
    .select({ sectorId: sectorQueues.sectorId })
    .from(sectorQueues)
    .where(eq(sectorQueues.id, queueId))

  if (!queueEntry) {
    return notFoundResponse(c, "Queue entry")
  }

  const [sector] = await db
    .select({ eventId: sectors.eventId })
    .from(sectors)
    .where(eq(sectors.id, queueEntry.sectorId))

  if (!sector) {
    return notFoundResponse(c, "Sector")
  }

  const [membership] = await db
    .select({ role: eventMembers.role })
    .from(eventMembers)
    .where(and(eq(eventMembers.eventId, sector.eventId), eq(eventMembers.userId, userId)))

  if (!membership || (membership.role !== "organizer" && membership.role !== "judge")) {
    return forbiddenResponse(c, "Judge access required")
  }

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

queueRoutes.get("/status", authMiddleware, requireAuth, async (c) => {
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
      and(eq(sectorQueues.sectorId, sectorId), inArray(sectorQueues.status, ["waiting", "active"])),
    )
    .orderBy(asc(sectorQueues.createdAt))

  return c.json({ success: true, data: queue }, 200, cacheHeaders(5, 10))
})

export { queueRoutes }
