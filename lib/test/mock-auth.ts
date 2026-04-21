export const authMiddleware = async (c: any, next: any) => {
  const email = c.req.header("x-test-user-email") || null
  c.set("userId", c.req.header("x-test-user-id") || null)
  c.set("gymId", c.req.header("x-test-gym-id") || null)
  c.set("gymRole", c.req.header("x-test-gym-role") || null)
  c.set("eventId", c.req.header("x-test-event-id") || null)
  c.set("eventRole", c.req.header("x-test-event-role") || null)
  c.set("isPlatformAdmin", email === "admin@yaripo.app")
  c.set("session", { user: { id: c.req.header("x-test-user-id"), email } })
  await next()
}

export function requireAuth() {
  return async (c: any, next: any) => {
    if (!c.req.header("x-test-user-id")) {
      return c.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        401,
      )
    }
    await next()
  }
}

export function requirePlatformAdmin() {
  return async (c: any, next: any) => {
    const userId = c.req.header("x-test-user-id")
    const email = c.req.header("x-test-user-email")
    if (!userId) {
      return c.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        401,
      )
    }
    if (email !== "admin@yaripo.app") {
      return c.json(
        { success: false, error: { code: "FORBIDDEN", message: "Platform admin access required" } },
        403,
      )
    }
    await next()
  }
}

export function requireEventMember(eventIdParam: string, roles: string[]) {
  return async (c: any, next: any) => {
    const userId = c.req.header("x-test-user-id")
    if (!userId) {
      return c.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        401,
      )
    }
    const eventRole = c.req.header("x-test-event-role")
    if (!eventRole || !roles.includes(eventRole)) {
      return c.json(
        { success: false, error: { code: "FORBIDDEN", message: "Insufficient event permissions" } },
        403,
      )
    }
    c.set("eventId", c.req.header("x-test-event-id"))
    c.set("eventRole", eventRole)
    await next()
  }
}

export function requireEventOrganizer(eventIdParam: string) {
  return requireEventMember(eventIdParam, ["organizer"])
}

export function requireEventJudge(eventIdParam: string) {
  return requireEventMember(eventIdParam, ["organizer", "judge"])
}

export function requireGymMember(_slugParam: string, roles: string[]) {
  return async (c: any, next: any) => {
    const userId = c.req.header("x-test-user-id")
    if (!userId) {
      return c.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        401,
      )
    }
    const gymRole = c.req.header("x-test-gym-role")
    if (!gymRole || !roles.includes(gymRole)) {
      return c.json(
        { success: false, error: { code: "FORBIDDEN", message: "Insufficient gym permissions" } },
        403,
      )
    }
    c.set("userId", userId)
    c.set("gymId", c.req.header("x-test-gym-id"))
    c.set("gymRole", gymRole)
    await next()
  }
}
