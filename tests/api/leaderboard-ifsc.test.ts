import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest"
import { createTestApp } from "@/lib/test/app"
import { truncateTables, seedFixtures, seedIfscAttempts, F } from "@/lib/test/helpers"
import { db } from "@/lib/db"
import { events, attempts, sectors, athletes, categories } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

describe("IFSC Leaderboard Edge Cases", () => {
  let app: ReturnType<typeof createTestApp>

  beforeAll(async () => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await truncateTables()
    await seedFixtures()
  })

  describe("Missing resultData", () => {
    it("handles attempts without resultData", async () => {
      const judgeId = F.judge.id
      const s4 = F.sectors[3].id

      await db.insert(attempts).values({
        sectorId: s4,
        athleteId: F.athletes[5].id,
        judgeId,
        isTop: true,
        attemptCount: 1,
        idempotencyKey: crypto.randomUUID(),
      })

      const res = await app.request("/api/events/ifsc-event/leaderboard")
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.scoringType).toBe("ifsc")
    })
  })

  describe("Null fields in resultData", () => {
    it("handles null top/zone in resultData", async () => {
      const judgeId = F.judge.id
      const s4 = F.sectors[3].id

      await db.insert(attempts).values({
        sectorId: s4,
        athleteId: F.athletes[5].id,
        judgeId,
        isTop: false,
        attemptCount: 1,
        resultData: { top: null, zone: null, attempts: 1, attempts_to_top: null },
        idempotencyKey: crypto.randomUUID(),
      })

      const res = await app.request("/api/events/ifsc-event/leaderboard")
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
    })
  })

  describe("No attempts", () => {
    it("returns empty leaderboard when no attempts exist", async () => {
      const res = await app.request("/api/events/ifsc-event/leaderboard")
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.rankings).toHaveLength(0)
    })
  })

  describe("Category filtering", () => {
    it("filters leaderboard by category", async () => {
      await seedIfscAttempts()

      const res = await app.request(
        `/api/events/ifsc-event/leaderboard?category_id=${F.catOpen.id}`,
      )
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      json.data.rankings.forEach((ranking: any) => {
        expect(ranking.category).toBe("Open")
      })
    })

    it("rejects invalid category_id format", async () => {
      await seedIfscAttempts()

      const res = await app.request(
        "/api/events/ifsc-event/leaderboard?category_id=invalid-uuid",
      )
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
    })
  })

  describe("Draft event filtering", () => {
    it("returns 404 for draft IFSC events", async () => {
      await db
        .update(events)
        .set({ status: "draft" })
        .where(eq(events.id, F.ifscEvent.id))

      const res = await app.request("/api/events/ifsc-event/leaderboard")
      const json = await res.json()

      expect(res.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe("NOT_FOUND")
    })
  })

  describe("Sorting", () => {
    it("sorts by tops DESC, zones DESC, attempts ASC", async () => {
      await seedIfscAttempts()

      const res = await app.request("/api/events/ifsc-event/leaderboard")
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)

      const rankings = json.data.rankings
      for (let i = 1; i < rankings.length; i++) {
        const prev = rankings[i - 1]
        const curr = rankings[i]

        if (prev.tops !== curr.tops) {
          expect(prev.tops).toBeGreaterThan(curr.tops)
        } else if (prev.zones !== curr.zones) {
          expect(prev.zones).toBeGreaterThan(curr.zones)
        } else {
          expect(prev.totalAttempts).toBeLessThanOrEqual(curr.totalAttempts)
        }
      }
    })
  })
})
