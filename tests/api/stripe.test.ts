import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest"
import { truncateTables, seedFixtures, F } from "@/lib/test/helpers"
import { handleCheckoutCompleted, handleCheckoutExpired } from "@/lib/stripe/webhooks"
import { db } from "@/lib/db"
import { eventPayments, events, gyms } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    customers: { create: (...args: any[]) => Promise.resolve({ id: "cus_mock" }) },
    checkout: {
      sessions: {
        create: (...args: any[]) =>
          Promise.resolve({ id: "cs_mock", url: "https://checkout.stripe.com/mock" }),
      },
    },
    webhooks: {
      constructEvent: (...args: any[]) => ({
        type: "checkout.session.completed",
        data: { object: {} },
      }),
    },
  },
  createStripeCustomer: (...args: any[]) => Promise.resolve({ id: "cus_mock" }),
  createEventCheckoutSession: (...args: any[]) =>
    Promise.resolve({ id: "cs_mock", url: "https://checkout.stripe.com/mock" }),
  getEventBasePriceId: () => "price_base_mock",
  getPerAthletePriceId: () => "price_per_athlete_mock",
}))

describe("Stripe Webhook Handlers", () => {
  beforeEach(async () => {
    await truncateTables()
    await seedFixtures()
  })

  describe("handleCheckoutCompleted", () => {
    it("marks publish payment as paid and publishes event", async () => {
      const [gym] = await db.select().from(gyms).where(eq(gyms.slug, F.gym.slug))

      await db.insert(eventPayments).values({
        eventId: F.simpleEvent.id,
        gymId: gym.id,
        stripeCheckoutSessionId: "cs_publish_done",
        athleteCount: 5,
        type: "publish",
        status: "pending",
        stripeCustomerId: "cus_test",
      })

      await handleCheckoutCompleted({
        id: "cs_publish_done",
        metadata: {
          eventId: F.simpleEvent.id,
          gymId: gym.id,
          type: "publish",
          athleteCount: "5",
        },
        payment_intent: "pi_done_123",
      } as any)

      const [payment] = await db
        .select()
        .from(eventPayments)
        .where(eq(eventPayments.stripeCheckoutSessionId, "cs_publish_done"))
      expect(payment?.status).toBe("paid")
      expect(payment?.stripePaymentIntentId).toBe("pi_done_123")

      const [event] = await db.select().from(events).where(eq(events.id, F.simpleEvent.id))
      expect(event?.status).toBe("published")
    })

    it("marks delta payment as paid and activates published event", async () => {
      const [gym] = await db.select().from(gyms).where(eq(gyms.slug, F.gym.slug))

      await db.insert(eventPayments).values({
        eventId: F.simpleEvent.id,
        gymId: gym.id,
        stripeCheckoutSessionId: "cs_publish_done",
        athleteCount: 3,
        type: "publish",
        status: "paid",
        stripePaymentIntentId: "pi_publish",
        stripeCustomerId: "cus_test",
      })

      await db.update(events).set({ status: "published" }).where(eq(events.id, F.simpleEvent.id))

      await db.insert(eventPayments).values({
        eventId: F.simpleEvent.id,
        gymId: gym.id,
        stripeCheckoutSessionId: "cs_delta_done",
        athleteCount: 2,
        type: "delta",
        status: "pending",
        stripeCustomerId: "cus_test",
      })

      await handleCheckoutCompleted({
        id: "cs_delta_done",
        metadata: {
          eventId: F.simpleEvent.id,
          gymId: gym.id,
          type: "delta",
          athleteCount: "2",
        },
        payment_intent: "pi_delta_done",
      } as any)

      const [payment] = await db
        .select()
        .from(eventPayments)
        .where(eq(eventPayments.stripeCheckoutSessionId, "cs_delta_done"))
      expect(payment?.status).toBe("paid")

      const [event] = await db.select().from(events).where(eq(events.id, F.simpleEvent.id))
      expect(event?.status).toBe("active")
    })

    it("does not activate event if not yet published", async () => {
      const [gym] = await db.select().from(gyms).where(eq(gyms.slug, F.gym.slug))

      await db.insert(eventPayments).values({
        eventId: F.simpleEvent.id,
        gymId: gym.id,
        stripeCheckoutSessionId: "cs_delta_draft",
        athleteCount: 1,
        type: "delta",
        status: "pending",
        stripeCustomerId: "cus_test",
      })

      await handleCheckoutCompleted({
        id: "cs_delta_draft",
        metadata: {
          eventId: F.simpleEvent.id,
          gymId: gym.id,
          type: "delta",
          athleteCount: "1",
        },
        payment_intent: "pi_delta_draft",
      } as any)

      const [event] = await db.select().from(events).where(eq(events.id, F.simpleEvent.id))
      expect(event?.status).toBe("draft")
    })

    it("does nothing if metadata is missing", async () => {
      const [event] = await db.select().from(events).where(eq(events.id, F.simpleEvent.id))
      const originalStatus = event?.status

      await handleCheckoutCompleted({
        id: "cs_no_meta",
        metadata: {},
        payment_intent: "pi_no_meta",
      } as any)

      const [afterEvent] = await db.select().from(events).where(eq(events.id, F.simpleEvent.id))
      expect(afterEvent?.status).toBe(originalStatus)
    })
  })

  describe("handleCheckoutExpired", () => {
    it("marks payment as expired", async () => {
      const [gym] = await db.select().from(gyms).where(eq(gyms.slug, F.gym.slug))

      await db.insert(eventPayments).values({
        eventId: F.simpleEvent.id,
        gymId: gym.id,
        stripeCheckoutSessionId: "cs_expired_test",
        athleteCount: 4,
        type: "publish",
        status: "pending",
        stripeCustomerId: "cus_test",
      })

      await handleCheckoutExpired({
        id: "cs_expired_test",
        metadata: {
          eventId: F.simpleEvent.id,
          gymId: gym.id,
          type: "publish",
        },
      } as any)

      const [payment] = await db
        .select()
        .from(eventPayments)
        .where(eq(eventPayments.stripeCheckoutSessionId, "cs_expired_test"))
      expect(payment?.status).toBe("expired")
    })

    it("does nothing if eventId is missing", async () => {
      await handleCheckoutExpired({
        id: "cs_no_event",
        metadata: {},
      } as any)

      const payments = await db.select().from(eventPayments)
      expect(payments.length).toBe(0)
    })
  })
})
