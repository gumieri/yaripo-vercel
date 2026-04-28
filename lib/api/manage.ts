import { Hono } from "hono"
import { desc, sql, and, eq, asc, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  auditLogs,
  events,
  categories,
  sectors,
  athletes,
  venues,
  eventMembers,
  eventJudgeInvitations,
  users,
} from "@/lib/db/schema"
import {
  authMiddleware,
  requireAuth,
  requirePlatformAdmin,
  requireEventOrganizer,
} from "@/lib/api/middleware/auth"
import { logAudit } from "@/lib/db/audit"
import { EventPhaseManager } from "@/lib/api/phases"
import { EventPhase } from "@/lib/constants/phases"
import { notFoundResponse, validationErrorResponse, conflictResponse } from "@/lib/api/helpers"
import {
  createEventSchema,
  updateEventSchema,
  createCategorySchema,
  updateCategorySchema,
  createSectorSchema,
  updateSectorSchema,
  createAthleteSchema,
  bulkCreateAthletesSchema,
} from "@/lib/api/validations"

const manageRoutes = new Hono()

manageRoutes.get("/audit-logs", authMiddleware, requirePlatformAdmin, async (c) => {
  const page = Number(c.req.query("page") || "1")
  const perPage = Number(c.req.query("per_page") || "50")
  const resourceType = c.req.query("resource_type")
  const offset = (page - 1) * perPage

  const conditions = []
  if (resourceType) {
    conditions.push(eq(auditLogs.resourceType, resourceType))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [logs, countResult] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(perPage)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(whereClause),
  ])

  return c.json({
    success: true,
    data: {
      logs,
      meta: {
        page,
        perPage,
        total: Number(countResult[0].count),
      },
    },
  })
})

const eventSelectFields = {
  id: events.id,
  name: events.name,
  slug: events.slug,
  description: events.description,
  scoringType: events.scoringType,
  startsAt: events.startsAt,
  endsAt: events.endsAt,
  status: events.status,
  venueId: events.venueId,
  createdBy: events.createdBy,
  createdAt: events.createdAt,
}

manageRoutes.get("/events", authMiddleware, requireAuth, async (c) => {
  const userId = c.get("userId")
  const isPlatformAdmin = c.get("isPlatformAdmin")

  let eventList

  if (isPlatformAdmin) {
    eventList = await db.select(eventSelectFields).from(events).orderBy(desc(events.createdAt))
  } else {
    eventList = await db
      .select(eventSelectFields)
      .from(events)
      .innerJoin(eventMembers, eq(events.id, eventMembers.eventId))
      .where(and(eq(eventMembers.userId, userId!), eq(eventMembers.role, "organizer")))
      .orderBy(desc(events.createdAt))
  }

  return c.json({ success: true, data: eventList })
})

manageRoutes.post("/events", authMiddleware, requireAuth, async (c) => {
  const userId = c.get("userId")
  const body = await c.req.json()

  const result = createEventSchema.safeParse(body)
  if (!result.success) {
    return validationErrorResponse(c, result.error.issues[0].message)
  }

  const { name, slug, venueId, scoringType, description, startsAt, endsAt, eventConfig } =
    result.data

  const [existing] = await db.select({ id: events.id }).from(events).where(eq(events.slug, slug))
  if (existing) {
    return conflictResponse(c, "Event slug already exists")
  }

  const [created] = await db
    .insert(events)
    .values({
      name,
      slug,
      venueId: venueId ?? null,
      createdBy: userId!,
      scoringType,
      description,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      status: "draft",
      eventConfig: eventConfig ?? null,
    })
    .returning()

  await db.insert(eventMembers).values({
    eventId: created.id,
    userId: userId!,
    role: "organizer",
  })

  await logAudit({
    userId,
    action: "event.create",
    resourceType: "event",
    resourceId: created.id,
    newValues: created,
  })

  return c.json({ success: true, data: created }, 201)
})

