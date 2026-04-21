import { Hono } from "hono"
import { desc, sql, and, eq, asc, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { auditLogs, events, categories, sectors, athletes, gyms, eventMembers, eventJudgeInvitations } from "@/lib/db/schema"
import { authMiddleware, requireAuth, requirePlatformAdmin, requireEventOrganizer } from "@/lib/api/middleware/auth"
import { logAudit } from "@/lib/db/audit"
import {
  notFoundResponse,
  validationErrorResponse,
  conflictResponse,
} from "@/lib/api/helpers"
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

manageRoutes.get("/events", authMiddleware, requireAuth, async (c) => {
  const userId = c.get("userId")
  const isPlatformAdmin = c.get("isPlatformAdmin")

  let eventList

  if (isPlatformAdmin) {
    eventList = await db
      .select({
        id: events.id,
        name: events.name,
        slug: events.slug,
        description: events.description,
        scoringType: events.scoringType,
        startsAt: events.startsAt,
        endsAt: events.endsAt,
        status: events.status,
        gymId: events.gymId,
        createdBy: events.createdBy,
        createdAt: events.createdAt,
      })
      .from(events)
      .orderBy(desc(events.createdAt))
  } else {
    eventList = await db
      .select({
        id: events.id,
        name: events.name,
        slug: events.slug,
        description: events.description,
        scoringType: events.scoringType,
        startsAt: events.startsAt,
        endsAt: events.endsAt,
        status: events.status,
        gymId: events.gymId,
        createdBy: events.createdBy,
        createdAt: events.createdAt,
      })
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

  const { name, slug, gymId, scoringType, description, startsAt, endsAt } = result.data

  const [existing] = await db.select({ id: events.id }).from(events).where(eq(events.slug, slug))
  if (existing) {
    return conflictResponse(c, "Event slug already exists")
  }

  const [created] = await db
    .insert(events)
    .values({
      name,
      slug,
      gymId: gymId ?? null,
      createdBy: userId!,
      scoringType,
      description,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      status: "draft",
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
  if (updates.startsAt !== undefined) finalUpdates.startsAt = updates.startsAt ? new Date(updates.startsAt) : null
  if (updates.endsAt !== undefined) finalUpdates.endsAt = updates.endsAt ? new Date(updates.endsAt) : null
  if (updates.status !== undefined) finalUpdates.status = updates.status
  if (updates.bestRoutesCount !== undefined) finalUpdates.bestRoutesCount = updates.bestRoutesCount
  finalUpdates.updatedAt = new Date()

  const [updated] = await db
    .update(events)
    .set(finalUpdates)
    .where(eq(events.id, id))
    .returning()

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

manageRoutes.post(
  "/events/:eventId/categories",
  authMiddleware,
  requireEventOrganizer("eventId"),
  async (c) => {
    const eventId = c.req.param("eventId")
    const body = await c.req.json()
    const userId = c.get("userId")

    const result = createCategorySchema.safeParse(body)
    if (!result.success) {
      return validationErrorResponse(c, result.error.issues[0].message)
    }

    const { name, gender, minAge, maxAge } = result.data

    const [created] = await db
      .insert(categories)
      .values({ eventId, name, gender, minAge, maxAge })
      .returning()

    await logAudit({
      userId,
      action: "category.create",
      resourceType: "category",
      resourceId: created.id,
      newValues: created,
    })

    return c.json({ success: true, data: created }, 201)
  },
)

manageRoutes.patch(
  "/events/:eventId/categories/:categoryId",
  authMiddleware,
  requireEventOrganizer("eventId"),
  async (c) => {
    const categoryId = c.req.param("categoryId")
    const body = await c.req.json()
    const userId = c.get("userId")

    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId))
    if (!existing) {
      return notFoundResponse(c, "Category")
    }

    const result = updateCategorySchema.safeParse(body)
    if (!result.success) {
      return validationErrorResponse(c, result.error.issues[0].message)
    }

    const updates = result.data

    if (Object.keys(updates).length === 0) {
      return validationErrorResponse(c, "No fields to update")
    }

    const [updated] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, categoryId))
      .returning()

    await logAudit({
      userId,
      action: "category.update",
      resourceType: "category",
      resourceId: categoryId,
      oldValues: existing,
      newValues: updated,
    })

    return c.json({ success: true, data: updated })
  },
)

manageRoutes.delete(
  "/events/:eventId/categories/:categoryId",
  authMiddleware,
  requireEventOrganizer("eventId"),
  async (c) => {
    const categoryId = c.req.param("categoryId")
    const userId = c.get("userId")

    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId))
    if (!existing) {
      return notFoundResponse(c, "Category")
    }

    await db.delete(categories).where(eq(categories.id, categoryId))

    await logAudit({
      userId,
      action: "category.delete",
      resourceType: "category",
      resourceId: categoryId,
      oldValues: existing,
    })

    return c.json({ success: true, data: { id: categoryId } })
  },
)

