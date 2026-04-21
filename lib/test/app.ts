import { Hono } from "hono"
import { eventRoutes } from "@/lib/api/events"
import { queueRoutes } from "@/lib/api/queue"
import { attemptRoutes } from "@/lib/api/attempts"
import { gymRoutes } from "@/lib/api/gyms"
import { manageRoutes } from "@/lib/api/manage"
import { gymManagementRoutes } from "@/lib/api/gym-management"

export function createTestApp() {
  const app = new Hono().basePath("/api")
  app.route("/queue", queueRoutes)
  app.route("/attempts", attemptRoutes)
  app.route("/events", eventRoutes)
  app.route("/gyms", gymRoutes)
  app.route("/gym", gymManagementRoutes)
  app.route("/manage", manageRoutes)
  return app
}