manageRoutes.get("/events/:id", authMiddleware, requireEventOrganizer("id"), async (c) => {
  const id = c.req.param("id")

  const [event] = await db.select().from(events).where(eq(events.id, id))
  if (!event) {
    return notFoundResponse(c, "Event")
  }

  const categoryList = await db
    .select()
    .from(categories)
    .where(eq(categories.eventId, id))
    .orderBy(asc(categories.name))

  const sectorList = await db
    .select()
    .from(sectors)
    .where(eq(sectors.eventId, id))
    .orderBy(asc(sectors.orderIndex))

  const athleteList = await db
    .select({
      id: athletes.id,
      name: athletes.name,
      categoryId: athletes.categoryId,
      userId: athletes.userId,
      externalId: athletes.externalId,
      createdAt: athletes.createdAt,
    })
    .from(athletes)
    .innerJoin(categories, eq(athletes.categoryId, categories.id))
    .where(eq(categories.eventId, id))
    .orderBy(asc(athletes.name))

  return c.json({
    success: true,
    data: { ...event, categories: categoryList, sectors: sectorList, athletes: athleteList },
  })
})

manageRoutes.patch("/events/:id", authMiddleware, requireEventOrganizer("id"), async (c) => {
  const id = c.req.param("id")
  const body = await c.req.json()
  const userId = c.get("userId")

  const [existing] = await db.select().from(events).where(eq(events.id, id))
  if (!existing) {
    return notFoundResponse(c, "Event")
  }

  const result = updateEventSchema.safeParse(body)
  if (!result.success) {
    return validationErrorResponse(c, result.error.issues[0].message)
  }

  const updates = result.data

  const finalUpdates: Record<string, unknown> = {}
  if (updates.name !== undefined) finalUpdates.name = updates.name
  if (updates.slug !== undefined) finalUpdates.slug = updates.slug
  if (updates.description !== undefined) finalUpdates.description = updates.description
  if (updates.scoringType !== undefined) finalUpdates.scoringType = updates.scoringType
  if (updates.startsAt !== undefined)
    finalUpdates.startsAt = updates.startsAt ? new Date(updates.startsAt) : null
  if (updates.endsAt !== undefined)
    finalUpdates.endsAt = updates.endsAt ? new Date(updates.endsAt) : null
  if (updates.status !== undefined) finalUpdates.status = updates.status
  if (updates.bestRoutesCount !== undefined) finalUpdates.bestRoutesCount = updates.bestRoutesCount
  if (updates.eventConfig !== undefined) finalUpdates.eventConfig = updates.eventConfig
  finalUpdates.updatedAt = new Date()

  const [updated] = await db.update(events).set(finalUpdates).where(eq(events.id, id)).returning()

  await logAudit({
    userId,
    action: "event.update",
    resourceType: "event",
    resourceId: id,
    oldValues: existing,
    newValues: updated,
  })

  return c.json({ success: true, data: updated })
})

manageRoutes.delete("/events/:id", authMiddleware, requireEventOrganizer("id"), async (c) => {
  const id = c.req.param("id")
  const userId = c.get("userId")

  const [existing] = await db.select().from(events).where(eq(events.id, id))
  if (!existing) {
    return notFoundResponse(c, "Event")
  }

  await db.delete(events).where(eq(events.id, id))

  await logAudit({
    userId,
    action: "event.delete",
    resourceType: "event",
    resourceId: id,
    oldValues: existing,
  })

  return c.json({ success: true, data: { id } })
})

manageRoutes.post("/events/boulder-festival", authMiddleware, requireAuth, async (c) => {
  const userId = c.get("userId")
  const body = await c.req.json()

  const { validateBoulderFestivalConfig } = await import("@/lib/schemas/boulder-festival")

  const festivalConfig = validateBoulderFestivalConfig(body.config)

  const rawSlug = body.slug || `boulder-festival-${Date.now()}`
  const eventSlug = rawSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  const [existing] = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.slug, eventSlug))
  if (existing) {
    return conflictResponse(c, "Event slug already exists")
  }

  if (body.venueId) {
    const [venue] = await db
      .select({ id: venues.id, name: venues.name })
      .from(venues)
      .where(eq(venues.id, body.venueId))
    if (!venue) {
      return notFoundResponse(c, "Venue")
    }
  }

  const eventName = body.name || `Boulder Festival`

  const [created] = await db
    .insert(events)
    .values({
      name: eventName,
      slug: eventSlug,
      venueId: body.venueId ?? null,
      createdBy: userId!,
      scoringType: "redpoint",
      description: body.description || null,
      startsAt: festivalConfig.schedule?.competitionStart
        ? new Date(festivalConfig.schedule.competitionStart)
        : null,
      endsAt: festivalConfig.schedule?.competitionEnd
        ? new Date(festivalConfig.schedule.competitionEnd)
        : null,
      status: "draft",
      eventConfig: festivalConfig,
      phase: "prep",
    })
    .returning()

  await db.insert(eventMembers).values({
    eventId: created.id,
    userId: userId!,
    role: "organizer",
  })

  await logAudit({
    userId,
    action: "event.boulder_festival_create",
    resourceType: "event",
    resourceId: created.id,
    newValues: created,
  })

  return c.json({ success: true, data: created }, 201)
})