manageRoutes.post(
  "/events/:eventId/sectors",
  authMiddleware,
  requireEventOrganizer("eventId"),
  async (c) => {
    const eventId = c.req.param("eventId")
    const body = await c.req.json()
    const userId = c.get("userId")

    const result = createSectorSchema.safeParse(body)
    if (!result.success) {
      return validationErrorResponse(c, result.error.issues[0].message)
    }

    const { name, orderIndex, flashPoints, pointsPerAttempt, maxAttempts } = result.data

    const [created] = await db
      .insert(sectors)
      .values({ eventId, name, orderIndex, flashPoints, pointsPerAttempt, maxAttempts })
      .returning()

    await logAudit({
      userId,
      action: "sector.create",
      resourceType: "sector",
      resourceId: created.id,
      newValues: created,
    })

    return c.json({ success: true, data: created }, 201)
  },
)

manageRoutes.patch(
  "/events/:eventId/sectors/:sectorId",
  authMiddleware,
  requireEventOrganizer("eventId"),
  async (c) => {
    const sectorId = c.req.param("sectorId")
    const body = await c.req.json()
    const userId = c.get("userId")

    const [existing] = await db.select().from(sectors).where(eq(sectors.id, sectorId))
    if (!existing) {
      return notFoundResponse(c, "Sector")
    }

    const result = updateSectorSchema.safeParse(body)
    if (!result.success) {
      return validationErrorResponse(c, result.error.issues[0].message)
    }

    const updates = result.data

    if (Object.keys(updates).length === 0) {
      return validationErrorResponse(c, "No fields to update")
    }

    const [updated] = await db
      .update(sectors)
      .set(updates)
      .where(eq(sectors.id, sectorId))
      .returning()

    await logAudit({
      userId,
      action: "sector.update",
      resourceType: "sector",
      resourceId: sectorId,
      oldValues: existing,
      newValues: updated,
    })

    return c.json({ success: true, data: updated })
  },
)

manageRoutes.delete(
  "/events/:eventId/sectors/:sectorId",
  authMiddleware,
  requireEventOrganizer("eventId"),
  async (c) => {
    const sectorId = c.req.param("sectorId")
    const userId = c.get("userId")

    const [existing] = await db.select().from(sectors).where(eq(sectors.id, sectorId))
    if (!existing) {
      return notFoundResponse(c, "Sector")
    }

    await db.delete(sectors).where(eq(sectors.id, sectorId))

    await logAudit({
      userId,
      action: "sector.delete",
      resourceType: "sector",
      resourceId: sectorId,
      oldValues: existing,
    })

    return c.json({ success: true, data: { id: sectorId } })
  },
)

