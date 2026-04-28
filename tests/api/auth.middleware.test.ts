import { describe, it, expect, beforeAll } from "vitest"
import { createTestApp } from "@/lib/test/app"
import { authHeaders, F } from "@/lib/test/helpers"

vi.mock("@/lib/api/middleware/auth", () => import("@/lib/test/mock-auth"))

describe("Auth Middleware", () => {
  let app: ReturnType<typeof createTestApp>

  beforeAll(() => {
    app = createTestApp()
  })

  describe("requireAuth", () => {
    it("returns 401 when no user-id header is set", async () => {
      const res = await app.request(
        "/api/queue/status?sector_id=00000000-0000-0000-0000-000000000001",
        {
          headers: { "Content-Type": "application/json" },
        },
      )
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error.code).toBe("UNAUTHORIZED")
    })
  })

  describe("requirePlatformAdmin", () => {
    it("returns 401 when no user-id header is set", async () => {
      const res = await app.request("/api/manage/audit-logs", {
        headers: { "Content-Type": "application/json" },
      })
      expect(res.status).toBe(401)
    })

    it("returns 403 when user is not admin", async () => {
      const res = await app.request("/api/manage/audit-logs", {
        headers: authHeaders(F.user.id, F.user.email),
      })
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error.code).toBe("FORBIDDEN")
    })
  })

  describe("requireEventMember", () => {
    it("returns 401 when no user-id header is set", async () => {
      const res = await app.request("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorId: "test", athleteId: "test", idempotencyKey: "test" }),
      })
      expect(res.status).toBe(401)
    })

    it("returns 403 when user has no event-role header", async () => {
      const res = await app.request("/api/attempts", {
        method: "POST",
        headers: authHeaders(F.user.id, F.user.email),
        body: JSON.stringify({ sectorId: "test", athleteId: "test", idempotencyKey: "test" }),
      })
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error.code).toBe("FORBIDDEN")
    })

    it("returns 403 when event-role is not in allowed roles", async () => {
      const res = await app.request("/api/attempts", {
        method: "POST",
        headers: authHeaders(F.user.id, F.user.email, { "x-test-event-role": "athlete" }),
        body: JSON.stringify({ sectorId: "test", athleteId: "test", idempotencyKey: "test" }),
      })
      expect(res.status).toBe(403)
    })
  })

  describe("requireGymMember", () => {
    it("returns 401 when no user-id header is set", async () => {
      const res = await app.request("/api/gym/test-gym/events/test-event-id/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      expect(res.status).toBe(401)
    })

    it("returns 403 when user has no gym-role header", async () => {
      const res = await app.request("/api/gym/test-gym/events/test-event-id/publish", {
        method: "POST",
        headers: authHeaders(F.user.id, F.user.email),
      })
      expect(res.status).toBe(403)
    })

    it("returns 403 when gym-role is not in allowed roles", async () => {
      const res = await app.request("/api/gym/test-gym/events/test-event-id/publish", {
        method: "POST",
        headers: authHeaders(F.user.id, F.user.email, { "x-test-gym-role": "judge" }),
      })
      expect(res.status).toBe(403)
    })
  })
})
