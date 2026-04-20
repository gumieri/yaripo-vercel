import { Hono } from "hono"
import { eq, and, count as countFn } from "drizzle-orm"
import { db } from "@/lib/db"
import { events, categories, athletes, eventPayments, gyms } from "@/lib/db/schema"
import { authMiddleware, requireGymMember } from "@/lib/api/middleware/auth"
import { createStripeCustomer, createEventCheckoutSession } from "@/lib/stripe/client"
import { logAudit } from "@/lib/db/audit"

const gymRoutes = new Hono()

gymRoutes.use("*", authMiddleware)

gymRoutes.post(
  "/:gymSlug/events/:eventId/publish",
  requireGymMember("gymSlug", ["owner", "admin"]),
  async (c) => {
    const gymId = c.get("gymId")!
    const userId = c.get("userId")!
    const eventId = c.req.param("eventId")

    const [event] = await db.select().from(events).where(eq(events.id, eventId))
    if (!event) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Event not found" } },
        404,
      )
    }

    if (event.gymId !== gymId) {
      return c.json(
        { success: false, error: { code: "FORBIDDEN", message: "Event does not belong to this gym" } },
        403,
      )
    }

    if (event.status !== "draft") {
      return c.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Only draft events can be published" },
        },
        400,
      )
    }

    const athleteCount = await db
      .select({ count: countFn() })
      .from(athletes)
      .innerJoin(categories, eq(athletes.categoryId, categories.id))
      .where(eq(categories.eventId, eventId))
      .then((rows) => Number(rows[0].count))

    if (athleteCount === 0) {
      return c.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Event must have at least one athlete" },
        },
        400,
      )
    }

    const [gym] = await db.select().from(gyms).where(eq(gyms.id, gymId))
    if (!gym) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Gym not found" } },
        404,
      )
    }

    let customerId = gym.stripeCustomerId
    if (!customerId) {
      const customer = await createStripeCustomer({
        email: gym.name,
        name: gym.name,
        metadata: { gymId },
      })
      customerId = customer.id
      await db.update(gyms).set({ stripeCustomerId: customerId }).where(eq(gyms.id, gymId))
    }

    const session = await createEventCheckoutSession({
      customerId,
      gymId,
      eventId,
      eventName: event.name,
      athleteCount,
      type: "publish",
    })

    await db.insert(eventPayments).values({
      eventId,
      gymId,
      stripeCheckoutSessionId: session.id,
      athleteCount,
      type: "publish",
      status: "pending",
      stripeCustomerId: customerId,
    })

    await logAudit({
      userId,
      action: "event.publish_initiated",
      resourceType: "event",
      resourceId: eventId,
      newValues: { athleteCount, type: "publish" },
    })

    return c.json({ success: true, data: { checkoutUrl: session.url } })
  },
)

gymRoutes.post(
  "/:gymSlug/events/:eventId/activate",
  requireGymMember("gymSlug", ["owner", "admin"]),
  async (c) => {
    const gymId = c.get("gymId")!
    const userId = c.get("userId")!
    const eventId = c.req.param("eventId")

    const [event] = await db.select().from(events).where(eq(events.id, eventId))
    if (!event) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Event not found" } },
        404,
      )
    }

    if (event.gymId !== gymId) {
      return c.json(
        { success: false, error: { code: "FORBIDDEN", message: "Event does not belong to this gym" } },
        403,
      )
    }

    if (event.status !== "published") {
      return c.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Only published events can be activated" },
        },
        400,
      )
    }

    const currentAthleteCount = await db
      .select({ count: countFn() })
      .from(athletes)
      .innerJoin(categories, eq(athletes.categoryId, categories.id))
      .where(eq(categories.eventId, eventId))
      .then((rows) => Number(rows[0].count))

    const [publishPayment] = await db
      .select()
      .from(eventPayments)
      .where(and(eq(eventPayments.eventId, eventId), eq(eventPayments.type, "publish")))

    const publishAthleteCount = publishPayment?.athleteCount ?? 0
    const delta = currentAthleteCount - publishAthleteCount

    if (delta <= 0) {
      await db
        .update(events)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(events.id, eventId))

      await logAudit({
        userId,
        action: "event.activate",
        resourceType: "event",
        resourceId: eventId,
        newValues: { athleteCount: currentAthleteCount, delta: 0 },
      })

      return c.json({ success: true, data: { noCharge: true, athleteCount: currentAthleteCount } })
    }

    const [gym] = await db.select().from(gyms).where(eq(gyms.id, gymId))
    if (!gym || !gym.stripeCustomerId) {
      return c.json(
        { success: false, error: { code: "PAYMENT_REQUIRED", message: "Gym has no payment method" } },
        402,
      )
    }

    const session = await createEventCheckoutSession({
      customerId: gym.stripeCustomerId,
      gymId,
      eventId,
      eventName: event.name,
      athleteCount: delta,
      type: "delta",
    })

    await db.insert(eventPayments).values({
      eventId,
      gymId,
      stripeCheckoutSessionId: session.id,
      athleteCount: delta,
      type: "delta",
      status: "pending",
      stripeCustomerId: gym.stripeCustomerId,
    })

    await logAudit({
      userId,
      action: "event.activate_delta_initiated",
      resourceType: "event",
      resourceId: eventId,
      newValues: { delta, currentAthleteCount, publishAthleteCount },
    })

    return c.json({ success: true, data: { checkoutUrl: session.url, delta } })
  },
)

export { gymRoutes as gymManagementRoutes }
