import { Hono } from "hono"
import { eq, and, count as countFn } from "drizzle-orm"
import { db } from "@/lib/db"
import { events, categories, athletes, eventPayments, users, venues } from "@/lib/db/schema"
import { authMiddleware, requireVenueMember } from "@/lib/api/middleware/auth"
import { createStripeCustomer, createStripeCheckoutSession } from "@/lib/stripe/client"
import { logAudit } from "@/lib/db/audit"
import {
  notFoundResponse,
  validationErrorResponse,
  forbiddenResponse,
  paymentRequiredResponse,
} from "@/lib/api/helpers"

const venueRoutes = new Hono()

venueRoutes.use("*", authMiddleware)

venueRoutes.post(
  "/:venueSlug/events/:eventId/publish",
  requireVenueMember("venueSlug", ["owner", "admin"]),
  async (c) => {
    const venueId = c.get("venueId")!
    const userId = c.get("userId")!
    const eventId = c.req.param("eventId")

    const [event] = await db.select().from(events).where(eq(events.id, eventId))
    if (!event) {
      return notFoundResponse(c, "Event")
    }

    if (event.venueId !== venueId) {
      return forbiddenResponse(c, "Event does not belong to this venue")
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

    const session = await createStripeCheckoutSession({
      customerId,
      userId,
      eventId,
      eventName: event.name,
      athleteCount,
      type: "publish",
    })

    await db.insert(eventPayments).values({
      eventId,
      userId,
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

venueRoutes.post(
  "/:venueSlug/events/:eventId/activate",
  requireVenueMember("venueSlug", ["owner", "admin"]),
  async (c) => {
    const venueId = c.get("venueId")!
    const userId = c.get("userId")!
    const eventId = c.req.param("eventId")

    const [event] = await db.select().from(events).where(eq(events.id, eventId))
    if (!event) {
      return notFoundResponse(c, "Event")
    }

    if (event.venueId !== venueId) {
      return forbiddenResponse(c, "Event does not belong to this venue")
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
      return paymentRequiredResponse(c, "User has no payment method")
    }

    const session = await createStripeCheckoutSession({
      customerId: user.stripeCustomerId,
      userId,
      eventId,
      eventName: event.name,
      athleteCount: delta,
      type: "delta",
    })

    await db.insert(eventPayments).values({
      eventId,
      userId,
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

export { venueRoutes as venueManagementRoutes }
