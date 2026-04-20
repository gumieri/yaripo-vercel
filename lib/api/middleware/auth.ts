import { createMiddleware } from "hono/factory"
import { eq, and } from "drizzle-orm"
import { db } from "@/lib/db"
import { gymMembers, gyms } from "@/lib/db/schema"
import { auth } from "@/lib/auth/server"
import type { Session } from "next-auth"

type AuthEnv = {
  Variables: {
    session: Session | null
    userId: string | null
    userRole: string | null
    gymId: string | null
    gymRole: string | null
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

export function requireGymMember(slugParam: string, roles: string[]) {
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

    const gymSlug = c.req.param(slugParam)

    if (!gymSlug) {
      return c.json(
        {
          success: false,
          error: { code: "BAD_REQUEST", message: "Gym slug is required" },
        },
        400,
      )
    }

    const [gym] = await db
      .select({ id: gyms.id })
      .from(gyms)
      .where(eq(gyms.slug, gymSlug))

    if (!gym) {
      return c.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Gym not found" },
        },
        404,
      )
    }

    const [membership] = await db
      .select({ role: gymMembers.role })
      .from(gymMembers)
      .where(and(eq(gymMembers.gymId, gym.id), eq(gymMembers.userId, userId)))

    if (!membership) {
      return c.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Not a member of this gym" },
        },
        403,
      )
    }

    if (!roles.includes(membership.role)) {
      return c.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Insufficient gym permissions" },
        },
        403,
      )
    }

    c.set("gymId", gym.id)
    c.set("gymRole", membership.role)

    await next()
  })
}
