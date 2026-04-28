import { EnvConfig } from "@/lib/config/env"

export function validateEnv(): EnvConfig {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return {} as EnvConfig
  }

  const requiredEnvVars = [
    "DATABASE_URL",
    "NEXT_PUBLIC_APP_URL",
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
    "EMAIL_FROM",
    "NEXT_AUTH_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ] as const

  const missing: string[] = []
  const config = {} as EnvConfig

  for (const key of requiredEnvVars) {
    const value = process.env[key]
    if (!value) {
      missing.push(key)
    } else {
      config[key] = value
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
  }

  return config
}
