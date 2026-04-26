import { createMiddleware } from "hono/factory"
import { eq, and } from "drizzle-orm"
import { db } from "@/lib/db"
import { gymMembers, gyms, eventMembers } from "@/lib/db/schema"
import { auth } from "@/lib/auth/server"
import { unauthorizedResponse, forbiddenResponse, validationErrorResponse, notFoundResponse } from "@/lib/api/helpers"
import type { Session } from "next-auth"

type AuthEnv = {
  Variables: {
    session: Session | null
    userId: string | null
    userEmail: string | null
    gymId: string | null
    gymRole: string | null
    eventId: string | null
    eventRole: string | null
    isPlatformAdmin: boolean
  }
}

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const session = await auth()

  c.set("session", session)
  c.set("userId", session?.user?.id ?? null)
  c.set("userEmail", session?.user?.email ?? null)
  c.set("isPlatformAdmin", session?.user?.email === "admin@yaripo.app")

  await next()
})

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const userId = c.get("userId")
  if (!userId) {
    return unauthorizedResponse(c)
  }
  await next()
})

export const requirePlatformAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const userId = c.get("userId")
  const isPlatformAdmin = c.get("isPlatformAdmin")

  if (!userId) {
    return unauthorizedResponse(c)
  }

  if (!isPlatformAdmin) {
    return forbiddenResponse(c, "Platform admin access required")
  }

  await next()
})

export function requireEventMember(eventIdParam: string, roles: string[]) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const userId = c.get("userId")

    if (!userId) {
      return unauthorizedResponse(c)
    }

    const eventId = c.req.param(eventIdParam)

    if (!eventId) {
      return validationErrorResponse(c, "Event ID is required")
    }

    const [membership] = await db
      .select({ role: eventMembers.role })
      .from(eventMembers)
      .where(and(eq(eventMembers.eventId, eventId), eq(eventMembers.userId, userId)))

    if (!membership) {
      return forbiddenResponse(c, "Not a member of this event")
    }

    if (!roles.includes(membership.role)) {
      return forbiddenResponse(c, "Insufficient event permissions")
    }

    c.set("eventId", eventId)
    c.set("eventRole", membership.role)

    await next()
  })
}

export function requireEventOrganizer(eventIdParam: string) {
  return requireEventMember(eventIdParam, ["organizer"])
}

export function requireEventJudge(eventIdParam: string) {
  return requireEventMember(eventIdParam, ["organizer", "judge"])
}

export function requireGymMember(slugParam: string, roles: string[]) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const userId = c.get("userId")

    if (!userId) {
      return unauthorizedResponse(c)
    }

    const gymSlug = c.req.param(slugParam)

    if (!gymSlug) {
      return validationErrorResponse(c, "Gym slug is required")
    }

    const [gym] = await db
      .select({ id: gyms.id })
      .from(gyms)
      .where(eq(gyms.slug, gymSlug))

    if (!gym) {
      return notFoundResponse(c, "Gym")
    }

    const [membership] = await db
      .select({ role: gymMembers.role })
      .from(gymMembers)
      .where(and(eq(gymMembers.gymId, gym.id), eq(gymMembers.userId, userId)))

    if (!membership) {
      return forbiddenResponse(c, "Not a member of this gym")
    }

    if (!roles.includes(membership.role)) {
      return forbiddenResponse(c, "Insufficient gym permissions")
    }

    c.set("gymId", gym.id)
    c.set("gymRole", membership.role)

    await next()
  })
}
