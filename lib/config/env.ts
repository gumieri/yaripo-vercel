// Centralized environment variable validation
export interface EnvConfig {
  DATABASE_URL: string
  NEXT_PUBLIC_APP_URL: string
  AUTH_GOOGLE_ID: string
  AUTH_GOOGLE_SECRET: string
  EMAIL_FROM: string
  NEXT_AUTH_SECRET: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
}
