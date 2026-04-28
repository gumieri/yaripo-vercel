import { describe, it, expect, beforeAll, beforeEach } from "vitest"
import { createTestApp } from "@/lib/test/app"
import { truncateTables, seedFixtures, authHeaders, F } from "@/lib/test/helpers"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

describe("Venues API", () => {
  let app: ReturnType<typeof createTestApp>

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await truncateTables()
  })

  describe("GET /venues", () => {
    it("returns empty list when no venues", async () => {
      const res = await app.request("/api/venues")
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual([])
    })

    it("returns venue list", async () => {
      await seedFixtures()
      const res = await app.request("/api/venues")
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.data.length).toBe(1)
      expect(json.data[0].name).toBe("Test Venue")
      expect(json.data[0].slug).toBe("test-venue")
      expect(json.data[0].city).toBe("Sao Paulo")
    })
  })

  describe("GET /venues/:slug", () => {
    it("returns venue by slug", async () => {
      await seedFixtures()
      const res = await app.request("/api/venues/test-venue")
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.data.name).toBe("Test Venue")
      expect(json.data.slug).toBe("test-venue")
    })

    it("returns 404 for non-existent slug", async () => {
      const res = await app.request("/api/venues/nonexistent")
      expect(res.status).toBe(404)
    })
  })

  describe("POST /manage/venues", () => {
    const adminHeaders = authHeaders(F.admin.id, F.admin.email, {
      "x-test-event-role": "organizer",
    })

    it("creates a new venue", async () => {
      const body = {
        name: "New Venue",
        slug: "new-venue",
        city: "Rio de Janeiro",
        state: "RJ",
        type: "outdoor",
        description: "Outdoor climbing area",
        address: "Botafogo Beach",
        latitude: -22.9519,
        longitude: -43.1829,
        socialLinks: { instagram: "@newvenue" },
      }

      const res = await app.request("/api/manage/venues", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify(body),
      })
      const json = await res.json()

      expect(res.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data.name).toBe("New Venue")
      expect(json.data.slug).toBe("new-venue")
      expect(json.data.type).toBe("outdoor")
      expect(json.data.city).toBe("Rio de Janeiro")
      expect(json.data.state).toBe("RJ")
      expect(json.data.address).toBe("Botafogo Beach")
      expect(json.data.latitude).toBe(-22.9519)
      expect(json.data.longitude).toBe(-43.1829)
    })

    it("rejects duplicate slug", async () => {
      await seedFixtures()

      const res = await app.request("/api/manage/venues", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          name: "Duplicate",
          slug: "test-venue",
          city: "Sao Paulo",
          type: "gym",
        }),
      })

      expect(res.status).toBe(409)
    })

    it("requires authentication", async () => {
      const res = await app.request("/api/manage/venues", {
        method: "POST",
        body: JSON.stringify({ name: "Test", slug: "test" }),
      })

      expect(res.status).toBe(401)
    })

    it("requires platform admin", async () => {
      const userHeaders = authHeaders(F.user.id, F.user.email)

      const res = await app.request("/api/venues/new-venue", {
        method: "POST",
        headers: userHeaders,
        body: JSON.stringify({ name: "Test", slug: "test" }),
      })

      expect(res.status).toBe(403)
    })

    it("validates required fields", async () => {
      const res = await app.request("/api/manage/venues", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ slug: "test" }),
      })

      expect(res.status).toBe(400)
    })

    it("validates slug format", async () => {
      const res = await app.request("/api/manage/venues", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ name: "Test", slug: "Invalid Slug!" }),
      })

      expect(res.status).toBe(400)
    })

    it("validates coordinates", async () => {
      const res = await app.request("/api/manage/venues", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          name: "Test",
          slug: "test",
          latitude: 200,
          longitude: 200,
        }),
      })

      expect(res.status).toBe(400)
    })
  })

  describe("PATCH /manage/venues/:id", () => {
    const adminHeaders = authHeaders(F.admin.id, F.admin.email, {
      "x-test-event-role": "organizer",
    })

    beforeEach(async () => {
      await seedFixtures()
    })

    it("updates venue", async () => {
      const body = { name: "Updated Venue", description: "New description" }

      const res = await app.request(`/api/manage/venues/${F.venue.id}`, {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify(body),
      })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.name).toBe("Updated Venue")
      expect(json.data.description).toBe("New description")
    })

    it("does not update slug", async () => {
      const res = await app.request(`/api/manage/venues/${F.venue.id}`, {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify({ slug: "new-slug" }),
      })

      expect(res.status).toBe(400)
    })

    it("requires platform admin", async () => {
      const userHeaders = authHeaders(F.user.id, F.user.email)

      const res = await app.request(`/api/venues/${F.venue.id}`, {
        method: "PATCH",
        headers: userHeaders,
        body: JSON.stringify({ name: "Test" }),
      })

      expect(res.status).toBe(403)
    })

    it("returns 404 for non-existent venue", async () => {
      const res = await app.request("/api/manage/venues/00000000-0000-0000-0000-000000000999", {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify({ name: "Test" }),
      })

      expect(res.status).toBe(404)
    })
  })

  describe("DELETE /manage/venues/:id", () => {
    const adminHeaders = authHeaders(F.admin.id, F.admin.email, {
      "x-test-event-role": "organizer",
    })

    beforeEach(async () => {
      await seedFixtures()
    })

    it("deletes venue", async () => {
      const res = await app.request(`/api/manage/venues/${F.venue.id}`, {
        method: "DELETE",
        headers: adminHeaders,
      })

      expect(res.status).toBe(200)

      const verify = await app.request("/api/venues/test-venue")
      expect(verify.status).toBe(404)
    })

    it("requires platform admin", async () => {
      const userHeaders = authHeaders(F.user.id, F.user.email)

      const res = await app.request(`/api/venues/${F.venue.id}`, {
        method: "DELETE",
        headers: userHeaders,
      })

      expect(res.status).toBe(403)
    })

    it("returns 404 for non-existent venue", async () => {
      const res = await app.request("/api/manage/venues/00000000-0000-0000-0000-000000000999", {
        method: "DELETE",
        headers: adminHeaders,
      })

      expect(res.status).toBe(404)
    })
  })
})
