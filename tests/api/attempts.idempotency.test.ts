import { describe, it, expect, beforeAll, beforeEach } from "vitest"
import { createTestApp } from "@/lib/test/app"
import { truncateTables, seedFixtures, authHeaders, F } from "@/lib/test/helpers"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

describe("Attempts API Idempotency Edge Cases", () => {
  let app: ReturnType<typeof createTestApp>
  const sectorId = F.sectors[0].id
  const athleteId = F.athletes[0].id
  const judgeHeaders = authHeaders(F.judge.id, F.judge.email, { "x-test-event-role": "judge" })

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await truncateTables()
    await seedFixtures()
  })

  it("duplicate idempotencyKey returns existing attempt with different data", async () => {
    const idempotencyKey = "test-duplicate-key-001"

    const firstAttempt = {
      sectorId,
      athleteId,
      isTop: true,
      attemptCount: 1,
      idempotencyKey,
    }

    const secondAttempt = {
      sectorId,
      athleteId,
      isTop: false,
      attemptCount: 5,
      idempotencyKey,
    }

    const res1 = await app.request("/api/attempts", {
      method: "POST",
      headers: judgeHeaders,
      body: JSON.stringify(firstAttempt),
    })

    const res2 = await app.request("/api/attempts", {
      method: "POST",
      headers: judgeHeaders,
      body: JSON.stringify(secondAttempt),
    })

    expect(res1.status).toBe(201)
    expect(res2.status).toBe(200)

    const json1 = await res1.json()
    const json2 = await res2.json()

    // Should return the first attempt, not the second
    expect(json2.data.id).toBe(json1.data.id)
    expect(json2.data.isTop).toBe(true)
    expect(json2.data.attemptCount).toBe(1)
  })

  it("idempotencyKey with special characters works", async () => {
    const idempotencyKey = "test-key-with-special-chars!@#$%^&*()_+-=[]{}|;':\",./<>?"

    const res1 = await app.request("/api/attempts", {
      method: "POST",
      headers: judgeHeaders,
      body: JSON.stringify({
        sectorId,
        athleteId,
        isTop: true,
        attemptCount: 1,
        idempotencyKey,
      }),
    })

    const res2 = await app.request("/api/attempts", {
      method: "POST",
      headers: judgeHeaders,
      body: JSON.stringify({
        sectorId,
        athleteId,
        isTop: true,
        attemptCount: 1,
        idempotencyKey, // Same key
      }),
    })

    expect(res1.status).toBe(201)
    expect(res2.status).toBe(200)

    const json1 = await res1.json()
    const json2 = await res2.json()

    expect(json2.data.id).toBe(json1.data.id)
  })

  it("very long idempotencyKey works", async () => {
    const idempotencyKey = "a".repeat(1000) // 1000 character key

    const res1 = await app.request("/api/attempts", {
      method: "POST",
      headers: judgeHeaders,
      body: JSON.stringify({
        sectorId,
        athleteId,
        isTop: true,
        attemptCount: 1,
        idempotencyKey,
      }),
    })

    const res2 = await app.request("/api/attempts", {
      method: "POST",
      headers: judgeHeaders,
      body: JSON.stringify({
        sectorId,
        athleteId,
        isTop: true,
        attemptCount: 1,
        idempotencyKey, // Same key
      }),
    })

    expect(res1.status).toBe(201)
    expect(res2.status).toBe(200)
  })

  it("idempotency with concurrent requests returns same result", async () => {
    const idempotencyKey = "test-concurrent-key-001"

    const attemptData = {
      sectorId,
      athleteId,
      isTop: true,
      attemptCount: 1,
      idempotencyKey,
    }

    const [res1, res2] = await Promise.all([
      app.request("/api/attempts", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify(attemptData),
      }),
      app.request("/api/attempts", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify(attemptData),
      }),
    ])

    // One should be 201 (created), one should be 200 (existing)
    const statuses = [res1.status, res2.status].sort()
    expect(statuses).toEqual([200, 201])

    const json1 = await res1.json()
    const json2 = await res2.json()

    // Both should return the same attempt data
    expect(json1.data.id).toBe(json2.data.id)
  })

  it("duplicate idempotencyKey with different data returns first attempt", async () => {
    const idempotencyKey = "test-diff-data-key-001"

    const res1 = await app.request("/api/attempts", {
      method: "POST",
      headers: judgeHeaders,
      body: JSON.stringify({
        sectorId,
        athleteId,
        isTop: true,
        attemptCount: 1,
        idempotencyKey,
      }),
    })

    const res2 = await app.request("/api/attempts", {
      method: "POST",
      headers: judgeHeaders,
      body: JSON.stringify({
        sectorId,
        athleteId,
        isTop: false,
        attemptCount: 5,
        idempotencyKey,
      }),
    })

    expect(res1.status).toBe(201)
    expect(res2.status).toBe(200)

    const json1 = await res1.json()
    const json2 = await res2.json()

    expect(json2.data.id).toBe(json1.data.id)
    expect(json2.data.isTop).toBe(true)
    expect(json2.data.attemptCount).toBe(1)
  })
})
