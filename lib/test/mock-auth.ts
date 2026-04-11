export const authMiddleware = async (c: any, next: any) => {
  c.set("userId", c.req.header("x-test-user-id") || null)
  c.set("userRole", c.req.header("x-test-user-role") || null)
  c.set("session", null)
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
    c.set("userId", c.req.header("x-test-user-id"))
    c.set("userRole", c.req.header("x-test-user-role") || null)
    c.set("session", null)
    await next()
  }
}

export function requireRole(...roles: string[]) {
  return async (c: any, next: any) => {
    const userId = c.req.header("x-test-user-id")
    const role = c.req.header("x-test-user-role")
    if (!userId) {
      return c.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        401,
      )
    }
    if (!role || !roles.includes(role)) {
      return c.json(
        { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
        403,
      )
    }
    c.set("userId", userId)
    c.set("userRole", role)
    c.set("session", null)
    await next()
  }
}
