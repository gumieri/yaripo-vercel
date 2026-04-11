import { createMiddleware } from "hono/factory"
import { auth } from "@/lib/auth/server"
import type { Session } from "next-auth"

type AuthEnv = {
  Variables: {
    session: Session | null
    userId: string | null
    userRole: string | null
  }
}

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const session = await auth()

  c.set("session", session)
  c.set("userId", session?.user?.id ?? null)
  c.set("userRole", (session?.user as { role?: string } | null)?.role ?? null)

  await next()
})

export function requireAuth() {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const userId = c.get("userId")
    if (!userId) {
      return c.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        401,
      )
    }
    await next()
  })
}

export function requireRole(...roles: string[]) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const userId = c.get("userId")
    const userRole = c.get("userRole")

    if (!userId) {
      return c.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        401,
      )
    }

    if (!userRole || !roles.includes(userRole)) {
      return c.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Insufficient permissions" },
        },
        403,
      )
    }

    await next()
  })
}
