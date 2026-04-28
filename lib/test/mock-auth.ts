/* eslint-disable @typescript-eslint/no-explicit-any */
export const authMiddleware = async (c: any, next: any) => {
  const email = c.req.header("x-test-user-email") || null
  c.set("userId", c.req.header("x-test-user-id") || null)
  c.set("userEmail", c.req.header("x-test-user-email") || null)
  c.set("venueId", c.req.header("x-test-venue-id") || null)
  c.set("venueRole", c.req.header("x-test-venue-role") || null)
  c.set("eventId", c.req.header("x-test-event-id") || null)
  c.set("eventRole", c.req.header("x-test-event-role") || null)
  c.set("isPlatformAdmin", email === "admin@yaripo.app")
  c.set("session", { user: { id: c.req.header("x-test-user-id"), email } })
  await next()
}

export const requireAuth = async (c: any, next: any) => {
  if (!c.req.header("x-test-user-id")) {
    return c.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      401,
    )
  }
  await next()
}

export const requirePlatformAdmin = async (c: any, next: any) => {
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

export function requireVenueMember(slugParam: string, roles: string[]) {
  return async (c: any, next: any) => {
    const userId = c.req.header("x-test-user-id")
    if (!userId) {
      return c.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        401,
      )
    }
    const venueRole = c.req.header("x-test-venue-role")
    if (!venueRole || !roles.includes(venueRole)) {
      return c.json(
        { success: false, error: { code: "FORBIDDEN", message: "Insufficient venue permissions" } },
        403,
      )
    }
    c.set("venueId", c.req.header("x-test-venue-id"))
    c.set("venueRole", venueRole)
    await next()
  }
}

export const requireGymMember = requireVenueMember
