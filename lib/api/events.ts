import { Hono } from "hono"
import { eq, sql, inArray, and } from "drizzle-orm"
import { db } from "@/lib/db"
import { events, sectors, categories, athletes, attempts } from "@/lib/db/schema"
import { notFoundResponse } from "@/lib/api/helpers"

const eventRoutes = new Hono()

eventRoutes.get("/", async (c) => {
  const eventList = await db
    .select({
      id: events.id,
      name: events.name,
      slug: events.slug,
      description: events.description,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      status: events.status,
      scoringType: events.scoringType,
    })
    .from(events)
    .where(inArray(events.status, ["published", "active", "completed"]))
    .orderBy(events.startsAt)

  return c.json({ success: true, data: eventList }, 200, {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
  })
})

eventRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug")

  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.slug, slug), inArray(events.status, ["published", "active", "completed"])))

  if (!event) {
    return notFoundResponse(c, "Event")
  }

  return c.json({ success: true, data: event }, 200, {
    "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
  })
})

eventRoutes.get("/:slug/leaderboard", async (c) => {
  const slug = c.req.param("slug")
  const categoryId = c.req.query("category_id")

  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.slug, slug), inArray(events.status, ["published", "active", "completed"])))

  if (!event) {
    return notFoundResponse(c, "Event")
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const validCategoryId = categoryId && uuidRegex.test(categoryId) ? categoryId : null
  const categoryFilter = validCategoryId
    ? sql`${athletes.categoryId} = ${validCategoryId}::uuid`
    : sql`true`

  if (event.scoringType === "redpoint") {
    const brc = event.bestRoutesCount
    const catFilter = validCategoryId
      ? sql`${athletes.categoryId} = ${validCategoryId}::uuid`
      : sql`true`

    const rawSql = brc !== null && brc > 0
      ? sql`
        WITH best_per_route AS (
          SELECT DISTINCT ON (a.athlete_id, s.id)
            a.athlete_id,
            ath.name as athlete_name,
            cat.name as category_name,
            s.id as sector_id,
            GREATEST(s.flash_points - (a.attempt_count - 1) * s.points_per_attempt, 0) as points,
            a.attempt_count
          FROM attempts a
          JOIN sectors s ON a.sector_id = s.id
          JOIN athletes ath ON a.athlete_id = ath.id
          JOIN categories cat ON ath.category_id = cat.id
          WHERE s.event_id = ${event.id}
            AND a.is_top = true
            AND a.attempt_count <= s.max_attempts
            AND ${catFilter}
          ORDER BY a.athlete_id, s.id, points DESC
        ),
        ranked_routes AS (
          SELECT *,
            ROW_NUMBER() OVER (PARTITION BY athlete_id ORDER BY points DESC) as route_rank
          FROM best_per_route
        ),
        aggregated AS (
          SELECT
            athlete_id,
            athlete_name,
            category_name,
            SUM(points) as total_points,
            COUNT(CASE WHEN attempt_count = 1 THEN 1 END) as flash_count,
            SUM(attempt_count) as total_attempts
          FROM ranked_routes
          WHERE route_rank <= ${brc}
          GROUP BY athlete_id, athlete_name, category_name
        )
        SELECT *,
          ROW_NUMBER() OVER (ORDER BY total_points DESC, flash_count DESC, total_attempts ASC) as rn
        FROM aggregated
        ORDER BY total_points DESC, flash_count DESC, total_attempts ASC
      `
      : sql`
        WITH best_per_route AS (
          SELECT DISTINCT ON (a.athlete_id, s.id)
            a.athlete_id,
            ath.name as athlete_name,
            cat.name as category_name,
            s.id as sector_id,
            GREATEST(s.flash_points - (a.attempt_count - 1) * s.points_per_attempt, 0) as points,
            a.attempt_count
          FROM attempts a
          JOIN sectors s ON a.sector_id = s.id
          JOIN athletes ath ON a.athlete_id = ath.id
          JOIN categories cat ON ath.category_id = cat.id
          WHERE s.event_id = ${event.id}
            AND a.is_top = true
            AND a.attempt_count <= s.max_attempts
            AND ${catFilter}
          ORDER BY a.athlete_id, s.id, points DESC
        ),
        aggregated AS (
          SELECT
            athlete_id,
            athlete_name,
            category_name,
            SUM(points) as total_points,
            COUNT(CASE WHEN attempt_count = 1 THEN 1 END) as flash_count,
            SUM(attempt_count) as total_attempts
          FROM best_per_route
          GROUP BY athlete_id, athlete_name, category_name
        )
        SELECT *,
          ROW_NUMBER() OVER (ORDER BY total_points DESC, flash_count DESC, total_attempts ASC) as rn
        FROM aggregated
        ORDER BY total_points DESC, flash_count DESC, total_attempts ASC
      `

    const result = await db.execute<{
      athlete_id: string
      athlete_name: string
      category_name: string
      total_points: number
      flash_count: number
      total_attempts: number
      rn: number
    }>(rawSql)

    const rankings = result.rows.map((row: any) => ({
      rank: Number(row.rn),
      athlete: { id: row.athlete_id, name: row.athlete_name },
      category: row.category_name,
      totalPoints: Number(row.total_points),
      flashCount: Number(row.flash_count),
      totalAttempts: Number(row.total_attempts),
    }))

    return c.json({ success: true, data: { rankings, scoringType: "redpoint" } }, 200, {
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
    })
  }

  if (event.scoringType === "ifsc") {
    const rankings = await db
      .select({
        athleteId: athletes.id,
        athleteName: athletes.name,
        categoryName: categories.name,
        tops: sql<number>`sum(case when (${attempts.resultData}->>'top')::boolean = true then 1 else 0 end)`.as(
          "tops",
        ),
        zones:
          sql<number>`sum(case when (${attempts.resultData}->>'zone')::boolean = true then 1 else 0 end)`.as(
            "zones",
          ),
        totalAttempts:
          sql<number>`sum(coalesce((${attempts.resultData}->>'attempts_to_top')::int, (${attempts.resultData}->>'attempts')::int, 1))`.as(
            "total_attempts",
          ),
      })
      .from(attempts)
      .innerJoin(athletes, eq(attempts.athleteId, athletes.id))
      .innerJoin(sectors, eq(attempts.sectorId, sectors.id))
      .innerJoin(categories, eq(athletes.categoryId, categories.id))
      .where(sql`${sectors.eventId} = ${event.id} AND ${categoryFilter}`)
      .groupBy(athletes.id, athletes.name, categories.name)
      .orderBy(
        sql`sum(case when (${attempts.resultData}->>'top')::boolean = true then 1 else 0 end) DESC`,
        sql`sum(case when (${attempts.resultData}->>'zone')::boolean = true then 1 else 0 end) DESC`,
        sql`sum(coalesce((${attempts.resultData}->>'attempts_to_top')::int, (${attempts.resultData}->>'attempts')::int, 1)) ASC`,
      )

    const ranked = rankings.map((row, index) => ({
      rank: index + 1,
      athlete: { id: row.athleteId, name: row.athleteName },
      category: row.categoryName,
      tops: Number(row.tops),
      zones: Number(row.zones),
      totalAttempts: Number(row.totalAttempts),
    }))

    return c.json({ success: true, data: { rankings: ranked, scoringType: "ifsc" } }, 200, {
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
    })
  }

  const rankings = await db
    .select({
      athleteId: athletes.id,
      athleteName: athletes.name,
      categoryName: categories.name,
      tops: sql<number>`sum(case when ${attempts.isTop} then 1 else 0 end)`.as("tops"),
      totalAttempts: sql<number>`sum(${attempts.attemptCount})`.as("total_attempts"),
    })
    .from(attempts)
    .innerJoin(athletes, eq(attempts.athleteId, athletes.id))
    .innerJoin(sectors, eq(attempts.sectorId, sectors.id))
    .innerJoin(categories, eq(athletes.categoryId, categories.id))
    .where(sql`${sectors.eventId} = ${event.id} AND ${categoryFilter}`)
    .groupBy(athletes.id, athletes.name, categories.name)
    .orderBy(
      sql`sum(case when ${attempts.isTop} then 1 else 0 end) DESC`,
      sql`sum(${attempts.attemptCount}) ASC`,
    )

  const ranked = rankings.map((row, index) => ({
    rank: index + 1,
    athlete: { id: row.athleteId, name: row.athleteName },
    category: row.categoryName,
    tops: Number(row.tops),
    totalAttempts: Number(row.totalAttempts),
  }))

  return c.json({ success: true, data: { rankings: ranked, scoringType: "simple" } }, 200, {
    "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
  })
})

eventRoutes.get("/:slug/sectors", async (c) => {
  const slug = c.req.param("slug")

  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.slug, slug), inArray(events.status, ["published", "active", "completed"])))

  if (!event) {
    return notFoundResponse(c, "Event")
  }

  const sectorList = await db
    .select()
    .from(sectors)
    .where(eq(sectors.eventId, event.id))
    .orderBy(sectors.orderIndex)

  return c.json({ success: true, data: sectorList }, 200, {
    "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
  })
})

export { eventRoutes }
