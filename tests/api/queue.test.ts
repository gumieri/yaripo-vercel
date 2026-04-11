import { describe, it, expect, beforeAll, beforeEach } from "vitest"
import { createTestApp } from "@/lib/test/app"
import { truncateTables, seedFixtures, authHeaders, F } from "@/lib/test/helpers"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

describe("Queue API", () => {
  let app: ReturnType<typeof createTestApp>
  const sectorId = F.sectors[0].id
  const athleteId = F.athletes[0].id

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await truncateTables()
    await seedFixtures()
  })

  describe("POST /queue/join", () => {
    it("creates queue entry", async () => {
      const res = await app.request("/api/queue/join", {
        method: "POST",
        headers: authHeaders(F.athletes[0].id, "athlete"),
        body: JSON.stringify({ sectorId, athleteId }),
      })
      const json = await res.json()
      expect(res.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data.sectorId).toBe(sectorId)
      expect(json.data.athleteId).toBe(athleteId)
      expect(json.data.status).toBe("waiting")
    })

    it("returns 400 if missing sectorId", async () => {
      const res = await app.request("/api/queue/join", {
        method: "POST",
        headers: authHeaders(athleteId, "athlete"),
        body: JSON.stringify({ athleteId }),
      })
      expect(res.status).toBe(400)
    })

    it("returns 400 if missing athleteId", async () => {
      const res = await app.request("/api/queue/join", {
        method: "POST",
        headers: authHeaders(athleteId, "athlete"),
        body: JSON.stringify({ sectorId }),
      })
      expect(res.status).toBe(400)
    })

    it("returns 409 if athlete already in queue", async () => {
      await app.request("/api/queue/join", {
        method: "POST",
        headers: authHeaders(athleteId, "athlete"),
        body: JSON.stringify({ sectorId, athleteId }),
      })
      const res = await app.request("/api/queue/join", {
        method: "POST",
        headers: authHeaders(athleteId, "athlete"),
        body: JSON.stringify({ sectorId, athleteId }),
      })
      const json = await res.json()
      expect(res.status).toBe(409)
      expect(json.error.code).toBe("CONFLICT")
    })

    it("returns 401 if not authenticated", async () => {
      const res = await app.request("/api/queue/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorId, athleteId }),
      })
      expect(res.status).toBe(401)
    })

    it("allows rejoin after queue entry is completed", async () => {
      await app.request("/api/queue/join", {
        method: "POST",
        headers: authHeaders(athleteId, "athlete"),
        body: JSON.stringify({ sectorId, athleteId }),
      })
      const { db } = await import("@/lib/db")
      const { sectorQueues } = await import("@/lib/db/schema")
      const { eq } = await import("drizzle-orm")
      await db
        .update(sectorQueues)
        .set({ status: "completed" })
        .where(eq(sectorQueues.athleteId, athleteId))

      const res = await app.request("/api/queue/join", {
        method: "POST",
        headers: authHeaders(athleteId, "athlete"),
        body: JSON.stringify({ sectorId, athleteId }),
      })
      expect(res.status).toBe(201)
    })
  })

  describe("POST /queue/pop", () => {
    it("pops first waiting entry and marks as active", async () => {
      await app.request("/api/queue/join", {
        method: "POST",
        headers: authHeaders(athleteId, "athlete"),
        body: JSON.stringify({ sectorId, athleteId }),
      })
      const res = await app.request("/api/queue/pop", {
        method: "POST",
        headers: authHeaders(F.judge.id, "judge"),
        body: JSON.stringify({ sectorId }),
      })
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.status).toBe("active")
      expect(json.data.athlete.name).toBe("Lucas")
    })

    it("returns null if queue is empty", async () => {
      const res = await app.request("/api/queue/pop", {
        method: "POST",
        headers: authHeaders(F.judge.id, "judge"),
        body: JSON.stringify({ sectorId }),
      })
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.data).toBeNull()
    })

    it("returns 400 if missing sectorId", async () => {
      const res = await app.request("/api/queue/pop", {
        method: "POST",
        headers: authHeaders(F.judge.id, "judge"),
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(400)
    })

    it("returns 401 if not authenticated", async () => {
      const res = await app.request("/api/queue/pop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorId }),
      })
      expect(res.status).toBe(401)
    })

    it("returns 403 if not judge or admin", async () => {
      const res = await app.request("/api/queue/pop", {
        method: "POST",
        headers: authHeaders(athleteId, "athlete"),
        body: JSON.stringify({ sectorId }),
      })
      expect(res.status).toBe(403)
    })

    it("pops in FIFO order", async () => {
      const a1 = F.athletes[0].id
      const a2 = F.athletes[1].id
      await app.request("/api/queue/join", {
        method: "POST",
        headers: authHeaders(a1, "athlete"),
        body: JSON.stringify({ sectorId, athleteId: a1 }),
      })
      await app.request("/api/queue/join", {
        method: "POST",
        headers: authHeaders(a2, "athlete"),
        body: JSON.stringify({ sectorId, athleteId: a2 }),
      })

      const pop1 = await app.request("/api/queue/pop", {
        method: "POST",
        headers: authHeaders(F.judge.id, "judge"),
        body: JSON.stringify({ sectorId }),
      })
      const json1 = await pop1.json()
      expect(json1.data.athlete.name).toBe("Lucas")

      const pop2 = await app.request("/api/queue/pop", {
        method: "POST",
        headers: authHeaders(F.judge.id, "judge"),
        body: JSON.stringify({ sectorId }),
      })
      const json2 = await pop2.json()
      expect(json2.data.athlete.name).toBe("Rafael")
    })
  })

  describe("POST /queue/drop", () => {
    it("marks queue entry as dropped", async () => {
      const joinRes = await app.request("/api/queue/join", {
        method: "POST",
        headers: authHeaders(athleteId, "athlete"),
        body: JSON.stringify({ sectorId, athleteId }),
      })
      const { data: queueEntry } = await joinRes.json()

      const res = await app.request("/api/queue/drop", {
        method: "POST",
        headers: authHeaders(F.judge.id, "judge"),
        body: JSON.stringify({ queueId: queueEntry.id }),
      })
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.data.status).toBe("dropped")
    })

    it("returns 404 for non-existent queue entry", async () => {
      const res = await app.request("/api/queue/drop", {
        method: "POST",
        headers: authHeaders(F.judge.id, "judge"),
        body: JSON.stringify({ queueId: "00000000-0000-0000-0000-000000000000" }),
      })
      expect(res.status).toBe(404)
    })

    it("returns 403 if not judge or admin", async () => {
      const res = await app.request("/api/queue/drop", {
        method: "POST",
        headers: authHeaders(athleteId, "athlete"),
        body: JSON.stringify({ queueId: "any-id" }),
      })
      expect(res.status).toBe(403)
    })
  })

  describe("GET /queue/status", () => {
    it("returns waiting and active entries", async () => {
      await app.request("/api/queue/join", {
        method: "POST",
        headers: authHeaders(athleteId, "athlete"),
        body: JSON.stringify({ sectorId, athleteId }),
      })
      const res = await app.request(`/api/queue/status?sector_id=${sectorId}`, {
        headers: authHeaders(athleteId, "athlete"),
      })
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.length).toBe(1)
      expect(json.data[0].status).toBe("waiting")
      expect(json.data[0].athleteName).toBe("Lucas")
    })

    it("returns 400 if missing sector_id", async () => {
      const res = await app.request("/api/queue/status", {
        headers: authHeaders(athleteId, "athlete"),
      })
      expect(res.status).toBe(400)
    })

    it("returns 401 if not authenticated", async () => {
      const res = await app.request(`/api/queue/status?sector_id=${sectorId}`)
      expect(res.status).toBe(401)
    })

    it("excludes completed and dropped entries", async () => {
      await app.request("/api/queue/join", {
        method: "POST",
        headers: authHeaders(athleteId, "athlete"),
        body: JSON.stringify({ sectorId, athleteId }),
      })
      const { db } = await import("@/lib/db")
      const { sectorQueues } = await import("@/lib/db/schema")
      const { eq } = await import("drizzle-orm")
      await db
        .update(sectorQueues)
        .set({ status: "completed" })
        .where(eq(sectorQueues.athleteId, athleteId))

      const res = await app.request(`/api/queue/status?sector_id=${sectorId}`, {
        headers: authHeaders(athleteId, "athlete"),
      })
      const json = await res.json()
      expect(json.data).toEqual([])
    })
  })
})
