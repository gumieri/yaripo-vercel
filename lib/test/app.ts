import { Hono } from "hono"
import { eventRoutes } from "@/lib/api/events"
import { queueRoutes } from "@/lib/api/queue"
import { attemptRoutes } from "@/lib/api/attempts"
import { venueRoutes } from "@/lib/api/venues"
import { manageRoutes } from "@/lib/api/manage"
import { venueManagementRoutes } from "@/lib/api/venue-management"

export function createTestApp() {
  const app = new Hono().basePath("/api")
  app.route("/queue", queueRoutes)
  app.route("/attempts", attemptRoutes)
  app.route("/events", eventRoutes)
  app.route("/venues", venueRoutes)
  app.route("/venue", venueManagementRoutes)
  app.route("/manage", manageRoutes)
  return app
}
