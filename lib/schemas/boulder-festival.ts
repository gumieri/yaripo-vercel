import { z } from "zod"

export const boulderFestivalConfigSchema = z.object({
  eventFormat: z.enum(["redpoint", "onsight", "flash"]).default("redpoint"),
  scoringSystem: z.enum(["points", "tops", "combined"]).default("points"),
  maxAttemptsPerRoute: z.number().int().min(1).default(5),
  flashBonus: z.number().int().min(0).default(1000),
  pointsPerAttempt: z.number().int().min(0).default(100),
  bestRoutesCount: z.number().int().min(1).nullish(),
  allowRetries: z.boolean().default(true),
  showLiveLeaderboard: z.boolean().default(true),
  enableQueueManagement: z.boolean().default(true),
  enableRealtimeUpdates: z.boolean().default(true),
  autoAdvanceQueue: z.boolean().default(false),
  queueTimeoutMinutes: z.number().int().min(1).default(5),
  maxQueueSize: z.number().int().min(1).default(20),
  requireJudgeConfirmation: z.boolean().default(true),
  allowSelfReporting: z.boolean().default(false),
  enableSpectatorView: z.boolean().default(true),
  enableAthleteView: z.boolean().default(true),
  enableJudgeView: z.boolean().default(true),
  enableOrganizerView: z.boolean().default(true),
  customRules: z.string().nullish(),
  schedule: z
    .object({
      checkInStart: z.string().datetime().nullish(),
      checkInEnd: z.string().datetime().nullish(),
      competitionStart: z.string().datetime().nullish(),
      competitionEnd: z.string().datetime().nullish(),
      awardsCeremony: z.string().datetime().nullish(),
    })
    .optional(),
  categories: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1),
        gender: z.enum(["male", "female", "open"]),
        minAge: z.number().int().min(0).nullish(),
        maxAge: z.number().int().min(0).nullish(),
        routeCount: z.number().int().min(1).default(5),
        maxParticipants: z.number().int().min(1).nullish(),
      }),
    )
    .optional(),
  sectors: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1),
        orderIndex: z.number().int().min(0).default(0),
        flashPoints: z.number().int().min(0).default(1000),
        pointsPerAttempt: z.number().int().min(0).default(100),
        maxAttempts: z.number().int().min(1).default(5),
        routeCount: z.number().int().min(1).default(5),
        wallId: z.string().uuid().nullish(),
      }),
    )
    .optional(),
})

export type BoulderFestivalConfig = z.infer<typeof boulderFestivalConfigSchema>

export const defaultBoulderFestivalConfig: BoulderFestivalConfig = {
  eventFormat: "redpoint",
  scoringSystem: "points",
  maxAttemptsPerRoute: 5,
  flashBonus: 1000,
  pointsPerAttempt: 100,
  bestRoutesCount: null,
  allowRetries: true,
  showLiveLeaderboard: true,
  enableQueueManagement: true,
  enableRealtimeUpdates: true,
  autoAdvanceQueue: false,
  queueTimeoutMinutes: 5,
  maxQueueSize: 20,
  requireJudgeConfirmation: true,
  allowSelfReporting: false,
  enableSpectatorView: true,
  enableAthleteView: true,
  enableJudgeView: true,
  enableOrganizerView: true,
  customRules: null,
  schedule: {
    checkInStart: null,
    checkInEnd: null,
    competitionStart: null,
    competitionEnd: null,
    awardsCeremony: null,
  },
  categories: [],
  sectors: [],
}

export function validateBoulderFestivalConfig(config: unknown): BoulderFestivalConfig {
  return boulderFestivalConfigSchema.parse(config)
}

export function createBoulderFestivalConfig(
  overrides: Partial<BoulderFestivalConfig> = {},
): BoulderFestivalConfig {
  return {
    ...defaultBoulderFestivalConfig,
    ...overrides,
    schedule: {
      checkInStart: null,
      checkInEnd: null,
      competitionStart: null,
      competitionEnd: null,
      awardsCeremony: null,
      ...overrides.schedule,
    },
  }
}
