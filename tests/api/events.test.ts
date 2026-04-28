import { describe, it, expect, beforeAll, beforeEach } from "vitest"
import { createTestApp } from "@/lib/test/app"
import {
  truncateTables,
  seedFixtures,
  seedSimpleAttempts,
  seedIfscAttempts,
  authHeaders,
  F,
} from "@/lib/test/helpers"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

describe("Events API", () => {
  let app: ReturnType<typeof createTestApp>

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await truncateTables()
  })

  describe("GET /events", () => {
    it("returns empty list when no events", async () => {
      const res = await app.request("/api/events")
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual([])
    })

    it("returns only published/active/completed events", async () => {
      await seedFixtures()
      const res = await app.request("/api/events")
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.length).toBe(3)
      for (const event of json.data) {
        expect(["published", "active", "completed"]).toContain(event.status)
      }
    })

    it("does not return draft events", async () => {
      await seedFixtures()
      const { db } = await import("@/lib/db")
      const { events } = await import("@/lib/db/schema")
      const { eq } = await import("drizzle-orm")
      await db.update(events).set({ status: "draft" }).where(eq(events.id, F.simpleEvent.id))

      const res = await app.request("/api/events")
      const json = await res.json()
      const ids = json.data.map((e: any) => e.id)
      expect(ids).not.toContain(F.simpleEvent.id)
    })

    it("returns events with correct fields", async () => {
      await seedFixtures()
      const res = await app.request("/api/events")
      const json = await res.json()
      const event = json.data.find((e: any) => e.id === F.simpleEvent.id)
      expect(event).toBeDefined()
      expect(event.name).toBe("Simple Event")
      expect(event.slug).toBe("simple-event")
      expect(event.scoringType).toBe("simple")
      expect(event.status).toBe("active")
    })
  })

  describe("GET /events/:slug", () => {
    it("returns event by slug", async () => {
      await seedFixtures()
      const res = await app.request("/api/events/simple-event")
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.slug).toBe("simple-event")
      expect(json.data.scoringType).toBe("simple")
    })

    it("returns 404 for non-existent slug", async () => {
      const res = await app.request("/api/events/nonexistent")
      const json = await res.json()
      expect(res.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe("NOT_FOUND")
    })
  })

  describe("GET /events/:slug/leaderboard (simple)", () => {
    beforeEach(async () => {
      await seedFixtures()
      await seedSimpleAttempts()
    })

    it("returns rankings sorted by tops DESC then totalAttempts ASC", async () => {
      const res = await app.request("/api/events/simple-event/leaderboard")
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.scoringType).toBe("simple")

      const rankings = json.data.rankings
      expect(rankings.length).toBeGreaterThanOrEqual(2)

      for (let i = 1; i < rankings.length; i++) {
        const prev = rankings[i - 1]
        const curr = rankings[i]
        if (prev.tops === curr.tops) {
          expect(prev.totalAttempts).toBeLessThanOrEqual(curr.totalAttempts)
        } else {
          expect(prev.tops).toBeGreaterThan(curr.tops)
        }
      }
    })

    it("Rafael ranks first: 3 tops in 3 attempts", async () => {
      const res = await app.request("/api/events/simple-event/leaderboard")
      const json = await res.json()
      const first = json.data.rankings[0]
      expect(first.athlete.name).toBe("Rafael")
      expect(first.tops).toBe(3)
      expect(first.totalAttempts).toBe(3)
    })

    it("Lucas ranks second: 2 tops in 3 attempts", async () => {
      const res = await app.request("/api/events/simple-event/leaderboard")
      const json = await res.json()
      const lucas = json.data.rankings.find((r: any) => r.athlete.name === "Lucas")
      expect(lucas).toBeDefined()
      expect(lucas.tops).toBe(2)
      expect(lucas.totalAttempts).toBe(9)
    })

    it("filters by category_id", async () => {
      const res = await app.request(
        `/api/events/simple-event/leaderboard?category_id=${F.catMale.id}`,
      )
      const json = await res.json()
      for (const r of json.data.rankings) {
        expect(r.category).toBe("Masculino")
      }
    })

    it("returns correct response shape", async () => {
      const res = await app.request("/api/events/simple-event/leaderboard")
      const json = await res.json()
      const ranking = json.data.rankings[0]
      expect(ranking).toHaveProperty("rank")
      expect(ranking).toHaveProperty("athlete")
      expect(ranking).toHaveProperty("category")
      expect(ranking).toHaveProperty("tops")
      expect(ranking).toHaveProperty("totalAttempts")
      expect(ranking.athlete).toHaveProperty("id")
      expect(ranking.athlete).toHaveProperty("name")
    })
  })

  describe("GET /events/:slug/leaderboard (IFSC)", () => {
    beforeEach(async () => {
      await seedFixtures()
      await seedIfscAttempts()
    })

    it("returns IFSC rankings with tops and zones", async () => {
      const res = await app.request("/api/events/ifsc-event/leaderboard")
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.data.scoringType).toBe("ifsc")

      const rankings = json.data.rankings
      expect(rankings.length).toBeGreaterThanOrEqual(1)

      const pedro = rankings.find((r: any) => r.athlete.name === "Pedro")
      expect(pedro).toBeDefined()
      expect(pedro.tops).toBe(2)
      expect(pedro.zones).toBe(2)
      expect(pedro.totalAttempts).toBe(3)
    })

    it("sorts by tops DESC, zones DESC, totalAttempts ASC", async () => {
      const res = await app.request("/api/events/ifsc-event/leaderboard")
      const json = await res.json()
      const rankings = json.data.rankings
      for (let i = 1; i < rankings.length; i++) {
        const prev = rankings[i - 1]
        const curr = rankings[i]
        if (prev.tops === curr.tops && prev.zones === curr.zones) {
          expect(prev.totalAttempts).toBeLessThanOrEqual(curr.totalAttempts)
        } else if (prev.tops === curr.tops) {
          expect(prev.zones).toBeGreaterThan(curr.zones)
        } else {
          expect(prev.tops).toBeGreaterThan(curr.tops)
        }
      }
    })
  })

  describe("GET /events/:slug/sectors", () => {
    it("returns sectors ordered by orderIndex", async () => {
      await seedFixtures()
      const res = await app.request("/api/events/simple-event/sectors")
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.length).toBe(3)
      expect(json.data[0].name).toBe("Problema 1")
      expect(json.data[1].name).toBe("Problema 2")
      expect(json.data[2].name).toBe("Problema 3")
    })

    it("returns 404 for non-existent event", async () => {
      const res = await app.request("/api/events/nonexistent/sectors")
      expect(res.status).toBe(404)
    })

    it("returns empty list for event with no sectors", async () => {
      await seedFixtures()
      const { db } = await import("@/lib/db")
      const { events: ev, sectors } = await import("@/lib/db/schema")
      const { eq } = await import("drizzle-orm")
      await db.insert(ev).values({
        id: "f0000000-0000-0000-0000-000000000001",
        name: "Empty Event",
        slug: "empty-event",
        venueId: F.venue.id,
        createdBy: F.admin.id,
        scoringType: "simple",
        status: "active",
      })
      const res = await app.request("/api/events/empty-event/sectors")
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.data).toEqual([])
    })
  })
})
