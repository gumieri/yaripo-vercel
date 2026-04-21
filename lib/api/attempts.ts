import { Hono } from "hono"
import { eq, and } from "drizzle-orm"
import { db } from "@/lib/db"
import { attempts, sectorQueues } from "@/lib/db/schema"
import { authMiddleware, requireRole } from "@/lib/api/middleware/auth"
import { createAttemptSchema } from "@/lib/api/validations"
import { validationErrorResponse } from "@/lib/api/helpers"

const attemptRoutes = new Hono()

attemptRoutes.post("/", authMiddleware, requireRole("judge", "admin"), async (c) => {
  const userId = c.get("userId")
  const body = await c.req.json()

  const result = createAttemptSchema.safeParse(body)
  if (!result.success) {
    return validationErrorResponse(c, result.error.issues[0].message)
  }

  const { sectorId, athleteId, isTop, attemptCount, resultData, idempotencyKey } = result.data

  try {
    const [attempt] = await db
      .insert(attempts)
      .values({
        sectorId,
        athleteId,
        judgeId: userId!,
        isTop,
        attemptCount,
        resultData,
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
    const isPgUniqueError =
      error instanceof Error &&
      (("cause" in error &&
        typeof error.cause === "object" &&
        error.cause !== null &&
        "code" in error.cause &&
        (error.cause as { code: string }).code === "23505") ||
        error.message.includes("unique") ||
        error.message.includes("duplicate key"))

    if (isPgUniqueError) {
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