manageRoutes.get("/venues", authMiddleware, requirePlatformAdmin, async (c) => {
  const venueList = await db
    .select({
      id: venues.id,
      name: venues.name,
      slug: venues.slug,
      city: venues.city,
      state: venues.state,
      type: venues.type,
    })
    .from(venues)
    .orderBy(asc(venues.name))

  return c.json({ success: true, data: venueList })
})

manageRoutes.post("/venues", authMiddleware, requirePlatformAdmin, async (c) => {
  const userId = c.get("userId")!
  const body = await c.req.json()

  const {
    name,
    slug,
    type,
    description,
    city,
    state,
    country,
    address,
    latitude,
    longitude,
    photoUrl,
    socialLinks,
  } = body

  if (!name || !slug) {
    return validationErrorResponse(c, "Name and slug are required")
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return validationErrorResponse(c, "Slug must be lowercase alphanumeric with dashes only")
  }

  if (type && !["gym", "outdoor", "public", "other"].includes(type)) {
    return validationErrorResponse(c, "Invalid venue type")
  }

  if (latitude != null && (latitude < -90 || latitude > 90)) {
    return validationErrorResponse(c, "Invalid latitude")
  }

  if (longitude != null && (longitude < -180 || longitude > 180)) {
    return validationErrorResponse(c, "Invalid longitude")
  }

  const [existing] = await db.select({ id: venues.id }).from(venues).where(eq(venues.slug, slug))
  if (existing) {
    return conflictResponse(c, "Venue slug already exists")
  }

  const [created] = await db
    .insert(venues)
    .values({
      name,
      slug,
      type: type || "gym",
      description: description || null,
      city: city || null,
      state: state || null,
      country: country || null,
      address: address || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      photoUrl: photoUrl || null,
      socialLinks: socialLinks || null,
      createdBy: userId,
    })
    .returning()

  await logAudit({
    userId,
    action: "venue.create",
    resourceType: "venue",
    resourceId: created.id,
    newValues: created,
  })

  return c.json({ success: true, data: created }, 201)
})

manageRoutes.patch("/venues/:id", authMiddleware, requirePlatformAdmin, async (c) => {
  const userId = c.get("userId")!
  const venueId = c.req.param("id")
  const body = await c.req.json()

  const {
    slug,
    name,
    type,
    description,
    city,
    state,
    country,
    address,
    latitude,
    longitude,
    photoUrl,
    socialLinks,
  } = body

  if (slug) {
    return validationErrorResponse(c, "Slug cannot be updated")
  }

  const [existing] = await db.select().from(venues).where(eq(venues.id, venueId))
  if (!existing) {
    return notFoundResponse(c, "Venue")
  }

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (type !== undefined) updates.type = type
  if (description !== undefined) updates.description = description
  if (city !== undefined) updates.city = city
  if (state !== undefined) updates.state = state
  if (country !== undefined) updates.country = country
  if (address !== undefined) updates.address = address
  if (latitude !== undefined) updates.latitude = latitude
  if (longitude !== undefined) updates.longitude = longitude
  if (photoUrl !== undefined) updates.photoUrl = photoUrl
  if (socialLinks !== undefined) updates.socialLinks = socialLinks
  updates.updatedAt = new Date()

  const [updated] = await db.update(venues).set(updates).where(eq(venues.id, venueId)).returning()

  await logAudit({
    userId,
    action: "venue.update",
    resourceType: "venue",
    resourceId: venueId,
    oldValues: existing,
    newValues: updated,
  })

  return c.json({ success: true, data: updated })
})

manageRoutes.delete("/venues/:id", authMiddleware, requirePlatformAdmin, async (c) => {
  const userId = c.get("userId")!
  const venueId = c.req.param("id")

  const [existing] = await db.select().from(venues).where(eq(venues.id, venueId))
  if (!existing) {
    return notFoundResponse(c, "Venue")
  }

  await db.delete(venues).where(eq(venues.id, venueId))

  await logAudit({
    userId,
    action: "venue.delete",
    resourceType: "venue",
    resourceId: venueId,
    oldValues: existing,
  })

  return c.json({ success: true, data: { id: venueId } })
})

