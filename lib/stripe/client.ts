import Stripe from "stripe"

const secretKey = process.env.STRIPE_SECRET_KEY

if (!secretKey && process.env.NODE_ENV !== "test") {
  throw new Error("STRIPE_SECRET_KEY is not set")
}

export const stripe = new Stripe(secretKey || "sk_test_mock", {
  typescript: true,
})

export function getEventBasePriceId(): string {
  const id = process.env.STRIPE_EVENT_BASE_PRICE_ID
  if (!id && process.env.NODE_ENV !== "test") {
    throw new Error("STRIPE_EVENT_BASE_PRICE_ID is not set")
  }
  return id || "price_base_mock"
}

export function getPerAthletePriceId(): string {
  const id = process.env.STRIPE_PER_ATHLETE_PRICE_ID
  if (!id && process.env.NODE_ENV !== "test") {
    throw new Error("STRIPE_PER_ATHLETE_PRICE_ID is not set")
  }
  return id || "price_per_athlete_mock"
}

export async function createStripeCustomer(params: {
  email: string
  name: string
  metadata?: Record<string, string>
}): Promise<Stripe.Customer> {
  return stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: params.metadata,
  })
}

export async function createEventCheckoutSession(params: {
  customerId: string
  gymId: string
  eventId: string
  eventName: string
  athleteCount: number
  type: "publish" | "delta"
}): Promise<Stripe.Checkout.Session> {
  const lineItems: Array<{ price: string; quantity: number }> = [
    {
      price: getEventBasePriceId(),
      quantity: 1,
    },
  ]

  if (params.athleteCount > 0) {
    lineItems.push({
      price: getPerAthletePriceId(),
      quantity: params.athleteCount,
    })
  }

  const suffix = params.type === "publish" ? params.eventName : `${params.eventName} (extra)`

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer: params.customerId,
    line_items: lineItems,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://yaripo.app"}/gym/${params.gymId}/events/${params.eventId}?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://yaripo.app"}/gym/${params.gymId}/events/${params.eventId}?payment=cancelled`,
    metadata: {
      eventId: params.eventId,
      gymId: params.gymId,
      type: params.type,
      athleteCount: String(params.athleteCount),
    },
    payment_intent_data: {
      statement_descriptor_suffix: suffix.slice(0, 22),
    },
  })
}
