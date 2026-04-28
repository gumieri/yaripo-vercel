import { Hono } from "hono"
import { eq, and } from "drizzle-orm"
import { db } from "@/lib/db"
import { attempts, sectorQueues, sectors, eventMembers, events } from "@/lib/db/schema"
import { authMiddleware, requireAuth } from "@/lib/api/middleware/auth"
import { createAttemptSchema } from "@/lib/api/validations"
import {
  validationErrorResponse,
  isPgUniqueConstraintError,
  notFoundResponse,
  forbiddenResponse,
} from "@/lib/api/helpers"

const attemptRoutes = new Hono()

attemptRoutes.post("/", authMiddleware, requireAuth, async (c) => {
  const userId = c.get("userId")!
  const body = await c.req.json()

  const result = createAttemptSchema.safeParse(body)
  if (!result.success) {
    return validationErrorResponse(c, result.error.issues[0].message)
  }

  const { sectorId, athleteId, isTop, attemptCount, resultData, idempotencyKey } = result.data

  const [sector] = await db
    .select({ eventId: sectors.eventId })
    .from(sectors)
    .where(eq(sectors.id, sectorId))

  if (!sector) {
    return notFoundResponse(c, "Sector")
  }

  const [event] = await db
    .select({ status: events.status })
    .from(events)
    .where(eq(events.id, sector.eventId))

  if (!event) {
    return notFoundResponse(c, "Event")
  }

  if (event.status !== "published" && event.status !== "active") {
    return forbiddenResponse(c, "Event is not in a valid state for attempts")
  }

  const [membership] = await db
    .select({ role: eventMembers.role })
    .from(eventMembers)
    .where(and(eq(eventMembers.eventId, sector.eventId), eq(eventMembers.userId, userId)))

  if (!membership || (membership.role !== "organizer" && membership.role !== "judge")) {
    return forbiddenResponse(c, "Judge access required")
  }

  try {
    const attempt = await db.transaction(async (tx) => {
      const [newAttempt] = await tx
        .insert(attempts)
        .values({
          sectorId,
          athleteId,
          judgeId: userId,
          isTop,
          attemptCount,
          resultData,
          idempotencyKey,
        })
        .returning()

      await tx
        .update(sectorQueues)
        .set({ status: "completed" })
        .where(
          and(
            eq(sectorQueues.sectorId, sectorId),
            eq(sectorQueues.athleteId, athleteId),
            eq(sectorQueues.status, "active"),
          ),
        )

      return newAttempt
    })

    return c.json({ success: true, data: attempt }, 201)
  } catch (error: unknown) {
    if (isPgUniqueConstraintError(error)) {
      const [existing] = await db
        .select()
        .from(attempts)
        .where(eq(attempts.idempotencyKey, idempotencyKey))

      return c.json({ success: true, data: existing })
    }

    throw error
  }
})

export { attemptRoutes }
