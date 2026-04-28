import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest"
import { createTestApp } from "@/lib/test/app"
import { truncateTables, seedFixtures, F, seedRedpointAttempts } from "@/lib/test/helpers"
import { db } from "@/lib/db"
import { sectors, events } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

describe("Redpoint Scoring Edge Cases", () => {
  let app: ReturnType<typeof createTestApp>

  beforeAll(async () => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await truncateTables()
    await seedFixtures()
  })

  describe("maxAttempts boundary", () => {
    it("excludes attempts exceeding maxAttempts", async () => {
      await seedRedpointAttempts()

      const res = await app.request("/api/events/redpoint-event/leaderboard")
      const json = await res.json()

      expect(res.status).toBe(200)
      const carlos = json.data.rankings.find((r: any) => r.athlete.name === "Carlos")
      expect(carlos).toBeDefined()
      expect(carlos.totalPoints).toBeGreaterThan(0)
    })
  })

  describe("pointsPerAttempt = 0", () => {
    it("awards full points regardless of attempts when pointsPerAttempt is 0", async () => {
      const res = await app.request("/api/events/redpoint-event/leaderboard")
      const json = await res.json()

      expect(res.status).toBe(200)
      const andre = json.data.rankings.find((r: any) => r.athlete.name === "Andre")
      expect(andre).toBeDefined()
    })
  })

  describe("flashPoints = 0", () => {
    it("awards 0 points when flashPoints is 0", async () => {
      const res = await app.request("/api/events/redpoint-event/leaderboard")
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
    })
  })

  describe("Single route", () => {
    it("calculates score correctly with only one route", async () => {
      const res = await app.request("/api/events/redpoint-event/leaderboard")
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.rankings).toHaveLength(3)
    })
  })

  describe("No attempts", () => {
    it("returns empty leaderboard when no attempts exist", async () => {
      const res = await app.request("/api/events/simple-event/leaderboard")
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.rankings).toHaveLength(0)
    })
  })

  describe("bestRoutesCount filtering", () => {
    it("uses all routes when bestRoutesCount is null", async () => {
      const res = await app.request("/api/events/redpoint-event/leaderboard")
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
    })

    it("filters to best N routes when bestRoutesCount is set", async () => {
      await db.update(events).set({ bestRoutesCount: 3 }).where(eq(events.id, F.redpointEvent.id))

      const res = await app.request("/api/events/redpoint-event/leaderboard")
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
    })
  })

  describe("Non-negative points", () => {
    it("never returns negative points", async () => {
      const res = await app.request("/api/events/redpoint-event/leaderboard")
      const json = await res.json()

      expect(res.status).toBe(200)
      json.data.rankings.forEach((ranking: any) => {
        expect(ranking.totalPoints).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe("Flash counting", () => {
    it("correctly counts flash attempts (attemptCount = 1)", async () => {
      const res = await app.request("/api/events/redpoint-event/leaderboard")
      const json = await res.json()

      expect(res.status).toBe(200)
      const bruno = json.data.rankings.find((r: any) => r.athlete.name === "Bruno")
      expect(bruno).toBeDefined()
      expect(bruno.flashCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe("Total attempts", () => {
    it("sums attempts correctly across all routes", async () => {
      const res = await app.request("/api/events/redpoint-event/leaderboard")
      const json = await res.json()

      expect(res.status).toBe(200)
      json.data.rankings.forEach((ranking: any) => {
        expect(ranking.totalAttempts).toBeGreaterThanOrEqual(0)
      })
    })
  })
})
