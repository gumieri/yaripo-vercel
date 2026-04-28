import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { handle } from "hono/vercel"
import { queueRoutes } from "@/lib/api/queue"
import { attemptRoutes } from "@/lib/api/attempts"
import { eventRoutes } from "@/lib/api/events"
import { venueRoutes } from "@/lib/api/venues"
import { manageRoutes } from "@/lib/api/manage"
import { venueManagementRoutes } from "@/lib/api/venue-management"

const app = new Hono().basePath("/api")

app.use("*", logger())
app.use("*", cors({ origin: process.env.NEXT_PUBLIC_APP_URL || "https://yaripo.app" }))

app.get("/health", (c) => c.json({ success: true, data: { status: "ok" } }))

app.route("/queue", queueRoutes)
app.route("/attempts", attemptRoutes)
app.route("/events", eventRoutes)
app.route("/venues", venueRoutes)
app.route("/venue", venueManagementRoutes)
app.route("/manage", manageRoutes)

app.notFound((c) =>
  c.json({ success: false, error: { code: "NOT_FOUND", message: "API endpoint not found" } }, 404),
)

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
export const OPTIONS = handle(app)
