import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest"
import { createTestApp } from "@/lib/test/app"
import { truncateTables, seedFixtures, authHeaders, F } from "@/lib/test/helpers"
import { db } from "@/lib/db"
import { events, categories, sectors, athletes, attempts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

describe("Venue Management Validation", () => {
  let app: ReturnType<typeof createTestApp>

  const ownerHeaders = authHeaders(F.venueOwner.id, F.venueOwner.email, {
    "x-test-venue-id": F.venue.id,
    "x-test-venue-role": "owner",
  })

  beforeAll(async () => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await truncateTables()
    await seedFixtures()
    const stripeModule: any = await import("@/lib/stripe/client")
    if (stripeModule.__reset) {
      stripeModule.__reset()
    }
  })

  describe("POST /api/venue/:venueSlug/events/:eventId/publish", () => {
    it("rejects publishing event with 0 athletes", async () => {
      await db.insert(events).values({
        id: "empty-event-id",
        name: "Empty Event",
        slug: "empty-event",
        venueId: F.venue.id,
        createdBy: F.venueOwner.id,
        status: "draft",
        scoringType: "simple",
      })
      await db.insert(categories).values({
        id: "empty-cat-id",
        eventId: "empty-event-id",
        name: "Open",
        gender: "open",
      })

      const res = await app.request(`/api/venue/${F.venue.slug}/events/empty-event-id/publish`, {
        method: "POST",
        headers: ownerHeaders,
      })
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe("VALIDATION_ERROR")
      expect(json.error.message).toContain("at least one athlete")
    })

    it("rejects publishing non-draft event", async () => {
      const res = await app.request(
        `/api/venue/${F.venue.slug}/events/${F.simpleEvent.id}/publish`,
        {
          method: "POST",
          headers: ownerHeaders,
        },
      )
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe("VALIDATION_ERROR")
      expect(json.error.message).toContain("draft")
    })

    it("rejects publishing event from different venue", async () => {
      await db.insert(events).values({
        id: "a0000001-0000-0000-0000-000000000099",
        name: "Other Venue Event",
        slug: "other-venue-event",
        venueId: "a0000001-0000-0000-0000-000000000098",
        createdBy: F.venueOwner.id,
        status: "draft",
        scoringType: "simple",
      })
      await db.insert(categories).values({
        id: "a0000001-0000-0000-0000-000000000100",
        eventId: "a0000001-0000-0000-0000-000000000099",
        name: "Open",
        gender: "open",
      })
      await db.insert(athletes).values({
        id: "a0000001-0000-0000-0000-000000000101",
        name: "Athlete",
        categoryId: "a0000001-0000-0000-0000-000000000100",
      })

      const res = await app.request(
        `/api/venue/${F.venue.slug}/events/a0000001-0000-0000-0000-000000000099/publish`,
        { method: "POST", headers: ownerHeaders },
      )
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe("FORBIDDEN")
    })
  })

  describe("POST /api/venue/:venueSlug/events/:eventId/activate", () => {
    it("rejects activating draft event", async () => {
      await db.update(events).set({ status: "draft" }).where(eq(events.id, F.simpleEvent.id))

      const res = await app.request(
        `/api/venue/${F.venue.slug}/events/${F.simpleEvent.id}/activate`,
        {
          method: "POST",
          headers: ownerHeaders,
        },
      )
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe("VALIDATION_ERROR")
      expect(json.error.message).toContain("published")
    })

    it("activates published event with no extra athletes (no charge)", async () => {
      await db.update(events).set({ status: "published" }).where(eq(events.id, F.simpleEvent.id))

      const res = await app.request(
        `/api/venue/${F.venue.slug}/events/${F.simpleEvent.id}/activate`,
        {
          method: "POST",
          headers: ownerHeaders,
        },
      )
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.noCharge).toBe(true)
    })

    it("rejects activating event from different venue", async () => {
      await db.insert(events).values({
        id: "a0000001-0000-0000-0000-000000000102",
        name: "Other Venue Published",
        slug: "other-venue-published",
        venueId: "a0000001-0000-0000-0000-000000000098",
        createdBy: F.venueOwner.id,
        status: "published",
        scoringType: "simple",
      })

      const res = await app.request(
        `/api/venue/${F.venue.slug}/events/a0000001-0000-0000-0000-000000000102/activate`,
        { method: "POST", headers: ownerHeaders },
      )
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe("FORBIDDEN")
    })
  })
})
