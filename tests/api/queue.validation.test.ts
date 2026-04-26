import { describe, it, expect, beforeAll, beforeEach } from "vitest"
import { createTestApp } from "@/lib/test/app"
import { truncateTables, seedFixtures, authHeaders, F } from "@/lib/test/helpers"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

describe("Queue Validation Edge Cases", () => {
  let app: ReturnType<typeof createTestApp>
  const judgeHeaders = authHeaders(F.judge.id, F.judge.email, { "x-test-event-role": "judge" })

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await truncateTables()
    await seedFixtures()
  })

  describe("POST /queue/join", () => {
    it("rejects invalid UUID for sectorId", async () => {
      const res = await app.request("/api/queue/join", {
        method: "POST",
        headers: authHeaders(F.athletes[0].id, F.user.email),
        body: JSON.stringify({ sectorId: "not-a-uuid", athleteId: F.athletes[0].id }),
      })
      expect(res.status).toBe(400)
    })

    it("rejects invalid UUID for athleteId", async () => {
      const res = await app.request("/api/queue/join", {
        method: "POST",
        headers: authHeaders(F.athletes[0].id, F.user.email),
        body: JSON.stringify({ sectorId: F.sectors[0].id, athleteId: "not-a-uuid" }),
      })
      expect(res.status).toBe(400)
    })

    it("returns 404 for non-existent sectorId", async () => {
      const res = await app.request("/api/queue/join", {
        method: "POST",
        headers: authHeaders(F.athletes[0].id, F.user.email),
        body: JSON.stringify({
          sectorId: "00000000-0000-0000-0000-999999999999",
          athleteId: F.athletes[0].id,
        }),
      })
      expect(res.status).toBe(404)
    })
  })

  describe("POST /queue/pop", () => {
    it("rejects invalid UUID for sectorId", async () => {
      const res = await app.request("/api/queue/pop", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify({ sectorId: "not-a-uuid" }),
      })
      expect(res.status).toBe(400)
    })

    it("returns 404 for non-existent sector", async () => {
      const res = await app.request("/api/queue/pop", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify({ sectorId: "00000000-0000-0000-0000-999999999999" }),
      })
      expect(res.status).toBe(404)
    })
  })

  describe("POST /queue/drop", () => {
    it("rejects invalid UUID for queueId", async () => {
      const res = await app.request("/api/queue/drop", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify({ queueId: "not-a-uuid" }),
      })
      expect(res.status).toBe(400)
    })

    it("rejects missing queueId", async () => {
      const res = await app.request("/api/queue/drop", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(400)
    })
  })

  describe("GET /queue/status", () => {
    it("rejects invalid UUID for sector_id", async () => {
      const res = await app.request("/api/queue/status?sector_id=not-a-uuid", {
        headers: authHeaders(F.athletes[0].id, F.user.email),
      })
      expect(res.status).toBe(400)
    })
  })
})