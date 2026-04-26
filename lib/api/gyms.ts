import { Hono } from "hono"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { gyms } from "@/lib/db/schema"
import { notFoundResponse, cacheHeaders } from "@/lib/api/helpers"
import { rateLimitMiddleware } from "@/lib/api/middleware/rate-limit"

const gymRoutes = new Hono()

gymRoutes.use("/*", rateLimitMiddleware(100, 60_000))

gymRoutes.get("/", async (c) => {
  const gymList = await db
    .select({
      id: gyms.id,
      name: gyms.name,
      slug: gyms.slug,
      city: gyms.city,
      state: gyms.state,
    })
    .from(gyms)

  return c.json({ success: true, data: gymList }, 200, cacheHeaders(120, 240))
})

gymRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug")

  const [gym] = await db.select().from(gyms).where(eq(gyms.slug, slug))

  if (!gym) {
    return notFoundResponse(c, "Gym")
  }

  return c.json({ success: true, data: gym }, 200, cacheHeaders(60, 120))
})

export { gymRoutes }
