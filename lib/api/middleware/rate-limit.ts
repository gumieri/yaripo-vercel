import { createMiddleware } from "hono/factory"
import { errorResponse } from "@/lib/api/helpers"

// Simple in-memory store for rate limiting (in production, use Redis)
const hits = new Map<string, number>()
const resetTimes = new Map<string, number>()

export const rateLimitMiddleware = (maxRequests = 100, windowMs = 60000) =>
  createMiddleware(async (c, next) => {
    const key = c.get("userId") || c.req.header("x-forwarded-for") || "anonymous"
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean up old entries
    if (resetTimes.has(key) && resetTimes.get(key)! < windowStart) {
      hits.delete(key)
      resetTimes.delete(key)
    }

    const currentHits = hits.get(key) || 0
    if (currentHits >= maxRequests) {
      return errorResponse(c, "RATE_LIMIT_EXCEEDED", "Too many requests, please try again later", 429)
    }

    // Update hit count
    hits.set(key, currentHits + 1)
    if (!resetTimes.has(key)) {
      resetTimes.set(key, now + windowMs)
    }

    await next()
  })