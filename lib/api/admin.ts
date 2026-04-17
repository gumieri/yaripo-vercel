import { Hono } from "hono"
import { desc, sql, and, eq, asc } from "drizzle-orm"
import { db } from "@/lib/db"
import { auditLogs, events, categories, sectors, athletes, gyms } from "@/lib/db/schema"
import { authMiddleware, requireRole } from "@/lib/api/middleware/auth"
import { logAudit } from "@/lib/db/audit"

const adminRoutes = new Hono()

adminRoutes.get("/audit-logs", authMiddleware, requireRole("admin"), async (c) => {
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

adminRoutes.get("/events", authMiddleware, requireRole("admin"), async (c) => {
  const eventList = await db
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
      createdAt: events.createdAt,
    })
    .from(events)
    .orderBy(desc(events.createdAt))

  return c.json({ success: true, data: eventList })
})

adminRoutes.post("/events", authMiddleware, requireRole("admin"), async (c) => {
  const body = await c.req.json()
  const userId = c.get("userId")

  const name = body.name?.trim()
  const slug = body.slug?.trim()
  const gymId = body.gymId
  const scoringType = body.scoringType || "simple"
  const description = body.description?.trim() || null
  const startsAt = body.startsAt ? new Date(body.startsAt) : null
  const endsAt = body.endsAt ? new Date(body.endsAt) : null

  if (!name || !slug || !gymId) {
    return c.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "name, slug, and gymId are required" },
      },
      400,
    )
  }

  const slugRegex = /^[a-z0-9-]+$/
  if (!slugRegex.test(slug)) {
    return c.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "slug must be lowercase alphanumeric with dashes only",
        },
      },
      400,
    )
  }

  const [existing] = await db.select({ id: events.id }).from(events).where(eq(events.slug, slug))
  if (existing) {
    return c.json(
      {
        success: false,
        error: { code: "CONFLICT", message: "Event slug already exists" },
      },
      409,
    )
  }

  const [created] = await db
    .insert(events)
    .values({
      name,
      slug,
      gymId,
      scoringType,
      description,
      startsAt,
      endsAt,
      status: "draft",
    })
    .returning()

  await logAudit({
    userId,
    action: "event.create",
    resourceType: "event",
    resourceId: created.id,
    newValues: created,
  })

  return c.json({ success: true, data: created }, 201)
})

adminRoutes.get("/events/:id", authMiddleware, requireRole("admin"), async (c) => {
  const id = c.req.param("id")

  const [event] = await db.select().from(events).where(eq(events.id, id))
  if (!event) {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "Event not found" } },
      404,
    )
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

adminRoutes.patch("/events/:id", authMiddleware, requireRole("admin"), async (c) => {
  const id = c.req.param("id")
  const body = await c.req.json()
  const userId = c.get("userId")

  const [existing] = await db.select().from(events).where(eq(events.id, id))
  if (!existing) {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "Event not found" } },
      404,
    )
  }

  const updates: Record<string, any> = {}
  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.slug !== undefined) {
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(body.slug)) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "slug must be lowercase alphanumeric with dashes only",
          },
        },
        400,
      )
    }
    updates.slug = body.slug.trim()
  }
  if (body.description !== undefined) updates.description = body.description?.trim() || null
  if (body.scoringType !== undefined) updates.scoringType = body.scoringType
  if (body.startsAt !== undefined)
    updates.startsAt = body.startsAt ? new Date(body.startsAt) : null
  if (body.endsAt !== undefined) updates.endsAt = body.endsAt ? new Date(body.endsAt) : null
  if (body.status !== undefined) updates.status = body.status
  if (body.bestRoutesCount !== undefined)
    updates.bestRoutesCount = body.bestRoutesCount !== null ? Number(body.bestRoutesCount) : null
  updates.updatedAt = new Date()

  const [updated] = await db
    .update(events)
    .set(updates)
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

adminRoutes.delete("/events/:id", authMiddleware, requireRole("admin"), async (c) => {
  const id = c.req.param("id")
  const userId = c.get("userId")

  const [existing] = await db.select().from(events).where(eq(events.id, id))
  if (!existing) {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "Event not found" } },
      404,
    )
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

adminRoutes.post(
  "/events/:eventId/categories",
  authMiddleware,
  requireRole("admin"),
  async (c) => {
    const eventId = c.req.param("eventId")
    const body = await c.req.json()
    const userId = c.get("userId")

    const name = body.name?.trim()
    const gender = body.gender || "open"
    const minAge = body.minAge ? Number(body.minAge) : null
    const maxAge = body.maxAge ? Number(body.maxAge) : null

    if (!name) {
      return c.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "name is required" },
        },
        400,
      )
    }

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

