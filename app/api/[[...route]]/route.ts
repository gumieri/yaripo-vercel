import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { handle } from "hono/vercel"
import { queueRoutes } from "@/lib/api/queue"
import { attemptRoutes } from "@/lib/api/attempts"
import { eventRoutes } from "@/lib/api/events"
import { gymRoutes } from "@/lib/api/gyms"
import { adminRoutes } from "@/lib/api/admin"

const app = new Hono().basePath("/api")

app.use("*", logger())
app.use("*", cors({ origin: process.env.NEXT_PUBLIC_APP_URL || "https://yaripo.app" }))

app.get("/health", (c) => c.json({ success: true, data: { status: "ok" } }))

app.route("/queue", queueRoutes)
app.route("/attempts", attemptRoutes)
app.route("/events", eventRoutes)
app.route("/gyms", gymRoutes)
app.route("/admin", adminRoutes)

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
