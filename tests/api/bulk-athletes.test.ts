import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest"
import { createTestApp } from "@/lib/test/app"
import { truncateTables, seedFixtures, authHeaders, F } from "@/lib/test/helpers"
import { db } from "@/lib/db"
import { athletes } from "@/lib/db/schema"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

describe("Bulk Athletes Edge Cases", () => {
  let app: ReturnType<typeof createTestApp>

  const adminHeaders = authHeaders(F.admin.id, F.admin.email, { "x-test-event-role": "organizer" })

  beforeAll(async () => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await truncateTables()
    await seedFixtures()
  })

  describe("POST /api/manage/events/:eventId/athletes/bulk", () => {
    it("handles all names being empty after trim", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/athletes/bulk`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          categoryId: F.catMale.id,
          names: ["   ", "\t", "\n", "  \t  "],
        }),
      })
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe("VALIDATION_ERROR")
      expect(json.error.message).toContain("No valid athlete names")
    })

    it("handles names with leading/trailing whitespace", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/athletes/bulk`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          categoryId: F.catMale.id,
          names: ["  Athlete 1  ", "\tAthlete 2\t", "\nAthlete 3\n"],
        }),
      })
      const json = await res.json()

      expect(res.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data.count).toBe(3)

      const created = json.data.created
      expect(created[0].name).toBe("Athlete 1")
      expect(created[1].name).toBe("Athlete 2")
      expect(created[2].name).toBe("Athlete 3")
    })

    it("handles exactly 200 athletes", async () => {
      const names = Array.from({ length: 200 }, (_, i) => `Athlete ${i + 1}`)
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/athletes/bulk`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          categoryId: F.catMale.id,
          names,
        }),
      })
      const json = await res.json()

      expect(res.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data.count).toBe(200)
    })

    it("rejects 201 athletes", async () => {
      const names = Array.from({ length: 201 }, (_, i) => `Athlete ${i + 1}`)
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/athletes/bulk`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          categoryId: F.catMale.id,
          names,
        }),
      })
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe("VALIDATION_ERROR")
      expect(json.error.message).toContain("200")
    })

    it("handles duplicate names", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/athletes/bulk`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          categoryId: F.catMale.id,
          names: ["Athlete A", "Athlete A", "Athlete B"],
        }),
      })
      const json = await res.json()

      expect(res.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data.count).toBe(3)
    })

    it("handles special characters in names", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/athletes/bulk`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          categoryId: F.catMale.id,
          names: ["José María", "François-Xavier", "Åsa Björk"],
        }),
      })
      const json = await res.json()

      expect(res.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data.count).toBe(3)
    })

    it("handles very long names", async () => {
      const longName = "A".repeat(100)
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/athletes/bulk`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          categoryId: F.catMale.id,
          names: [longName],
        }),
      })
      const json = await res.json()

      expect(res.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data.count).toBe(1)
    })

    it("rejects names exceeding max length", async () => {
      const tooLongName = "A".repeat(101)
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/athletes/bulk`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          categoryId: F.catMale.id,
          names: [tooLongName],
        }),
      })
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("handles single athlete", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/athletes/bulk`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          categoryId: F.catMale.id,
          names: ["Solo Athlete"],
        }),
      })
      const json = await res.json()

      expect(res.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data.count).toBe(1)
    })

    it("preserves order of athletes", async () => {
      const names = ["Zebra", "Alpha", "Beta", "Gamma"]
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/athletes/bulk`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          categoryId: F.catMale.id,
          names,
        }),
      })
      const json = await res.json()

      expect(res.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data.count).toBe(4)

      const createdNames = json.data.created.map((a: any) => a.name)
      expect(createdNames).toEqual(names)
    })
  })
})
