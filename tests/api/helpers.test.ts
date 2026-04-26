import { describe, it, expect } from "vitest"
import {
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
  conflictResponse,
  paymentRequiredResponse,
  methodNotAllowedResponse,
  internalServerErrorResponse,
  cacheHeaders,
  isPgUniqueConstraintError,
  safeParseInt,
  safeParseFloat,
} from "@/lib/api/helpers"

describe("API Helpers", () => {
  describe("errorResponse", () => {
    it("returns proper error response structure", () => {
      const c = { json: vi.fn() } as any
      errorResponse(c, "TEST_ERROR", "Test message", 400)
      expect(c.json).toHaveBeenCalledWith(
        {
          success: false,
          error: { code: "TEST_ERROR", message: "Test message" },
        },
        400,
      )
    })
  })

  describe("standard error responses", () => {
    it("notFoundResponse returns 404 with NOT_FOUND code", () => {
      const c = { json: vi.fn() } as any
      notFoundResponse(c, "Test resource")
      expect(c.json).toHaveBeenCalledWith(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Test resource not found" },
        },
        404,
      )
    })

    it("unauthorizedResponse returns 401 with UNAUTHORIZED code", () => {
      const c = { json: vi.fn() } as any
      unauthorizedResponse(c, "Test message")
      expect(c.json).toHaveBeenCalledWith(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Test message" },
        },
        401,
      )
    })

    it("forbiddenResponse returns 403 with FORBIDDEN code", () => {
      const c = { json: vi.fn() } as any
      forbiddenResponse(c, "Test message")
      expect(c.json).toHaveBeenCalledWith(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Test message" },
        },
        403,
      )
    })

    it("validationErrorResponse returns 400 with VALIDATION_ERROR code", () => {
      const c = { json: vi.fn() } as any
      validationErrorResponse(c, "Test message")
      expect(c.json).toHaveBeenCalledWith(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Test message" },
        },
        400,
      )
    })

    it("conflictResponse returns 409 with CONFLICT code", () => {
      const c = { json: vi.fn() } as any
      conflictResponse(c, "Test message")
      expect(c.json).toHaveBeenCalledWith(
        {
          success: false,
          error: { code: "CONFLICT", message: "Test message" },
        },
        409,
      )
    })

    it("paymentRequiredResponse returns 402 with PAYMENT_REQUIRED code", () => {
      const c = { json: vi.fn() } as any
      paymentRequiredResponse(c, "Test message")
      expect(c.json).toHaveBeenCalledWith(
        {
          success: false,
          error: { code: "PAYMENT_REQUIRED", message: "Test message" },
        },
        402,
      )
    })

    it("methodNotAllowedResponse returns 405 with METHOD_NOT_ALLOWED code", () => {
      const c = { json: vi.fn() } as any
      methodNotAllowedResponse(c)
      expect(c.json).toHaveBeenCalledWith(
        {
          success: false,
          error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" },
        },
        405,
      )
    })

    it("internalServerErrorResponse returns 500 with INTERNAL_SERVER_ERROR code", () => {
      const c = { json: vi.fn() } as any
      internalServerErrorResponse(c, "Test message")
      expect(c.json).toHaveBeenCalledWith(
        {
          success: false,
          error: { code: "INTERNAL_SERVER_ERROR", message: "Test message" },
        },
        500,
      )
    })
  })

  describe("cacheHeaders", () => {
    it("returns proper Cache-Control header structure", () => {
      const headers = cacheHeaders(30, 60)
      expect(headers).toEqual({
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      })
    })
  })

  describe("isPgUniqueConstraintError", () => {
    it("returns true for PG unique constraint error", () => {
      const error = new Error("duplicate key value violates unique constraint")
      ;(error as any).cause = { code: "23505" }
      expect(isPgUniqueConstraintError(error)).toBe(true)
    })

    it("returns false for non-PG errors", () => {
      const error = new Error("some other error")
      expect(isPgUniqueConstraintError(error)).toBe(false)
    })

    it("returns false for PG errors without cause", () => {
      const error = new Error("some other error")
      expect(isPgUniqueConstraintError(error)).toBe(false)
    })
  })

  describe("safeParseInt", () => {
    it("returns parsed integer for valid number string", () => {
      expect(safeParseInt("42")).toBe(42)
    })

    it("returns parsed integer for valid number", () => {
      expect(safeParseInt(42)).toBe(42)
    })

    it("returns default value for NaN", () => {
      expect(safeParseInt("not-a-number", 0)).toBe(0)
    })

    it("returns default value for invalid input", () => {
      expect(safeParseInt(null, 0)).toBe(0)
    })
  })

  describe("safeParseFloat", () => {
    it("returns parsed float for valid number string", () => {
      expect(safeParseFloat("42.5")).toBe(42.5)
    })

    it("returns parsed float for valid number", () => {
      expect(safeParseFloat(42.5)).toBe(42.5)
    })

    it("returns default value for NaN", () => {
      expect(safeParseFloat("not-a-number", 0)).toBe(0)
    })

    it("returns default value for invalid input", () => {
      expect(safeParseFloat(null, 0)).toBe(0)
    })
  })
})