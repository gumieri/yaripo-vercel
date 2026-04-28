import { z } from "zod"

export const UuidSchema = z.string().uuid()
export const SlugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(100, "Slug too long")
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes only")

export const OptionalPositiveIntSchema = z.preprocess(
  (val) => (val === null ? null : typeof val === "string" ? parseInt(val, 10) : val),
  z.number().int().positive("Must be a positive integer").nullable().optional(),
)

export const OptionalNonNegativeIntSchema = z.preprocess(
  (val) => (val === null ? null : typeof val === "string" ? parseInt(val, 10) : val),
  z.number().int().nonnegative("Must be a non-negative integer").nullable().optional(),
)