manageRoutes.get(
  "/events/:eventId/judges",
  authMiddleware,
  requireEventOrganizer("eventId"),
  async (c) => {
    const eventId = c.req.param("eventId")

    const [judges, invitations] = await Promise.all([
      db
        .select({
          id: eventMembers.id,
          userId: eventMembers.userId,
          role: eventMembers.role,
          createdAt: eventMembers.createdAt,
        })
        .from(eventMembers)
        .where(and(eq(eventMembers.eventId, eventId), eq(eventMembers.role, "judge"))),
      db
        .select({
          id: eventJudgeInvitations.id,
          email: eventJudgeInvitations.email,
          status: eventJudgeInvitations.status,
          invitedBy: eventJudgeInvitations.invitedBy,
          createdAt: eventJudgeInvitations.createdAt,
        })
        .from(eventJudgeInvitations)
        .where(eq(eventJudgeInvitations.eventId, eventId)),
    ])

    return c.json({ success: true, data: { judges, invitations } })
  },
)

manageRoutes.post(
  "/events/:eventId/judges/invite",
  authMiddleware,
  requireEventOrganizer("eventId"),
  async (c) => {
    const eventId = c.req.param("eventId")
    const body = await c.req.json()
    const userId = c.get("userId")

    const { email } = body

    if (!email || typeof email !== "string") {
      return validationErrorResponse(c, "Email is required")
    }

    const [existingMember] = await db
      .select()
      .from(eventMembers)
      .where(and(eq(eventMembers.eventId, eventId), eq(eventMembers.userId, email)))
    if (existingMember) {
      return conflictResponse(c, "User is already a member of this event")
    }

    const [existingInvitation] = await db
      .select()
      .from(eventJudgeInvitations)
      .where(
        and(
          eq(eventJudgeInvitations.eventId, eventId),
          eq(eventJudgeInvitations.email, email),
          inArray(eventJudgeInvitations.status, ["pending", "accepted"]),
        ),
      )
    if (existingInvitation) {
      return conflictResponse(c, "Invitation already exists")
    }

    const [created] = await db
      .insert(eventJudgeInvitations)
      .values({
        eventId,
        email,
        invitedBy: userId,
        status: "pending",
      })
      .returning()

    const [event] = await db
      .select({ name: events.name })
      .from(events)
      .where(eq(events.id, eventId))
    const [organizer] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId!))

    const { render } = await import("@react-email/render")
    const JudgeInviteEmail = (await import("@/lib/email/templates/judge-invite")).default
    const { sendEmail } = await import("@/lib/email/client")

    const supportedLocales = [
      { code: "en", label: "EN" },
      { code: "pt", label: "PT" },
      { code: "es", label: "ES" },
      { code: "fr", label: "FR" },
      { code: "de", label: "DE" },
      { code: "it", label: "IT" },
      { code: "ja", label: "JA" },
      { code: "ko", label: "KO" },
      { code: "uk", label: "UK" },
    ]

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/en/invitations/${created.id}`

    sendEmail({
      to: email,
      subject: `You're invited to judge ${event.name}`,
      html: await render(
        JudgeInviteEmail({
          eventName: event.name,
          organizerName: organizer.name,
          inviteUrl,
          locale: "en",
          supportedLocales,
        }),
      ),
    }).catch(console.error)

    return c.json({ success: true, data: created }, 201)
  },
)

manageRoutes.delete(
  "/events/:eventId/judges/:memberId",
  authMiddleware,
  requireEventOrganizer("eventId"),
  async (c) => {
    const memberId = c.req.param("memberId")

    const [existing] = await db
      .select()
      .from(eventMembers)
      .where(and(eq(eventMembers.id, memberId), eq(eventMembers.role, "judge")))
    if (!existing) {
      return notFoundResponse(c, "Judge")
    }

    await db.delete(eventMembers).where(eq(eventMembers.id, memberId))

    return c.json({ success: true, data: { id: memberId } })
  },
)

manageRoutes.get("/invitations", authMiddleware, requireAuth, async (c) => {
  const userEmail = c.get("userEmail")

  if (!userEmail) {
    return validationErrorResponse(c, "User email not found")
  }

  const invitations = await db
    .select({
      id: eventJudgeInvitations.id,
      eventId: eventJudgeInvitations.eventId,
      eventName: events.name,
      eventSlug: events.slug,
      email: eventJudgeInvitations.email,
      status: eventJudgeInvitations.status,
      invitedBy: eventJudgeInvitations.invitedBy,
      createdAt: eventJudgeInvitations.createdAt,
    })
    .from(eventJudgeInvitations)
    .innerJoin(events, eq(eventJudgeInvitations.eventId, events.id))
    .where(eq(eventJudgeInvitations.email, userEmail))
    .orderBy(desc(eventJudgeInvitations.createdAt))

  return c.json({ success: true, data: invitations })
})

