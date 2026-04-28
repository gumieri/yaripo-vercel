import { describe, it, expect, beforeAll, beforeEach } from "vitest"
import { createTestApp } from "@/lib/test/app"
import { truncateTables, seedFixtures, seedRedpointAttempts, F } from "@/lib/test/helpers"
import { db } from "@/lib/db"
import { events } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

describe("Redpoint Leaderboard API", () => {
  let app: ReturnType<typeof createTestApp>

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await truncateTables()
    await seedFixtures()
    await seedRedpointAttempts()
  })

  it("returns scoringType redpoint", async () => {
    const res = await app.request("/api/events/redpoint-event/leaderboard")
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.data.scoringType).toBe("redpoint")
  })

  it("returns correct response shape", async () => {
    const res = await app.request("/api/events/redpoint-event/leaderboard")
    const json = await res.json()
    const r = json.data.rankings[0]
    expect(r).toHaveProperty("rank")
    expect(r).toHaveProperty("athlete")
    expect(r).toHaveProperty("category")
    expect(r).toHaveProperty("totalPoints")
    expect(r).toHaveProperty("flashCount")
    expect(r).toHaveProperty("totalAttempts")
  })

  it("Bruno ranks first: 5 tops, 4100 pts, 4 flashes (bestRoutesCount=null)", async () => {
    const res = await app.request("/api/events/redpoint-event/leaderboard")
    const json = await res.json()
    const bruno = json.data.rankings.find((r: any) => r.athlete.name === "Bruno")
    expect(bruno).toBeDefined()
    expect(bruno.rank).toBe(1)
    expect(bruno.totalPoints).toBe(4100)
    expect(bruno.flashCount).toBe(4)
    expect(bruno.totalAttempts).toBe(7)
  })

  it("Carlos ranks second: 4 tops, 3450 pts, 3 flashes (bestRoutesCount=null)", async () => {
    const res = await app.request("/api/events/redpoint-event/leaderboard")
    const json = await res.json()
    const carlos = json.data.rankings.find((r: any) => r.athlete.name === "Carlos")
    expect(carlos).toBeDefined()
    expect(carlos.rank).toBe(2)
    expect(carlos.totalPoints).toBe(3450)
    expect(carlos.flashCount).toBe(3)
    expect(carlos.totalAttempts).toBe(5)
  })

  it("Andre ranks third: 3 tops, 2600 pts, 1 flash (bestRoutesCount=null)", async () => {
    const res = await app.request("/api/events/redpoint-event/leaderboard")
    const json = await res.json()
    const andre = json.data.rankings.find((r: any) => r.athlete.name === "Andre")
    expect(andre).toBeDefined()
    expect(andre.rank).toBe(3)
    expect(andre.totalPoints).toBe(2600)
    expect(andre.flashCount).toBe(1)
    expect(andre.totalAttempts).toBe(6)
  })

  it("filters by category_id", async () => {
    const res = await app.request(
      `/api/events/redpoint-event/leaderboard?category_id=${F.catRedOpen.id}`,
    )
    const json = await res.json()
    for (const r of json.data.rankings) {
      expect(r.category).toBe("Open")
    }
  })

  it("bestRoutesCount=null: all routes count toward total", async () => {
    const res = await app.request("/api/events/redpoint-event/leaderboard")
    const json = await res.json()
    const carlos = json.data.rankings.find((r: any) => r.athlete.name === "Carlos")
    expect(carlos.totalPoints).toBe(3450)
  })

  it("bestRoutesCount=3: only best 3 routes count", async () => {
    await db.update(events).set({ bestRoutesCount: 3 }).where(eq(events.id, F.redpointEvent.id))

    const res = await app.request("/api/events/redpoint-event/leaderboard")
    const json = await res.json()
    const carlos = json.data.rankings.find((r: any) => r.athlete.name === "Carlos")
    expect(carlos.totalPoints).toBe(2950)
    expect(carlos.totalAttempts).toBe(4)
  })

  it("bestRoutesCount=2: only best 2 routes count", async () => {
    await db.update(events).set({ bestRoutesCount: 2 }).where(eq(events.id, F.redpointEvent.id))

    const res = await app.request("/api/events/redpoint-event/leaderboard")
    const json = await res.json()
    const carlos = json.data.rankings.find((r: any) => r.athlete.name === "Carlos")
    expect(carlos.totalPoints).toBe(2200)
  })

  it("points never go negative", async () => {
    const res = await app.request("/api/events/redpoint-event/leaderboard")
    const json = await res.json()
    for (const r of json.data.rankings) {
      expect(r.totalPoints).toBeGreaterThanOrEqual(0)
    }
  })

  it("no tops = 0 points", async () => {
    await truncateTables()
    await seedFixtures()

    const res = await app.request("/api/events/redpoint-event/leaderboard")
    const json = await res.json()
    expect(json.data.rankings).toEqual([])
  })

  it("returns 404 for non-existent event", async () => {
    const res = await app.request("/api/events/nonexistent/leaderboard")
    expect(res.status).toBe(404)
  })
})
