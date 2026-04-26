import { describe, it, expect, beforeAll, beforeEach } from "vitest"
import { createTestApp } from "@/lib/test/app"
import { truncateTables, seedFixtures, authHeaders, F } from "@/lib/test/helpers"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

describe("Queue Concurrency", () => {
  let app: ReturnType<typeof createTestApp>
  const sectorId = F.sectors[0].id
  const judgeHeaders = authHeaders(F.judge.id, F.judge.email, { "x-test-event-role": "judge" })

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await truncateTables()
    await seedFixtures()
  })

  it("only one judge pops a given queue entry (atomic pop)", async () => {
    const a1 = F.athletes[0].id

    await app.request("/api/queue/join", {
      method: "POST",
      headers: authHeaders(a1, F.user.email),
      body: JSON.stringify({ sectorId, athleteId: a1 }),
    })

    const [pop1, pop2] = await Promise.all([
      app.request("/api/queue/pop", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify({ sectorId }),
      }),
      app.request("/api/queue/pop", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify({ sectorId }),
      }),
    ])

    const json1 = await pop1.json()
    const json2 = await pop2.json()

    const successCount = [json1, json2].filter((r) => r.data !== null).length
    expect(successCount).toBe(1)
  })

  it("two concurrent pops each get different entries", async () => {
    const a1 = F.athletes[0].id
    const a2 = F.athletes[1].id

    await app.request("/api/queue/join", {
      method: "POST",
      headers: authHeaders(a1, F.user.email),
      body: JSON.stringify({ sectorId, athleteId: a1 }),
    })
    await app.request("/api/queue/join", {
      method: "POST",
      headers: authHeaders(a2, F.user.email),
      body: JSON.stringify({ sectorId, athleteId: a2 }),
    })

    const [pop1, pop2] = await Promise.all([
      app.request("/api/queue/pop", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify({ sectorId }),
      }),
      app.request("/api/queue/pop", {
        method: "POST",
        headers: judgeHeaders,
        body: JSON.stringify({ sectorId }),
      }),
    ])

    const json1 = await pop1.json()
    const json2 = await pop2.json()

    const athleteIds = [json1.data?.athlete?.id, json2.data?.athlete?.id].filter(Boolean)
    const uniqueIds = new Set(athleteIds)
    expect(uniqueIds.size).toBe(2)
  })

  it("concurrent join for same athlete results in conflict", async () => {
    const a1 = F.athletes[0].id

    const [join1, join2] = await Promise.all([
      app.request("/api/queue/join", {
        method: "POST",
        headers: authHeaders(a1, F.user.email),
        body: JSON.stringify({ sectorId, athleteId: a1 }),
      }),
      app.request("/api/queue/join", {
        method: "POST",
        headers: authHeaders(a1, F.user.email),
        body: JSON.stringify({ sectorId, athleteId: a1 }),
      }),
    ])

    const statuses = [join1.status, join2.status].sort()
    expect(statuses).toEqual([201, 409])
  })

  it("dropped entry does not reappear on subsequent pop", async () => {
    const a1 = F.athletes[0].id

    const joinRes = await app.request("/api/queue/join", {
      method: "POST",
      headers: authHeaders(a1, F.user.email),
      body: JSON.stringify({ sectorId, athleteId: a1 }),
    })
    const { data: queueEntry } = await joinRes.json()

    await app.request("/api/queue/drop", {
      method: "POST",
      headers: judgeHeaders,
      body: JSON.stringify({ queueId: queueEntry.id }),
    })

    const popRes = await app.request("/api/queue/pop", {
      method: "POST",
      headers: judgeHeaders,
      body: JSON.stringify({ sectorId }),
    })
    const json = await popRes.json()
    expect(json.data).toBeNull()
  })

  it("dropped athlete can rejoin queue and get new position", async () => {
    const a1 = F.athletes[0].id

    const joinRes = await app.request("/api/queue/join", {
      method: "POST",
      headers: authHeaders(a1, F.user.email),
      body: JSON.stringify({ sectorId, athleteId: a1 }),
    })
    expect(joinRes.status).toBe(201)

    const { data: queueEntry } = await joinRes.json()

    await app.request("/api/queue/drop", {
      method: "POST",
      headers: judgeHeaders,
      body: JSON.stringify({ queueId: queueEntry.id }),
    })

    const rejoinRes = await app.request("/api/queue/join", {
      method: "POST",
      headers: authHeaders(a1, F.user.email),
      body: JSON.stringify({ sectorId, athleteId: a1 }),
    })
    expect(rejoinRes.status).toBe(201)

    const { data: newQueueEntry } = await rejoinRes.json()
    expect(newQueueEntry.id).not.toBe(queueEntry.id)
  })
})
