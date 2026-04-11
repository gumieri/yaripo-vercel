import { describe, it, expect, beforeAll, beforeEach } from "vitest"
import { createTestApp } from "@/lib/test/app"
import { truncateTables, seedFixtures, authHeaders, F } from "@/lib/test/helpers"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

describe("Gyms API", () => {
  let app: ReturnType<typeof createTestApp>

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(async () => {
    await truncateTables()
  })

  describe("GET /gyms", () => {
    it("returns empty list when no gyms", async () => {
      const res = await app.request("/api/gyms")
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual([])
    })

    it("returns gym list", async () => {
      await seedFixtures()
      const res = await app.request("/api/gyms")
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.data.length).toBe(1)
      expect(json.data[0].name).toBe("Test Gym")
      expect(json.data[0].slug).toBe("test-gym")
      expect(json.data[0].city).toBe("Sao Paulo")
    })
  })

  describe("GET /gyms/:slug", () => {
    it("returns gym by slug", async () => {
      await seedFixtures()
      const res = await app.request("/api/gyms/test-gym")
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.data.name).toBe("Test Gym")
      expect(json.data.slug).toBe("test-gym")
    })

    it("returns 404 for non-existent slug", async () => {
      const res = await app.request("/api/gyms/nonexistent")
      expect(res.status).toBe(404)
    })
  })
})
