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
})
