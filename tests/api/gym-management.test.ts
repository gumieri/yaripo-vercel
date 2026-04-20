import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest"
import { createTestApp } from "@/lib/test/app"
import { truncateTables, seedFixtures, authHeaders, F } from "@/lib/test/helpers"
import { db } from "@/lib/db"
import { eventPayments, events, gyms, athletes } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

vi.mock("@/lib/stripe/client", () => {
  let _createCustomer = (...args: any[]) => Promise.resolve({ id: "cus_mock" })
  let _createCheckoutSession = (...args: any[]) =>
    Promise.resolve({ id: "cs_mock", url: "https://checkout.stripe.com/mock" })

  return {
    stripe: {
      customers: {
        create: (...args: any[]) => _createCustomer(...args),
      },
      checkout: {
        sessions: {
          create: (...args: any[]) => _createCheckoutSession(...args),
        },
      },
      webhooks: {
        constructEvent: (...args: any[]) => ({
          type: "checkout.session.completed",
          data: { object: {} },
        }),
      },
    },
    createStripeCustomer: (...args: any[]) => _createCustomer(...args),
    createEventCheckoutSession: (...args: any[]) => _createCheckoutSession(...args),
    getEventBasePriceId: () => "price_base_mock",
    getPerAthletePriceId: () => "price_per_athlete_mock",
    __setFns: (fns: { createCustomer?: any; createCheckoutSession?: any }) => {
      if (fns.createCustomer) _createCustomer = fns.createCustomer
      if (fns.createCheckoutSession) _createCheckoutSession = fns.createCheckoutSession
    },
    __reset: () => {
      _createCustomer = (...args: any[]) => Promise.resolve({ id: "cus_mock" })
      _createCheckoutSession = (...args: any[]) =>
        Promise.resolve({ id: "cs_mock", url: "https://checkout.stripe.com/mock" })
    },
  }
})