manageRoutes.get(
  "/events/:eventId/phase",
  authMiddleware,
  requireEventOrganizer("eventId"),
  async (c) => {
    const eventId = c.req.param("eventId")

    const currentPhase = await EventPhaseManager.getCurrentPhase(eventId)
    if (!currentPhase) {
      return notFoundResponse(c, "Event")
    }

    try {
      const metadata = await EventPhaseManager.getPhaseMetadata(eventId)
      const duration = await EventPhaseManager.getPhaseDuration(eventId)

      return c.json({
        success: true,
        data: {
          currentPhase,
          metadata,
          durationMs: duration,
        },
      })
    } catch {
      return notFoundResponse(c, "Event")
    }
  },
)

manageRoutes.post(
  "/events/:eventId/phase/transition",
  authMiddleware,
  requireEventOrganizer("eventId"),
  async (c) => {
    const eventId = c.req.param("eventId")
    const userId = c.get("userId")!
    const body = await c.req.json()

    const { toPhase, metadata } = body

    if (!toPhase || !Object.values(EventPhase).includes(toPhase)) {
      return validationErrorResponse(c, "Invalid target phase")
    }

    try {
      const result = await EventPhaseManager.transitionPhase(
        eventId,
        toPhase as EventPhase,
        userId,
        metadata,
      )

      if (!result.success) {
        return validationErrorResponse(c, result.message || "Phase transition failed")
      }

      return c.json({ success: true, data: { currentPhase: result.currentPhase } })
    } catch {
      return notFoundResponse(c, "Event")
    }
  },
)

manageRoutes.patch(
  "/events/:eventId/phase/metadata",
  authMiddleware,
  requireEventOrganizer("eventId"),
  async (c) => {
    const eventId = c.req.param("eventId")
    const userId = c.get("userId")!
    const body = await c.req.json()

    const { metadata } = body

    if (!metadata || typeof metadata !== "object") {
      return validationErrorResponse(c, "Metadata is required")
    }

    try {
      await EventPhaseManager.updatePhaseMetadata(eventId, metadata, userId)
      return c.json({ success: true, data: { message: "Metadata updated" } })
    } catch {
      return notFoundResponse(c, "Event")
    }
  },
)

manageRoutes.post("/invitations/:id/accept", authMiddleware, requireAuth, async (c) => {
  const id = c.req.param("id")
  const userId = c.get("userId")
  const userEmail = c.get("userEmail")

  const [invitation] = await db
    .select()
    .from(eventJudgeInvitations)
    .where(eq(eventJudgeInvitations.id, id))
  if (!invitation) {
    return notFoundResponse(c, "Invitation")
  }

  if (invitation.status !== "pending") {
    return validationErrorResponse(c, "Invitation is not pending")
  }

  if (invitation.email !== userEmail) {
    return validationErrorResponse(c, "This invitation is not for you")
  }

  await db
    .update(eventJudgeInvitations)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(eq(eventJudgeInvitations.id, id))

  await db.insert(eventMembers).values({
    eventId: invitation.eventId,
    userId: userId!,
    role: "judge",
  })

  return c.json({ success: true, data: { id } })
})

manageRoutes.post("/invitations/:id/decline", authMiddleware, requireAuth, async (c) => {
  const id = c.req.param("id")
  const userEmail = c.get("userEmail")

  const [invitation] = await db
    .select()
    .from(eventJudgeInvitations)
    .where(eq(eventJudgeInvitations.id, id))
  if (!invitation) {
    return notFoundResponse(c, "Invitation")
  }

  if (invitation.status !== "pending") {
    return validationErrorResponse(c, "Invitation is not pending")
  }

  if (invitation.email !== userEmail) {
    return validationErrorResponse(c, "This invitation is not for you")
  }

  await db
    .update(eventJudgeInvitations)
    .set({ status: "declined", updatedAt: new Date() })
    .where(eq(eventJudgeInvitations.id, id))

  return c.json({ success: true, data: { id } })
})

export { manageRoutes }
