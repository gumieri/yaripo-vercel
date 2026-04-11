import { Hono } from "hono"
import { eq, and } from "drizzle-orm"
import { db } from "@/lib/db"
import { attempts, sectorQueues } from "@/lib/db/schema"
import { authMiddleware, requireRole } from "@/lib/api/middleware/auth"

const attemptRoutes = new Hono()

attemptRoutes.post("/", authMiddleware, requireRole("judge", "admin"), async (c) => {
  const userId = c.get("userId")
  const body = await c.req.json()
  const { sectorId, athleteId, isTop, attemptCount, resultData, idempotencyKey } = body

  if (!sectorId || !athleteId || !idempotencyKey) {
    return c.json(
      {
        success: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "Missing required fields",
        },
      },
      400,
    )
  }

  const isTopBool = isTop !== undefined ? Boolean(isTop) : false
  const count = attemptCount !== undefined ? Number(attemptCount) : 1

  try {
    const [attempt] = await db
      .insert(attempts)
      .values({
        sectorId,
        athleteId,
        judgeId: userId!,
        isTop: isTopBool,
        attemptCount: count,
        resultData: resultData ?? null,
        idempotencyKey,
      })
      .returning()

    await db
      .update(sectorQueues)
      .set({ status: "completed" })
      .where(
        and(
          eq(sectorQueues.sectorId, sectorId),
          eq(sectorQueues.athleteId, athleteId),
          eq(sectorQueues.status, "active"),
        ),
      )

    return c.json({ success: true, data: attempt }, 201)
  } catch (error: unknown) {
    const isDuplicate =
      (error instanceof Error && error.message.includes("unique")) ||
      (error instanceof Error &&
        "cause" in error &&
        error.cause instanceof Error &&
        error.cause.message.includes("duplicate key"))

    if (isDuplicate) {
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