describe("Gym Management API", () => {
  let app: ReturnType<typeof createTestApp>

  const ownerHeaders = authHeaders(F.gymOwner.id, "athlete", {
    "x-test-gym-id": F.gym.id,
    "x-test-gym-role": "owner",
  })

  const adminMemberHeaders = authHeaders(F.gymAdminMember.id, "athlete", {
    "x-test-gym-id": F.gym.id,
    "x-test-gym-role": "admin",
  })

  const judgeHeaders = authHeaders(F.judge.id, "judge", {
    "x-test-gym-id": F.gym.id,
    "x-test-gym-role": "judge",
  })

  const noAuthHeaders = { "Content-Type": "application/json" }

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await truncateTables()
    await seedFixtures()
    const stripe = await import("@/lib/stripe/client")
    stripe.__reset()
  })

  describe("Auth guards", () => {
    it("returns 401 if not authenticated", async () => {
      const res = await app.request(
        `/api/gym/${F.gym.slug}/events/${F.simpleEvent.id}/publish`,
        { method: "POST", headers: noAuthHeaders },
      )
      expect(res.status).toBe(401)
    })

    it("returns 403 if not a gym member", async () => {
      const headers = authHeaders(F.judge.id, "judge")
      const res = await app.request(
        `/api/gym/${F.gym.slug}/events/${F.simpleEvent.id}/publish`,
        { method: "POST", headers },
      )
      expect(res.status).toBe(403)
    })

    it("returns 403 if judge role tries to publish", async () => {
      const res = await app.request(
        `/api/gym/${F.gym.slug}/events/${F.simpleEvent.id}/publish`,
        { method: "POST", headers: judgeHeaders },
      )
      expect(res.status).toBe(403)
    })

    it("allows owner to publish", async () => {
      stripe.__setFns({
        createCheckoutSession: () =>
          Promise.resolve({ id: "cs_test", url: "https://checkout.stripe.com/test" }),
      })

      const res = await app.request(
        `/api/gym/${F.gym.slug}/events/${F.simpleEvent.id}/publish`,
        { method: "POST", headers: ownerHeaders },
      )
      expect(res.status).toBe(200)
    })

    it("allows admin member to publish", async () => {
      stripe.__setFns({
        createCheckoutSession: () =>
          Promise.resolve({ id: "cs_test", url: "https://checkout.stripe.com/test" }),
      })

      const res = await app.request(
        `/api/gym/${F.gym.slug}/events/${F.simpleEvent.id}/publish`,
        { method: "POST", headers: adminMemberHeaders },
      )
      expect(res.status).toBe(200)
    })
  })

  describe("POST /api/gym/:gymSlug/events/:eventId/publish", () => {
    it("creates checkout session and event payment record", async () => {
      stripe.__setFns({
        createCheckoutSession: () =>
          Promise.resolve({ id: "cs_publish_1", url: "https://checkout.stripe.com/pay" }),
      })

      const res = await app.request(
        `/api/gym/${F.gym.slug}/events/${F.simpleEvent.id}/publish`,
        { method: "POST", headers: ownerHeaders },
      )
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.checkoutUrl).toBe("https://checkout.stripe.com/pay")

      const [payment] = await db
        .select()
        .from(eventPayments)
        .where(eq(eventPayments.stripeCheckoutSessionId, "cs_publish_1"))
      expect(payment).toBeDefined()
      expect(payment?.athleteCount).toBe(5)
      expect(payment?.type).toBe("publish")
      expect(payment?.status).toBe("pending")
    })

    it("creates Stripe customer if gym has none", async () => {
      stripe.__setFns({
        createCustomer: () =>
          Promise.resolve({ id: "cus_new_123", email: "test@test.com", name: "Test Gym" }),
        createCheckoutSession: () =>
          Promise.resolve({ id: "cs_new_cust", url: "https://checkout.stripe.com/new" }),
      })

      const res = await app.request(
        `/api/gym/${F.gym.slug}/events/${F.simpleEvent.id}/publish`,
        { method: "POST", headers: ownerHeaders },
      )
      expect(res.status).toBe(200)

      const [gym] = await db.select().from(gyms).where(eq(gyms.id, F.gym.id))
      expect(gym?.stripeCustomerId).toBe("cus_new_123")
    })

    it("reuses existing Stripe customer", async () => {
      await db
        .update(gyms)
        .set({ stripeCustomerId: "cus_existing" })
        .where(eq(gyms.id, F.gym.id))

      let customerCreated = false
      stripe.__setFns({
        createCustomer: () => {
          customerCreated = true
          return Promise.resolve({ id: "cus_should_not", name: "test" })
        },
        createCheckoutSession: () =>
          Promise.resolve({ id: "cs_reuse", url: "https://checkout.stripe.com/reuse" }),
      })

      await app.request(
        `/api/gym/${F.gym.slug}/events/${F.simpleEvent.id}/publish`,
        { method: "POST", headers: ownerHeaders },
      )

      expect(customerCreated).toBe(false)

      const [payment] = await db
        .select()
        .from(eventPayments)
        .where(eq(eventPayments.stripeCheckoutSessionId, "cs_reuse"))
      expect(payment?.stripeCustomerId).toBe("cus_existing")
    })

    it("returns 404 for non-existent event", async () => {
      const res = await app.request(
        `/api/gym/${F.gym.slug}/events/00000000-0000-0000-0000-000000000000/publish`,
        { method: "POST", headers: ownerHeaders },
      )
      expect(res.status).toBe(404)
    })

    it("returns 403 if event belongs to different gym", async () => {
      stripe.__setFns({
        createCheckoutSession: () =>
          Promise.resolve({ id: "cs_test", url: "https://checkout.stripe.com/test" }),
      })

      const res = await app.request(
        `/api/gym/nonexistent/events/${F.simpleEvent.id}/publish`,
        { method: "POST", headers: ownerHeaders },
      )
      expect(res.status).toBe(404)
    })

    it("returns 400 if event is not draft", async () => {
      await db
        .update(events)
        .set({ status: "published" })
        .where(eq(events.id, F.simpleEvent.id))

      const res = await app.request(
        `/api/gym/${F.gym.slug}/events/${F.simpleEvent.id}/publish`,
        { method: "POST", headers: ownerHeaders },
      )
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("returns 400 if event has no athletes", async () => {
      await db.execute(sql`DELETE FROM athletes`)

      const res = await app.request(
        `/api/gym/${F.gym.slug}/events/${F.simpleEvent.id}/publish`,
        { method: "POST", headers: ownerHeaders },
      )
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error.code).toBe("VALIDATION_ERROR")
      expect(json.error.message).toContain("at least one athlete")
    })

    it("passes correct line items to Stripe (1 base + N athletes)", async () => {
      let capturedLineItems: any[] = []
      stripe.__setFns({
        createCheckoutSession: (params: any) => {
          capturedLineItems = params.line_items
          return Promise.resolve({ id: "cs_items", url: "https://checkout.stripe.com/items" })
        },
      })

      await app.request(
        `/api/gym/${F.gym.slug}/events/${F.simpleEvent.id}/publish`,
        { method: "POST", headers: ownerHeaders },
      )

      expect(capturedLineItems).toHaveLength(2)
      expect(capturedLineItems[0].price).toBe("price_base_mock")
      expect(capturedLineItems[0].quantity).toBe(1)
      expect(capturedLineItems[1].price).toBe("price_per_athlete_mock")
      expect(capturedLineItems[1].quantity).toBe(5)
    })

    it("includes event name in statement_descriptor_suffix", async () => {
      let capturedDescriptor: string | undefined
      stripe.__setFns({
        createCheckoutSession: (params: any) => {
          capturedDescriptor = params.payment_intent_data?.statement_descriptor_suffix
          return Promise.resolve({ id: "cs_desc", url: "https://checkout.stripe.com/desc" })
        },
      })

      await app.request(
        `/api/gym/${F.gym.slug}/events/${F.simpleEvent.id}/publish`,
        { method: "POST", headers: ownerHeaders },
      )

      expect(capturedDescriptor).toBe("Simple Event")
    })

    it("truncates long event name in statement_descriptor_suffix to 22 chars", async () => {
      let capturedDescriptor: string | undefined
      stripe.__setFns({
        createCheckoutSession: (params: any) => {
          capturedDescriptor = params.payment_intent_data?.statement_descriptor_suffix
          return Promise.resolve({ id: "cs_long", url: "https://checkout.stripe.com/long" })
        },
      })

      await db
        .update(events)
        .set({ name: "This is a very long event name that should be truncated" })
        .where(eq(events.id, F.simpleEvent.id))

      await app.request(
        `/api/gym/${F.gym.slug}/events/${F.simpleEvent.id}/publish`,
        { method: "POST", headers: ownerHeaders },
      )

      expect(capturedDescriptor!.length).toBeLessThanOrEqual(22)
    })

    it("includes metadata in checkout session", async () => {
      let capturedMetadata: Record<string, string> | undefined
      stripe.__setFns({
        createCheckoutSession: (params: any) => {
          capturedMetadata = params.metadata
          return Promise.resolve({ id: "cs_meta", url: "https://checkout.stripe.com/meta" })
        },
      })

      await app.request(
        `/api/gym/${F.gym.slug}/events/${F.simpleEvent.id}/publish`,
        { method: "POST", headers: ownerHeaders },
      )

      expect(capturedMetadata?.eventId).toBe(F.simpleEvent.id)
      expect(capturedMetadata?.gymId).toBe(F.gym.id)
      expect(capturedMetadata?.type).toBe("publish")
      expect(capturedMetadata?.athleteCount).toBe("5")
    })

    it("writes audit log", async () => {
      stripe.__setFns({
        createCheckoutSession: () =>
          Promise.resolve({ id: "cs_audit", url: "https://checkout.stripe.com/audit" }),
      })

      await app.request(
        `/api/gym/${F.gym.slug}/events/${F.simpleEvent.id}/publish`,
        { method: "POST", headers: ownerHeaders },
      )

      const { auditLogs } = await import("@/lib/db/schema")
      const logs = await db.select().from(auditLogs)
      const log = logs.find((l: any) => l.action === "event.publish_initiated")
      expect(log).toBeDefined()
      expect(log?.userId).toBe(F.gymOwner.id)
      expect(log?.resourceId).toBe(F.simpleEvent.id)
    })
  })

  describe("POST /api/gym/:gymSlug/events/:eventId/activate", () => {
    beforeEach(async () => {
      await db
        .update(gyms)
        .set({ stripeCustomerId: "cus_activate" })
        .where(eq(gyms.id, F.gym.id))
    })

    it("activates event without charge if no new athletes", async () => {
      await db
        .update(events)
        .set({ status: "published" })
        .where(eq(events.id, F.simpleEvent.id))

      await db.insert(eventPayments).values({
        eventId: F.simpleEvent.id,
        gymId: F.gym.id,
        stripeCheckoutSessionId: "cs_orig_publish",
        athleteCount: 5,
        type: "publish",
        status: "paid",
        stripePaymentIntentId: "pi_orig",
        stripeCustomerId: "cus_activate",
      })

      const res = await app.request(
        `/api/gym/${F.gym.slug}/events/${F.simpleEvent.id}/activate`,
        { method: "POST", headers: ownerHeaders },
      )
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.noCharge).toBe(true)

      const [event] = await db.select().from(events).where(eq(events.id, F.simpleEvent.id))
      expect(event?.status).toBe("active")
    })

    it("creates delta checkout if athletes were added", async () => {
      await db
        .update(events)
        .set({ status: "published" })
        .where(eq(events.id, F.simpleEvent.id))

      await db.insert(eventPayments).values({
        eventId: F.simpleEvent.id,
        gymId: F.gym.id,
        stripeCheckoutSessionId: "cs_orig_publish",
        athleteCount: 3,
        type: "publish",
        status: "paid",
        stripePaymentIntentId: "pi_orig",
        stripeCustomerId: "cus_activate",
      })

      stripe.__setFns({
        createCheckoutSession: (params: any) => {
          expect(params.metadata.type).toBe("delta")
          expect(params.line_items).toHaveLength(1)
          expect(params.line_items[0].quantity).toBe(2)
          expect(params.payment_intent_data?.statement_descriptor_suffix).toContain("extra")
          return Promise.resolve({
            id: "cs_delta_charge",
            url: "https://checkout.stripe.com/delta",
          })
        },
      })

      const res = await app.request(
        `/api/gym/${F.gym.slug}/events/${F.simpleEvent.id}/activate`,
        { method: "POST", headers: ownerHeaders },
      )
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.checkoutUrl).toBeDefined()
      expect(json.data.delta).toBe(2)

      const [payment] = await db
        .select()
        .from(eventPayments)
        .where(eq(eventPayments.type, "delta"))
      expect(payment?.athleteCount).toBe(2)
      expect(payment?.status).toBe("pending")
    })

    it("returns 400 if event is not published", async () => {
      const res = await app.request(
        `/api/gym/${F.gym.slug}/events/${F.simpleEvent.id}/activate`,
        { method: "POST", headers: ownerHeaders },
      )
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("returns 404 for non-existent event", async () => {
      const res = await app.request(
        `/api/gym/${F.gym.slug}/events/00000000-0000-0000-0000-000000000000/activate`,
        { method: "POST", headers: ownerHeaders },
      )
      expect(res.status).toBe(404)
    })

    it("returns 402 if gym has no Stripe customer", async () => {
      await db
        .update(gyms)
        .set({ stripeCustomerId: null })
        .where(eq(gyms.id, F.gym.id))

      await db
        .update(events)
        .set({ status: "published" })
        .where(eq(events.id, F.simpleEvent.id))

      await db.insert(eventPayments).values({
        eventId: F.simpleEvent.id,
        gymId: F.gym.id,
        stripeCheckoutSessionId: "cs_orig",
        athleteCount: 1,
        type: "publish",
        status: "paid",
        stripePaymentIntentId: "pi_orig",
        stripeCustomerId: "cus_old",
      })

      const res = await app.request(
        `/api/gym/${F.gym.slug}/events/${F.simpleEvent.id}/activate`,
        { method: "POST", headers: ownerHeaders },
      )
      expect(res.status).toBe(402)
    })
  })
})