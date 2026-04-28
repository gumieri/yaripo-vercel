import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest"
import { createTestApp } from "@/lib/test/app"
import { truncateTables, seedFixtures, F } from "@/lib/test/helpers"
import { db } from "@/lib/db"
import { events } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

describe("Events API Visibility (Draft Filtering)", () => {
  let app: ReturnType<typeof createTestApp>

  beforeAll(async () => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await truncateTables()
    await seedFixtures()
  })

  describe("GET /api/events", () => {
    it("excludes draft events from public listing", async () => {
      const res = await app.request("/api/events")
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toHaveLength(3)

      const slugs = json.data.map((e: any) => e.slug)
      expect(slugs).toContain("simple-event")
      expect(slugs).toContain("ifsc-event")
      expect(slugs).toContain("redpoint-event")
    })

    it("includes published, active, and completed events", async () => {
      await db.update(events).set({ status: "published" }).where(eq(events.slug, "simple-event"))

      await db.update(events).set({ status: "completed" }).where(eq(events.slug, "ifsc-event"))

      const res = await app.request("/api/events")
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data).toHaveLength(3)
    })
  })

  describe("GET /api/events/:slug", () => {
    it("returns 404 for draft events", async () => {
      await db.update(events).set({ status: "draft" }).where(eq(events.slug, "simple-event"))

      const res = await app.request("/api/events/simple-event")
      const json = await res.json()

      expect(res.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe("NOT_FOUND")
    })

    it("returns published events", async () => {
      await db.update(events).set({ status: "published" }).where(eq(events.slug, "simple-event"))

      const res = await app.request("/api/events/simple-event")
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.slug).toBe("simple-event")
    })

    it("returns active events", async () => {
      const res = await app.request("/api/events/simple-event")
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.slug).toBe("simple-event")
    })

    it("returns completed events", async () => {
      await db.update(events).set({ status: "completed" }).where(eq(events.slug, "simple-event"))

      const res = await app.request("/api/events/simple-event")
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.slug).toBe("simple-event")
    })
  })

  describe("GET /api/events/:slug/leaderboard", () => {
    it("returns 404 for draft events", async () => {
      await db.update(events).set({ status: "draft" }).where(eq(events.slug, "simple-event"))

      const res = await app.request("/api/events/simple-event/leaderboard")
      const json = await res.json()

      expect(res.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe("NOT_FOUND")
    })

    it("returns leaderboard for active events", async () => {
      const res = await app.request("/api/events/simple-event/leaderboard")
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.scoringType).toBe("simple")
    })
  })

  describe("GET /api/events/:slug/sectors", () => {
    it("returns 404 for draft events", async () => {
      await db.update(events).set({ status: "draft" }).where(eq(events.slug, "simple-event"))

      const res = await app.request("/api/events/simple-event/sectors")
      const json = await res.json()

      expect(res.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe("NOT_FOUND")
    })

    it("returns sectors for active events", async () => {
      const res = await app.request("/api/events/simple-event/sectors")
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toHaveLength(3)
    })
  })

  describe("Slug enumeration protection", () => {
    it("does not expose draft events in public listing", async () => {
      await db.update(events).set({ status: "draft" }).where(eq(events.id, F.simpleEvent.id))

      const res = await app.request("/api/events")
      const json = await res.json()

      expect(res.status).toBe(200)
      const slugs = json.data.map((e: any) => e.slug)

      expect(slugs).not.toContain("simple-event")
    })

    it("returns 404 when accessing draft event by slug", async () => {
      await db.update(events).set({ status: "draft" }).where(eq(events.id, F.simpleEvent.id))

      const res = await app.request("/api/events/simple-event")
      const json = await res.json()

      expect(res.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe("NOT_FOUND")
    })
  })
})
