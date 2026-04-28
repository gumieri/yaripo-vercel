import { createMiddleware } from "hono/factory"
import { eq, and } from "drizzle-orm"
import { db } from "@/lib/db"
import { venueMembers, venues, eventMembers } from "@/lib/db/schema"
import { auth } from "@/lib/auth/server"
import {
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
  notFoundResponse,
} from "@/lib/api/helpers"
import type { Session } from "next-auth"

type AuthEnv = {
  Variables: {
    session: Session | null
    userId: string | null
    userEmail: string | null
    venueId: string | null
    venueRole: string | null
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

export function requireVenueMember(slugParam: string, roles: string[]) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const userId = c.get("userId")

    if (!userId) {
      return unauthorizedResponse(c)
    }

    const venueSlug = c.req.param(slugParam)

    if (!venueSlug) {
      return validationErrorResponse(c, "Venue slug is required")
    }

    const [venue] = await db
      .select({ id: venues.id })
      .from(venues)
      .where(eq(venues.slug, venueSlug))

    if (!venue) {
      return notFoundResponse(c, "Venue")
    }

    const [membership] = await db
      .select({ role: venueMembers.role })
      .from(venueMembers)
      .where(and(eq(venueMembers.venueId, venue.id), eq(venueMembers.userId, userId)))

    if (!membership) {
      return forbiddenResponse(c, "Not a member of this venue")
    }

    if (!roles.includes(membership.role)) {
      return forbiddenResponse(c, "Insufficient venue permissions")
    }

    c.set("venueId", venue.id)
    c.set("venueRole", membership.role)

    await next()
  })
}