adminRoutes.patch(
  "/events/:eventId/categories/:categoryId",
  authMiddleware,
  requireRole("admin"),
  async (c) => {
    const categoryId = c.req.param("categoryId")
    const body = await c.req.json()
    const userId = c.get("userId")

    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId))
    if (!existing) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Category not found" } },
        404,
      )
    }

    const updates: Record<string, any> = {}
    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.gender !== undefined) updates.gender = body.gender
    if (body.minAge !== undefined) updates.minAge = body.minAge ? Number(body.minAge) : null
    if (body.maxAge !== undefined) updates.maxAge = body.maxAge ? Number(body.maxAge) : null

    if (Object.keys(updates).length === 0) {
      return c.json(
        { success: false, error: { code: "VALIDATION_FAILED", message: "No fields to update" } },
        400,
      )
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

adminRoutes.delete(
  "/events/:eventId/categories/:categoryId",
  authMiddleware,
  requireRole("admin"),
  async (c) => {
    const categoryId = c.req.param("categoryId")
    const userId = c.get("userId")

    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId))
    if (!existing) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Category not found" } },
        404,
      )
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

adminRoutes.post(
  "/events/:eventId/sectors",
  authMiddleware,
  requireRole("admin"),
  async (c) => {
    const eventId = c.req.param("eventId")
    const body = await c.req.json()
    const userId = c.get("userId")

    const name = body.name?.trim()
    const orderIndex = body.orderIndex !== undefined ? Number(body.orderIndex) : 0
    const flashPoints = body.flashPoints !== undefined ? Number(body.flashPoints) : 1000
    const pointsPerAttempt = body.pointsPerAttempt !== undefined ? Number(body.pointsPerAttempt) : 100
    const maxAttempts = body.maxAttempts !== undefined ? Number(body.maxAttempts) : 5

    if (!name) {
      return c.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "name is required" },
        },
        400,
      )
    }

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

adminRoutes.patch(
  "/events/:eventId/sectors/:sectorId",
  authMiddleware,
  requireRole("admin"),
  async (c) => {
    const sectorId = c.req.param("sectorId")
    const body = await c.req.json()
    const userId = c.get("userId")

    const [existing] = await db.select().from(sectors).where(eq(sectors.id, sectorId))
    if (!existing) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Sector not found" } },
        404,
      )
    }

    const updates: Record<string, any> = {}
    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.orderIndex !== undefined) updates.orderIndex = Number(body.orderIndex)
    if (body.flashPoints !== undefined) updates.flashPoints = Number(body.flashPoints)
    if (body.pointsPerAttempt !== undefined) updates.pointsPerAttempt = Number(body.pointsPerAttempt)
    if (body.maxAttempts !== undefined) updates.maxAttempts = Number(body.maxAttempts)

    if (Object.keys(updates).length === 0) {
      return c.json(
        { success: false, error: { code: "VALIDATION_FAILED", message: "No fields to update" } },
        400,
      )
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

adminRoutes.delete(
  "/events/:eventId/sectors/:sectorId",
  authMiddleware,
  requireRole("admin"),
  async (c) => {
    const sectorId = c.req.param("sectorId")
    const userId = c.get("userId")

    const [existing] = await db.select().from(sectors).where(eq(sectors.id, sectorId))
    if (!existing) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Sector not found" } },
        404,
      )
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

adminRoutes.post(
  "/events/:eventId/athletes",
  authMiddleware,
  requireRole("admin"),
  async (c) => {
    const body = await c.req.json()
    const userId = c.get("userId")

    const categoryId = body.categoryId
    const name = body.name?.trim()
    const externalId = body.externalId?.trim() || null

    if (!categoryId || !name) {
      return c.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "categoryId and name are required" },
        },
        400,
      )
    }

    const [categoryExists] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, categoryId))
    if (!categoryExists) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Category not found" } },
        404,
      )
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

adminRoutes.post(
  "/events/:eventId/athletes/bulk",
  authMiddleware,
  requireRole("admin"),
  async (c) => {
    const eventId = c.req.param("eventId")
    const body = await c.req.json()
    const userId = c.get("userId")

    const categoryId = body.categoryId
    const names: string[] = body.names

    if (!categoryId || !Array.isArray(names) || names.length === 0) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "categoryId and non-empty names array are required",
          },
        },
        400,
      )
    }

    if (names.length > 200) {
      return c.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Maximum 200 athletes per batch" },
        },
        400,
      )
    }

    const [categoryExists] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, categoryId))
    if (!categoryExists) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Category not found" } },
        404,
      )
    }

    const values = names
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .map((name) => ({
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

    return c.json({ success: true, data: { created: created, count: created.length } }, 201)
  },
)

adminRoutes.delete(
  "/events/:eventId/athletes/:athleteId",
  authMiddleware,
  requireRole("admin"),
  async (c) => {
    const athleteId = c.req.param("athleteId")
    const userId = c.get("userId")

    const [existing] = await db.select().from(athletes).where(eq(athletes.id, athleteId))
    if (!existing) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Athlete not found" } },
        404,
      )
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

adminRoutes.get("/gyms", authMiddleware, requireRole("admin"), async (c) => {
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

export { adminRoutes }
