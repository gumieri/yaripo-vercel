import { Hono } from "hono"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { gyms } from "@/lib/db/schema"

const gymRoutes = new Hono()

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

  return c.json({ success: true, data: gymList }, 200, {
    "Cache-Control": "public, s-maxage=120, stale-while-revalidate=240",
  })
})

gymRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug")

  const [gym] = await db.select().from(gyms).where(eq(gyms.slug, slug))

  if (!gym) {
    return c.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Gym not found" },
      },
      404,
    )
  }

  return c.json({ success: true, data: gym }, 200, {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
  })
})

export { gymRoutes }
