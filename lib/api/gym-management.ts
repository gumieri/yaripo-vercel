import { Hono } from "hono"
import { eq, and, count as countFn } from "drizzle-orm"
import { db } from "@/lib/db"
import { events, categories, athletes, eventPayments, gyms, users } from "@/lib/db/schema"
import { authMiddleware, requireGymMember } from "@/lib/api/middleware/auth"
import { createStripeCustomer, createEventCheckoutSession } from "@/lib/stripe/client"
import { logAudit } from "@/lib/db/audit"
import { notFoundResponse, validationErrorResponse, forbiddenResponse } from "@/lib/api/helpers"

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
      return notFoundResponse(c, "Event")
    }

    if (event.gymId !== gymId) {
      return forbiddenResponse(c, "Event does not belong to this gym")
    }

    if (event.status !== "draft") {
      return validationErrorResponse(c, "Only draft events can be published")
    }

    const athleteCount = await db
      .select({ count: countFn() })
      .from(athletes)
      .innerJoin(categories, eq(athletes.categoryId, categories.id))
      .where(eq(categories.eventId, eventId))
      .then((rows) => Number(rows[0].count))

    if (athleteCount === 0) {
      return validationErrorResponse(c, "Event must have at least one athlete")
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId))
    if (!user) {
      return notFoundResponse(c, "User")
    }

    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await createStripeCustomer({
        email: user.email,
        name: user.name,
        metadata: { userId },
      })
      customerId = customer.id
      await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId))
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
      return notFoundResponse(c, "Event")
    }

    if (event.gymId !== gymId) {
      return forbiddenResponse(c, "Event does not belong to this gym")
    }

    if (event.status !== "published") {
      return validationErrorResponse(c, "Only published events can be activated")
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

    const [user] = await db.select().from(users).where(eq(users.id, userId))
    if (!user || !user.stripeCustomerId) {
      return c.json(
        { success: false, error: { code: "PAYMENT_REQUIRED", message: "User has no payment method" } },
        402,
      )
    }

    const session = await createEventCheckoutSession({
      customerId: user.stripeCustomerId,
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
      stripeCustomerId: user.stripeCustomerId,
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
