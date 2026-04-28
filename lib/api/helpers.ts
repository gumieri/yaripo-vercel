import type { Context } from "hono"

export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
}

export function errorResponse(
  c: Context,
  code: string,
  message: string,
  status: number = 400,
): Response {
  return c.json(
    {
      success: false,
      error: { code, message },
    },
    status as 400 | 401 | 402 | 403 | 404 | 409,
  )
}

export function notFoundResponse(c: Context, resource: string = "Resource"): Response {
  return errorResponse(c, "NOT_FOUND", `${resource} not found`, 404)
}

export function unauthorizedResponse(
  c: Context,
  message: string = "Authentication required",
): Response {
  return errorResponse(c, "UNAUTHORIZED", message, 401)
}

export function forbiddenResponse(
  c: Context,
  message: string = "Insufficient permissions",
): Response {
  return errorResponse(c, "FORBIDDEN", message, 403)
}

export function validationErrorResponse(
  c: Context,
  message: string = "Validation failed",
): Response {
  return errorResponse(c, "VALIDATION_ERROR", message, 400)
}

export function conflictResponse(
  c: Context,
  message: string = "Resource already exists",
): Response {
  return errorResponse(c, "CONFLICT", message, 409)
}

export function safeParseInt(value: unknown, defaultValue: number = 0): number {
  if (typeof value === "number") {
    return Number.isNaN(value) ? defaultValue : value
  }
  if (typeof value === "string") {
    const parsed = parseInt(value, 10)
    return Number.isNaN(parsed) ? defaultValue : parsed
  }
  return defaultValue
}

export function safeParseFloat(value: unknown, defaultValue: number = 0): number {
  if (typeof value === "number") {
    return Number.isNaN(value) ? defaultValue : value
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value)
    return Number.isNaN(parsed) ? defaultValue : parsed
  }
  return defaultValue
}

export function paymentRequiredResponse(
  c: Context,
  message: string = "Payment required",
): Response {
  return errorResponse(c, "PAYMENT_REQUIRED", message, 402)
}

export function methodNotAllowedResponse(c: Context): Response {
  return errorResponse(c, "METHOD_NOT_ALLOWED", "Method not allowed", 405)
}

export function cacheHeaders(
  sMaxAge: number,
  staleWhileRevalidate: number,
): Record<string, string> {
  return {
    "Cache-Control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
  }
}

export function internalServerErrorResponse(
  c: Context,
  message: string = "Internal server error",
): Response {
  return errorResponse(c, "INTERNAL_SERVER_ERROR", message, 500)
}

export function isPgUniqueConstraintError(error: unknown): boolean {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: { code?: string } }).cause
    if (cause && typeof cause === "object" && "code" in cause && cause.code === "23505") {
      return true
    }
  }
  return false
}
