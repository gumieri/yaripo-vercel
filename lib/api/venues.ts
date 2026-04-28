import { Hono } from "hono"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { venues } from "@/lib/db/schema"
import { notFoundResponse, cacheHeaders } from "@/lib/api/helpers"
import { rateLimitMiddleware } from "@/lib/api/middleware/rate-limit"

const venueRoutes = new Hono()

venueRoutes.use("/*", rateLimitMiddleware(100, 60_000))

venueRoutes.get("/", async (c) => {
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

  return c.json({ success: true, data: venueList }, 200, cacheHeaders(120, 240))
})

venueRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug")

  const [venue] = await db.select().from(venues).where(eq(venues.slug, slug))

  if (!venue) {
    return notFoundResponse(c, "Venue")
  }

  return c.json({ success: true, data: venue }, 200, cacheHeaders(60, 120))
})

export { venueRoutes }
