import { describe, it, expect, beforeAll, beforeEach } from "vitest"
import { createTestApp } from "@/lib/test/app"
import { truncateTables, seedFixtures, authHeaders, F } from "@/lib/test/helpers"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

describe("Admin API", () => {
  let app: ReturnType<typeof createTestApp>
  const adminHeaders = authHeaders(F.admin.id, F.admin.email, { "x-test-event-role": "organizer" })
  const judgeHeaders = authHeaders(F.judge.id, F.judge.email)
  const userHeaders = authHeaders(F.user.id, F.user.email)
  const noAuthHeaders = { "Content-Type": "application/json" }

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await truncateTables()
    await seedFixtures()
  })

  describe("Auth guards", () => {
    it("GET /manage/events returns 401 if not authenticated", async () => {
      const res = await app.request("/api/manage/events", { headers: noAuthHeaders })
      expect(res.status).toBe(401)
    })

    it("GET /manage/events returns 200 for any authenticated user (their events)", async () => {
      const res = await app.request("/api/manage/events", { headers: userHeaders })
      expect(res.status).toBe(200)
    })

    it("POST /manage/events returns 201 for any authenticated user", async () => {
      const res = await app.request("/api/manage/events", {
        method: "POST",
        headers: userHeaders,
        body: JSON.stringify({ name: "x", slug: "x" }),
      })
      expect(res.status).toBe(201)
    })
  })

  describe("GET /manage/events", () => {
    it("returns all events including drafts", async () => {
      const res = await app.request("/api/manage/events", { headers: adminHeaders })
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.length).toBe(3)
    })

    it("returns events with all fields", async () => {
      const res = await app.request("/api/manage/events", { headers: adminHeaders })
      const json = await res.json()
      const event = json.data.find((e: any) => e.id === F.simpleEvent.id)
      expect(event.scoringType).toBe("simple")
      expect(event.status).toBe("active")
      expect(event.gymId).toBe(F.gym.id)
    })
  })

  describe("POST /manage/events", () => {
    it("creates a new event", async () => {
      const res = await app.request("/api/manage/events", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          name: "New Event",
          slug: "new-event",
          gymId: F.gym.id,
          scoringType: "simple",
        }),
      })
      const json = await res.json()
      expect(res.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data.name).toBe("New Event")
      expect(json.data.slug).toBe("new-event")
      expect(json.data.status).toBe("draft")
    })

    it("returns 400 if name is missing", async () => {
      const res = await app.request("/api/manage/events", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ slug: "x", gymId: F.gym.id }),
      })
      expect(res.status).toBe(400)
    })

    it("returns 400 if slug is missing", async () => {
      const res = await app.request("/api/manage/events", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ name: "Test", gymId: F.gym.id }),
      })
      expect(res.status).toBe(400)
    })

    it("returns 400 if slug has invalid characters", async () => {
      const res = await app.request("/api/manage/events", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ name: "Test", slug: "Invalid Slug!", gymId: F.gym.id }),
      })
      expect(res.status).toBe(400)
    })

    it("returns 409 if slug already exists", async () => {
      const res = await app.request("/api/manage/events", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          name: "Duplicate",
          slug: "simple-event",
          gymId: F.gym.id,
        }),
      })
      expect(res.status).toBe(409)
    })

    it("writes audit log", async () => {
      await app.request("/api/manage/events", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          name: "Audited Event",
          slug: "audited-event",
          gymId: F.gym.id,
        }),
      })
      const { db } = await import("@/lib/db")
      const { auditLogs } = await import("@/lib/db/schema")
      const logs = await db.select().from(auditLogs)
      const eventLog = logs.find((l: any) => l.action === "event.create")
      expect(eventLog?.resourceType).toBe("event")
      expect(eventLog?.userId).toBe(F.admin.id)
    })
  })

  describe("GET /manage/events/:id", () => {
    it("returns event with categories, sectors, and athletes", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}`, {
        headers: adminHeaders,
      })
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.data.categories.length).toBe(2)
      expect(json.data.sectors.length).toBe(3)
      expect(json.data.athletes.length).toBe(5)
    })

    it("returns 404 for non-existent event", async () => {
      const res = await app.request("/api/manage/events/00000000-0000-0000-0000-000000000000", {
        headers: adminHeaders,
      })
      expect(res.status).toBe(404)
    })
  })

  describe("PATCH /manage/events/:id", () => {
    it("updates event fields", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}`, {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify({ name: "Updated Event", status: "published" }),
      })
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.data.name).toBe("Updated Event")
      expect(json.data.status).toBe("published")
    })

    it("returns 404 for non-existent event", async () => {
      const res = await app.request("/api/manage/events/00000000-0000-0000-0000-000000000000", {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify({ name: "X" }),
      })
      expect(res.status).toBe(404)
    })

    it("writes audit log with old and new values", async () => {
      await app.request(`/api/manage/events/${F.simpleEvent.id}`, {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify({ status: "completed" }),
      })
      const { db } = await import("@/lib/db")
      const { auditLogs } = await import("@/lib/db/schema")
      const logs = await db.select().from(auditLogs)
      const log = logs.find((l: any) => l.action === "event.update")
      expect(log?.oldValues).toBeDefined()
      expect(log?.newValues).toBeDefined()
    })
  })

  describe("DELETE /manage/events/:id", () => {
    it("deletes event and cascading data", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}`, {
        method: "DELETE",
        headers: adminHeaders,
      })
      expect(res.status).toBe(200)

      const getRes = await app.request(`/api/manage/events/${F.simpleEvent.id}`, {
        headers: adminHeaders,
      })
      expect(getRes.status).toBe(404)
    })

    it("returns 404 for non-existent event", async () => {
      const res = await app.request("/api/manage/events/00000000-0000-0000-0000-000000000000", {
        method: "DELETE",
        headers: adminHeaders,
      })
      expect(res.status).toBe(404)
    })

    it("writes audit log", async () => {
      await app.request(`/api/manage/events/${F.simpleEvent.id}`, {
        method: "DELETE",
        headers: adminHeaders,
      })
      const { db } = await import("@/lib/db")
      const { auditLogs } = await import("@/lib/db/schema")
      const logs = await db.select().from(auditLogs)
      const log = logs.find((l: any) => l.action === "event.delete")
      expect(log?.resourceId).toBe(F.simpleEvent.id)
    })
  })

  describe("Categories CRUD", () => {
    it("creates a category", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/categories`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ name: "Open", gender: "open" }),
      })
      const json = await res.json()
      expect(res.status).toBe(201)
      expect(json.data.name).toBe("Open")
      expect(json.data.gender).toBe("open")
    })

    it("returns 400 if name is missing", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/categories`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ gender: "male" }),
      })
      expect(res.status).toBe(400)
    })

    it("updates a category", async () => {
      const res = await app.request(
        `/api/manage/events/${F.simpleEvent.id}/categories/${F.catMale.id}`,
        {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({ name: "Masculino Elite" }),
        },
      )
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.data.name).toBe("Masculino Elite")
    })

    it("deletes a category", async () => {
      const res = await app.request(
        `/api/manage/events/${F.simpleEvent.id}/categories/${F.catMale.id}`,
        {
          method: "DELETE",
          headers: adminHeaders,
        },
      )
      expect(res.status).toBe(200)
    })
  })

  describe("Sectors CRUD", () => {
    it("creates a sector", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/sectors`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ name: "Problema 4", orderIndex: 3 }),
      })
      const json = await res.json()
      expect(res.status).toBe(201)
      expect(json.data.name).toBe("Problema 4")
      expect(json.data.orderIndex).toBe(3)
    })

    it("returns 400 if name is missing", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/sectors`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ orderIndex: 99 }),
      })
      expect(res.status).toBe(400)
    })

    it("updates a sector", async () => {
      const res = await app.request(
        `/api/manage/events/${F.simpleEvent.id}/sectors/${F.sectors[0].id}`,
        {
          method: "PATCH",
          headers: adminHeaders,
          body: JSON.stringify({ name: "Updated Sector" }),
        },
      )
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.data.name).toBe("Updated Sector")
    })

    it("deletes a sector", async () => {
      const res = await app.request(
        `/api/manage/events/${F.simpleEvent.id}/sectors/${F.sectors[0].id}`,
        {
          method: "DELETE",
          headers: adminHeaders,
        },
      )
      expect(res.status).toBe(200)
    })
  })

  describe("Athletes CRUD", () => {
    it("creates an athlete", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/athletes`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          name: "New Athlete",
          categoryId: F.catMale.id,
        }),
      })
      const json = await res.json()
      expect(res.status).toBe(201)
      expect(json.data.name).toBe("New Athlete")
    })

    it("returns 400 if name or categoryId missing", async () => {
      const res = await app.request(`/api/manage/events/${F.simpleEvent.id}/athletes`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ name: "X" }),
      })
      expect(res.status).toBe(400)
    })

    it("bulk creates athletes", async () => {
      const res = await app.request(
        `/api/manage/events/${F.simpleEvent.id}/athletes/bulk`,
        {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({
            categoryId: F.catMale.id,
            names: ["Athlete A", "Athlete B", "Athlete C"],
          }),
        },
      )
      const json = await res.json()
      expect(res.status).toBe(201)
      expect(json.data.count).toBe(3)
    })

    it("returns 400 if bulk names is empty", async () => {
      const res = await app.request(
        `/api/manage/events/${F.simpleEvent.id}/athletes/bulk`,
        {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({ categoryId: F.catMale.id, names: [] }),
        },
      )
      expect(res.status).toBe(400)
    })

    it("returns 400 if bulk exceeds 200", async () => {
      const names = Array.from({ length: 201 }, (_, i) => `Athlete ${i}`)
      const res = await app.request(
        `/api/manage/events/${F.simpleEvent.id}/athletes/bulk`,
        {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({ categoryId: F.catMale.id, names }),
        },
      )
      expect(res.status).toBe(400)
    })

    it("deletes an athlete", async () => {
      const res = await app.request(
        `/api/manage/events/${F.simpleEvent.id}/athletes/${F.athletes[0].id}`,
        {
          method: "DELETE",
          headers: adminHeaders,
        },
      )
      expect(res.status).toBe(200)
    })
  })

  describe("GET /manage/gyms", () => {
    it("returns gyms for admin", async () => {
      const res = await app.request("/api/manage/gyms", { headers: adminHeaders })
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.data.length).toBe(1)
    })
  })

  describe("GET /manage/audit-logs", () => {
    it("returns audit logs", async () => {
      await app.request("/api/manage/events", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ name: "X", slug: "x", gymId: F.gym.id }),
      })

      const res = await app.request("/api/manage/audit-logs", { headers: adminHeaders })
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.data.logs.length).toBeGreaterThanOrEqual(1)
      expect(json.data.meta).toHaveProperty("page")
      expect(json.data.meta).toHaveProperty("perPage")
      expect(json.data.meta).toHaveProperty("total")
    })

    it("filters by resource_type", async () => {
      await app.request("/api/manage/events", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ name: "X", slug: "x", gymId: F.gym.id }),
      })

      const res = await app.request("/api/manage/audit-logs?resource_type=event", {
        headers: adminHeaders,
      })
      const json = await res.json()
      for (const log of json.data.logs) {
        expect(log.resourceType).toBe("event")
      }
    })
  })
})
