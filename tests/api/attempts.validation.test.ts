import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest"
import { createTestApp } from "@/lib/test/app"
import { truncateTables, seedFixtures, authHeaders, F } from "@/lib/test/helpers"
import { db } from "@/lib/db"
import { attempts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

describe("Attempts API Validation", () => {
  let app: ReturnType<typeof createTestApp>

  const judgeHeaders = authHeaders(F.judge.id, "judge")

  beforeAll(async () => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await truncateTables()
    await seedFixtures()
  })

  describe("POST /api/attempts", () => {
    it("rejects missing required fields", async () => {
      const res = await app.request("/api/attempts", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify({ sectorId: F.sectors[0].id }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("rejects attemptCount = 0", async () => {
      const res = await app.request("/api/attempts", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify({
          sectorId: F.sectors[0].id,
          athleteId: F.athletes[0].id,
          attemptCount: 0,
          idempotencyKey: crypto.randomUUID(),
        }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("rejects negative attemptCount", async () => {
      const res = await app.request("/api/attempts", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify({
          sectorId: F.sectors[0].id,
          athleteId: F.athletes[0].id,
          attemptCount: -5,
          idempotencyKey: crypto.randomUUID(),
        }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("rejects NaN for attemptCount", async () => {
      const res = await app.request("/api/attempts", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify({
          sectorId: F.sectors[0].id,
          athleteId: F.athletes[0].id,
          attemptCount: "not-a-number",
          idempotencyKey: crypto.randomUUID(),
        }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("rejects invalid UUID for sectorId", async () => {
      const res = await app.request("/api/attempts", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify({
          sectorId: "not-a-uuid",
          athleteId: F.athletes[0].id,
          idempotencyKey: crypto.randomUUID(),
        }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("rejects invalid UUID for athleteId", async () => {
      const res = await app.request("/api/attempts", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify({
          sectorId: F.sectors[0].id,
          athleteId: "not-a-uuid",
          idempotencyKey: crypto.randomUUID(),
        }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("rejects empty idempotencyKey", async () => {
      const res = await app.request("/api/attempts", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify({
          sectorId: F.sectors[0].id,
          athleteId: F.athletes[0].id,
          idempotencyKey: "",
        }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("returns existing attempt on duplicate idempotencyKey", async () => {
      const idempotencyKey = crypto.randomUUID()

      const firstRes = await app.request("/api/attempts", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify({
          sectorId: F.sectors[0].id,
          athleteId: F.athletes[0].id,
          isTop: true,
          attemptCount: 1,
          idempotencyKey,
        }),
      })
      expect(firstRes.status).toBe(201)

      const secondRes = await app.request("/api/attempts", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify({
          sectorId: F.sectors[0].id,
          athleteId: F.athletes[0].id,
          isTop: false,
          attemptCount: 5,
          idempotencyKey,
        }),
      })
      const json = await secondRes.json()
      expect(secondRes.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.isTop).toBe(true)
      expect(json.data.attemptCount).toBe(1)
    })

    it("auto-completes active queue entry", async () => {
      const idempotencyKey = crypto.randomUUID()

      const queueRes = await app.request("/api/queue/join", {
        method: "POST",
        headers: authHeaders(F.athletes[0].id, "athlete"),
        body: JSON.stringify({
          sectorId: F.sectors[0].id,
          athleteId: F.athletes[0].id,
        }),
      })
      expect(queueRes.status).toBe(201)

      const popRes = await app.request("/api/queue/pop", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify({ sectorId: F.sectors[0].id }),
      })
      expect(popRes.status).toBe(200)

      const attemptRes = await app.request("/api/attempts", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify({
          sectorId: F.sectors[0].id,
          athleteId: F.athletes[0].id,
          isTop: true,
          attemptCount: 1,
          idempotencyKey,
        }),
      })
      expect(attemptRes.status).toBe(201)

      const [attempt] = await db
        .select()
        .from(attempts)
        .where(eq(attempts.idempotencyKey, idempotencyKey))
      expect(attempt).toBeDefined()
    })
  })
})