manageRoutes.post(
  "/events/:eventId/athletes",
  authMiddleware,
  requireEventOrganizer("eventId"),
  async (c) => {
    const body = await c.req.json()
    const userId = c.get("userId")

    const result = createAthleteSchema.safeParse(body)
    if (!result.success) {
      return validationErrorResponse(c, result.error.issues[0].message)
    }

    const { categoryId, name, externalId } = result.data

    const [categoryExists] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, categoryId))
    if (!categoryExists) {
      return notFoundResponse(c, "Category")
    }

    const [created] = await db
      .insert(athletes)
      .values({ name, categoryId, externalId })
      .returning()

    await logAudit({
      userId,
      action: "athlete.create",
      resourceType: "athlete",
      resourceId: created.id,
      newValues: created,
    })

    return c.json({ success: true, data: created }, 201)
  },
)

manageRoutes.post(
  "/events/:eventId/athletes/bulk",
  authMiddleware,
  requireEventOrganizer("eventId"),
  async (c) => {
    const eventId = c.req.param("eventId")
    const body = await c.req.json()
    const userId = c.get("userId")

    const result = bulkCreateAthletesSchema.safeParse(body)
    if (!result.success) {
      return validationErrorResponse(c, result.error.issues[0].message)
    }

    const { categoryId, names } = result.data

    const [categoryExists] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, categoryId))
    if (!categoryExists) {
      return notFoundResponse(c, "Category")
    }

    const values = names.map((name) => ({
      name,
      categoryId,
    }))

    const created = await db.insert(athletes).values(values).returning()

    await logAudit({
      userId,
      action: "athlete.bulk_create",
      resourceType: "event",
      resourceId: eventId,
      newValues: { count: created.length, categoryId },
    })

    return c.json({ success: true, data: { created, count: created.length } }, 201)
  },
)

manageRoutes.delete(
  "/events/:eventId/athletes/:athleteId",
  authMiddleware,
  requireEventOrganizer("eventId"),
  async (c) => {
    const athleteId = c.req.param("athleteId")
    const userId = c.get("userId")

    const [existing] = await db.select().from(athletes).where(eq(athletes.id, athleteId))
    if (!existing) {
      return notFoundResponse(c, "Athlete")
    }

    await db.delete(athletes).where(eq(athletes.id, athleteId))

    await logAudit({
      userId,
      action: "athlete.delete",
      resourceType: "athlete",
      resourceId: athleteId,
      oldValues: existing,
    })

    return c.json({ success: true, data: { id: athleteId } })
  },
)

manageRoutes.get("/gyms", authMiddleware, requirePlatformAdmin, async (c) => {
  const gymList = await db
    .select({
      id: gyms.id,
      name: gyms.name,
      slug: gyms.slug,
      city: gyms.city,
      state: gyms.state,
    })
    .from(gyms)
    .orderBy(asc(gyms.name))

  return c.json({ success: true, data: gymList })
})

manageRoutes.get("/events/:eventId/judges", authMiddleware, requireEventOrganizer("eventId"), async (c) => {
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
})

manageRoutes.post("/events/:eventId/judges/invite", authMiddleware, requireEventOrganizer("eventId"), async (c) => {
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
    .where(and(eq(eventJudgeInvitations.eventId, eventId), eq(eventJudgeInvitations.email, email), inArray(eventJudgeInvitations.status, ["pending", "accepted"])))
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

  return c.json({ success: true, data: created }, 201)
})

manageRoutes.delete("/events/:eventId/judges/:memberId", authMiddleware, requireEventOrganizer("eventId"), async (c) => {
  const memberId = c.req.param("memberId")
  const userId = c.get("userId")

  const [existing] = await db
    .select()
    .from(eventMembers)
    .where(and(eq(eventMembers.id, memberId), eq(eventMembers.role, "judge")))
  if (!existing) {
    return notFoundResponse(c, "Judge")
  }

  await db.delete(eventMembers).where(eq(eventMembers.id, memberId))

  return c.json({ success: true, data: { id: memberId } })
})

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
