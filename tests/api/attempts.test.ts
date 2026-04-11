import { describe, it, expect, beforeAll, beforeEach } from "vitest"
import { createTestApp } from "@/lib/test/app"
import { truncateTables, seedFixtures, authHeaders, F } from "@/lib/test/helpers"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

describe("Attempts API", () => {
  let app: ReturnType<typeof createTestApp>
  const sectorId = F.sectors[0].id
  const athleteId = F.athletes[0].id
  const idempotencyKey = "test-idempotency-key-001"

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await truncateTables()
    await seedFixtures()
  })

  it("creates attempt successfully", async () => {
    const res = await app.request("/api/attempts", {
      method: "POST",
      headers: authHeaders(F.judge.id, "judge"),
      body: JSON.stringify({
        sectorId,
        athleteId,
        isTop: true,
        attemptCount: 2,
        idempotencyKey,
      }),
    })
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.data.sectorId).toBe(sectorId)
    expect(json.data.athleteId).toBe(athleteId)
    expect(json.data.isTop).toBe(true)
    expect(json.data.attemptCount).toBe(2)
    expect(json.data.judgeId).toBe(F.judge.id)
  })

  it("is idempotent: same key returns existing attempt", async () => {
    const body = {
      sectorId,
      athleteId,
      isTop: true,
      attemptCount: 1,
      idempotencyKey,
    }

    const res1 = await app.request("/api/attempts", {
      method: "POST",
      headers: authHeaders(F.judge.id, "judge"),
      body: JSON.stringify(body),
    })
    expect(res1.status).toBe(201)

    const res2 = await app.request("/api/attempts", {
      method: "POST",
      headers: authHeaders(F.judge.id, "judge"),
      body: JSON.stringify(body),
    })
    expect(res2.status).toBe(200)
    const json2 = await res2.json()
    expect(json2.success).toBe(true)
    expect(json2.data.idempotencyKey).toBe(idempotencyKey)
  })

  it("returns 400 if missing required fields", async () => {
    const res = await app.request("/api/attempts", {
      method: "POST",
      headers: authHeaders(F.judge.id, "judge"),
      body: JSON.stringify({ sectorId, athleteId }),
    })
    expect(res.status).toBe(400)
  })

  it("returns 401 if not authenticated", async () => {
    const res = await app.request("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectorId, athleteId, idempotencyKey }),
    })
    expect(res.status).toBe(401)
  })

  it("returns 403 if not judge or admin", async () => {
    const res = await app.request("/api/attempts", {
      method: "POST",
      headers: authHeaders(athleteId, "athlete"),
      body: JSON.stringify({ sectorId, athleteId, idempotencyKey }),
    })
    expect(res.status).toBe(403)
  })

  it("auto-marks active queue as completed", async () => {
    await app.request("/api/queue/join", {
      method: "POST",
      headers: authHeaders(athleteId, "athlete"),
      body: JSON.stringify({ sectorId, athleteId }),
    })
    await app.request("/api/queue/pop", {
      method: "POST",
      headers: authHeaders(F.judge.id, "judge"),
      body: JSON.stringify({ sectorId }),
    })

    await app.request("/api/attempts", {
      method: "POST",
      headers: authHeaders(F.judge.id, "judge"),
      body: JSON.stringify({
        sectorId,
        athleteId,
        isTop: true,
        attemptCount: 1,
        idempotencyKey,
      }),
    })

    const { db } = await import("@/lib/db")
    const { sectorQueues } = await import("@/lib/db/schema")
    const { eq, and } = await import("drizzle-orm")
    const [queue] = await db
      .select()
      .from(sectorQueues)
      .where(
        and(eq(sectorQueues.sectorId, sectorId), eq(sectorQueues.athleteId, athleteId)),
      )
    expect(queue.status).toBe("completed")
  })

  it("stores resultData for IFSC attempts", async () => {
    const resultData = { top: true, zone: true, attempts: 2, attempts_to_top: 2 }
    const res = await app.request("/api/attempts", {
      method: "POST",
      headers: authHeaders(F.judge.id, "judge"),
      body: JSON.stringify({
        sectorId,
        athleteId,
        isTop: true,
        attemptCount: 2,
        resultData,
        idempotencyKey: "ifsc-key-001",
      }),
    })
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.data.resultData).toEqual(resultData)
  })

  it("defaults isTop to false and attemptCount to 1", async () => {
    const res = await app.request("/api/attempts", {
      method: "POST",
      headers: authHeaders(F.judge.id, "judge"),
      body: JSON.stringify({
        sectorId,
        athleteId,
        idempotencyKey: "defaults-key",
      }),
    })
    const json = await res.json()
    expect(json.data.isTop).toBe(false)
    expect(json.data.attemptCount).toBe(1)
  })
})
