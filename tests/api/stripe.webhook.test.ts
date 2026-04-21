import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest"
import { createTestApp } from "@/lib/test/app"
import { truncateTables, seedFixtures, F } from "@/lib/test/helpers"
import { db } from "@/lib/db"
import { events, eventPayments } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

describe("Stripe Webhook Route", () => {
  let app: ReturnType<typeof createTestApp>

  beforeAll(async () => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await truncateTables()
    await seedFixtures()
  })

  describe("POST /api/stripe/webhook", () => {
    it("rejects requests without stripe-signature header", async () => {
      const res = await app.request("/api/stripe/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toContain("stripe-signature")
    })

    it("rejects requests with invalid signature", async () => {
      const res = await app.request("/api/stripe/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "invalid-signature",
        },
        body: JSON.stringify({}),
      })
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toContain("Invalid signature")
    })

    it("handles checkout.session.completed event", async () => {
      const stripeModule: any = await import("@/lib/stripe/client")
      stripeModule.__setFns({
        constructEvent: () => ({
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_test_completed",
              metadata: {
                eventId: F.simpleEvent.id,
                gymId: F.gym.id,
                type: "publish",
                athleteCount: "5",
              },
              payment_intent: "pi_test",
            },
          },
        }),
      })

      await db.insert(eventPayments).values({
        id: "payment-id-1",
        eventId: F.simpleEvent.id,
        gymId: F.gym.id,
        stripeCheckoutSessionId: "cs_test_completed",
        athleteCount: 5,
        type: "publish",
        status: "pending",
        stripeCustomerId: "cus_test",
      })

      const res = await app.request("/api/stripe/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "valid-signature",
        },
        body: JSON.stringify({}),
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.received).toBe(true)

      const [payment] = await db
        .select()
        .from(eventPayments)
        .where(eq(eventPayments.stripeCheckoutSessionId, "cs_test_completed"))
      expect(payment?.status).toBe("paid")
      expect(payment?.stripePaymentIntentId).toBe("pi_test")
    })

    it("handles checkout.session.expired event", async () => {
      const stripeModule: any = await import("@/lib/stripe/client")
      stripeModule.__setFns({
        constructEvent: () => ({
          type: "checkout.session.expired",
          data: {
            object: {
              id: "cs_test_expired",
              metadata: {
                eventId: F.simpleEvent.id,
              },
            },
          },
        }),
      })

      await db.insert(eventPayments).values({
        id: "payment-id-2",
        eventId: F.simpleEvent.id,
        gymId: F.gym.id,
        stripeCheckoutSessionId: "cs_test_expired",
        athleteCount: 5,
        type: "publish",
        status: "pending",
        stripeCustomerId: "cus_test",
      })

      const res = await app.request("/api/stripe/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "valid-signature",
        },
        body: JSON.stringify({}),
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.received).toBe(true)

      const [payment] = await db
        .select()
        .from(eventPayments)
        .where(eq(eventPayments.stripeCheckoutSessionId, "cs_test_expired"))
      expect(payment?.status).toBe("expired")
    })

    it("logs unhandled event types", async () => {
      const stripeModule: any = await import("@/lib/stripe/client")
      stripeModule.__setFns({
        constructEvent: () => ({
          type: "payment_intent.succeeded",
          data: { object: {} },
        }),
      })

      const res = await app.request("/api/stripe/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "valid-signature",
        },
        body: JSON.stringify({}),
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.received).toBe(true)
    })

    it("handles missing metadata gracefully", async () => {
      const stripeModule: any = await import("@/lib/stripe/client")
      stripeModule.__setFns({
        constructEvent: () => ({
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_test_no_metadata",
              metadata: {},
              payment_intent: "pi_test",
            },
          },
        }),
      })

      const res = await app.request("/api/stripe/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "valid-signature",
        },
        body: JSON.stringify({}),
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.received).toBe(true)
    })

    it("handles publish type - sets event status to published", async () => {
      const stripeModule: any = await import("@/lib/stripe/client")
      stripeModule.__setFns({
        constructEvent: () => ({
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_test_publish",
              metadata: {
                eventId: F.simpleEvent.id,
                gymId: F.gym.id,
                type: "publish",
                athleteCount: "5",
              },
              payment_intent: "pi_test",
            },
          },
        }),
      })

      await db.insert(eventPayments).values({
        id: "payment-id-3",
        eventId: F.simpleEvent.id,
        gymId: F.gym.id,
        stripeCheckoutSessionId: "cs_test_publish",
        athleteCount: 5,
        type: "publish",
        status: "pending",
        stripeCustomerId: "cus_test",
      })

      const res = await app.request("/api/stripe/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "valid-signature",
        },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(200)

      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, F.simpleEvent.id))
      expect(event?.status).toBe("published")
    })

    it("handles delta type - sets event status to active if already published", async () => {
      const stripeModule: any = await import("@/lib/stripe/client")
      stripeModule.__setFns({
        constructEvent: () => ({
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_test_delta",
              metadata: {
                eventId: F.simpleEvent.id,
                gymId: F.gym.id,
                type: "delta",
                athleteCount: "2",
              },
              payment_intent: "pi_test",
            },
          },
        }),
      })

      await db
        .update(events)
        .set({ status: "published" })
        .where(eq(events.id, F.simpleEvent.id))

      await db.insert(eventPayments).values({
        id: "payment-id-4",
        eventId: F.simpleEvent.id,
        gymId: F.gym.id,
        stripeCheckoutSessionId: "cs_test_delta",
        athleteCount: 5,
        type: "publish",
        status: "paid",
        stripeCustomerId: "cus_test",
      })

      await db.insert(eventPayments).values({
        id: "payment-id-5",
        eventId: F.simpleEvent.id,
        gymId: F.gym.id,
        stripeCheckoutSessionId: "cs_test_delta",
        athleteCount: 2,
        type: "delta",
        status: "pending",
        stripeCustomerId: "cus_test",
      })

      const res = await app.request("/api/stripe/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "valid-signature",
        },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(200)

      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, F.simpleEvent.id))
      expect(event?.status).toBe("active")
    })
  })
})
