import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest"
import { createTestApp } from "@/lib/test/app"
import { truncateTables, seedFixtures, authHeaders, F } from "@/lib/test/helpers"
import { db } from "@/lib/db"
import { events, categories, sectors, athletes } from "@/lib/db/schema"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

describe("Admin API Validation", () => {
  let app: ReturnType<typeof createTestApp>

  const adminHeaders = authHeaders(F.admin.id, F.admin.email, { "x-test-event-role": "organizer" })

  beforeAll(async () => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await truncateTables()
    await seedFixtures()
  })

  describe("POST /api/manage/events", () => {
    it("rejects missing required fields", async () => {
      const res = await app.request("/api/manage/events", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ name: "Test Event" }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("rejects invalid slug format", async () => {
      const res = await app.request("/api/manage/events", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          name: "Test Event",
          slug: "Invalid Slug!",
          gymId: F.gym.id,
        }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
      expect(json.error.message).toContain("lowercase alphanumeric")
    })

    it("rejects duplicate slug", async () => {
      await db.insert(events).values({
        id: "test-event-id",
        name: "Existing Event",
        slug: "existing-event",
        gymId: F.gym.id,
        createdBy: F.admin.id,
        status: "draft",
      })

      const res = await app.request("/api/manage/events", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          name: "New Event",
          slug: "existing-event",
          gymId: F.gym.id,
        }),
      })
      const json = await res.json()
      expect(res.status).toBe(409)
      expect(json.error.code).toBe("CONFLICT")
    })

    it("rejects invalid date format", async () => {
      const res = await app.request("/api/manage/events", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          name: "Test Event",
          slug: "test-event",
          gymId: F.gym.id,
          startsAt: "not-a-date",
        }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })
  })

  describe("PATCH /api/manage/events/:id", () => {
    it("rejects invalid scoringType", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}`, {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify({ scoringType: "invalid-type" }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("rejects invalid status", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}`, {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify({ status: "invalid-status" }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("rejects bestRoutesCount = 0", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}`, {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify({ bestRoutesCount: 0 }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("rejects negative bestRoutesCount", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}`, {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify({ bestRoutesCount: -5 }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("rejects NaN for numeric fields", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}`, {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify({ bestRoutesCount: "not-a-number" }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })
  })

  describe("POST /api/manage/events/:eventId/categories", () => {
    it("rejects missing name", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/categories`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ gender: "male" }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("rejects invalid gender", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/categories`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          name: "Test Category",
          gender: "invalid",
        }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("rejects negative minAge", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/categories`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          name: "Test Category",
          minAge: -5,
        }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })
  })

  describe("POST /api/manage/events/:eventId/sectors", () => {
    it("rejects missing name", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/sectors`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ orderIndex: 0 }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("rejects negative flashPoints", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/sectors`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          name: "Test Sector",
          flashPoints: -100,
        }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("rejects maxAttempts = 0", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/sectors`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          name: "Test Sector",
          maxAttempts: 0,
        }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })
  })

  describe("POST /api/manage/events/:eventId/athletes/bulk", () => {
    it("rejects empty names array", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/athletes/bulk`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          categoryId: F.catMale.id,
          names: [],
        }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("rejects names array with only whitespace", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/athletes/bulk`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          categoryId: F.catMale.id,
          names: ["   ", "\t", "\n"],
        }),
      })
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error.code).toBe("VALIDATION_ERROR")
    })

    it("rejects more than 200 athletes", async () => {
      const names = Array.from({ length: 201 }, (_, i) => `Athlete ${i}`)
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
      expect(json.error.code).toBe("VALIDATION_ERROR")
      expect(json.error.message).toContain("200")
    })
  })
})
