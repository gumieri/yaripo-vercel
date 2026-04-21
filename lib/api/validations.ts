import { z } from "zod"

export const eventScoringTypeEnum = z.enum(["simple", "ifsc", "redpoint"])
export const eventStatusEnum = z.enum(["draft", "published", "active", "completed", "archived"])
export const userRoleEnum = z.enum(["admin", "judge", "athlete"])
export const gymMemberRoleEnum = z.enum(["owner", "admin", "judge"])
export const categoryGenderEnum = z.enum(["male", "female", "open"])
export const queueStatusEnum = z.enum(["waiting", "active", "completed", "dropped"])
export const paymentTypeEnum = z.enum(["publish", "delta"])
export const paymentStatusEnum = z.enum(["pending", "paid", "failed", "expired"])

export const positiveIntSchema = z.preprocess(
  (val) => (typeof val === "string" ? parseInt(val, 10) : val),
  z.number().int().positive("Must be a positive integer"),
)

export const nonNegativeIntSchema = z.preprocess(
  (val) => (typeof val === "string" ? parseInt(val, 10) : val),
  z.number().int().nonnegative("Must be a non-negative integer"),
)

export const optionalPositiveIntSchema = z.preprocess(
  (val) => (val === null ? null : typeof val === "string" ? parseInt(val, 10) : val),
  z.number().int().positive("Must be a positive integer").nullable().optional(),
)

export const optionalNonNegativeIntSchema = z.preprocess(
  (val) => (val === null ? null : typeof val === "string" ? parseInt(val, 10) : val),
  z.number().int().nonnegative("Must be a non-negative integer").nullable().optional(),
)

export const createEventSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name too long"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(100, "Slug too long")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes only"),
  gymId: z.string().uuid("Invalid gym ID"),
  scoringType: eventScoringTypeEnum.default("simple"),
  description: z.string().trim().max(2000, "Description too long").nullish().default(null),
  startsAt: z.string().datetime("Invalid start date").nullish().default(null),
  endsAt: z.string().datetime("Invalid end date").nullish().default(null),
})

export const updateEventSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name too long").optional(),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(100, "Slug too long")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes only")
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, "Description too long")
    .nullish()
    .optional(),
  scoringType: eventScoringTypeEnum.optional(),
  startsAt: z
    .union([z.string().datetime("Invalid start date"), z.literal(null)])
    .optional(),
  endsAt: z
    .union([z.string().datetime("Invalid end date"), z.literal(null)])
    .optional(),
  status: eventStatusEnum.optional(),
  bestRoutesCount: optionalPositiveIntSchema,
})

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  gender: categoryGenderEnum.default("open"),
  minAge: optionalNonNegativeIntSchema,
  maxAge: optionalNonNegativeIntSchema,
})

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long").optional(),
  gender: categoryGenderEnum.optional(),
  minAge: optionalNonNegativeIntSchema,
  maxAge: optionalNonNegativeIntSchema,
})

export const createSectorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  orderIndex: nonNegativeIntSchema.default(0),
  flashPoints: positiveIntSchema.default(1000),
  pointsPerAttempt: nonNegativeIntSchema.default(100),
  maxAttempts: positiveIntSchema.default(5),
})

export const updateSectorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long").optional(),
  orderIndex: nonNegativeIntSchema.optional(),
  flashPoints: positiveIntSchema.optional(),
  pointsPerAttempt: nonNegativeIntSchema.optional(),
  maxAttempts: positiveIntSchema.optional(),
})

export const createAthleteSchema = z.object({
  categoryId: z.string().uuid("Invalid category ID"),
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  externalId: z.string().trim().max(50, "External ID too long").nullish().default(null),
})

export const bulkCreateAthletesSchema = z.object({
  categoryId: z.string().uuid("Invalid category ID"),
  names: z
    .array(z.string().trim().min(1, "Name cannot be empty").max(100, "Name too long"))
    .min(1, "At least one name is required")
    .max(200, "Maximum 200 athletes per batch"),
})

export const createAttemptSchema = z.object({
  sectorId: z.string().uuid("Invalid sector ID"),
  athleteId: z.string().uuid("Invalid athlete ID"),
  isTop: z.boolean().default(false),
  attemptCount: positiveIntSchema.default(1),
  resultData: z.record(z.string(), z.unknown()).nullish().default(null),
  idempotencyKey: z.string().min(1, "Idempotency key is required"),
})

export const joinQueueSchema = z.object({
  sectorId: z.string().uuid("Invalid sector ID"),
  athleteId: z.string().uuid("Invalid athlete ID").optional(),
})

export const popQueueSchema = z.object({
  sectorId: z.string().uuid("Invalid sector ID"),
})

export const dropQueueSchema = z.object({
  queueId: z.string().uuid("Invalid queue ID"),
})

export const publishEventSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
})

export const activateEventSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
})
