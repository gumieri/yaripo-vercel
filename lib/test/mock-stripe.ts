import { vi } from "vitest"

let mockCreateCustomer: ReturnType<typeof vi.fn> | null = null
let mockCreateCheckoutSession: ReturnType<typeof vi.fn> | null = null
let mockConstructEvent: ReturnType<typeof vi.fn> | null = null

export function __setMockStripeFns(fns: {
  createCustomer?: ReturnType<typeof vi.fn>
  createCheckoutSession?: ReturnType<typeof vi.fn>
  constructEvent?: ReturnType<typeof vi.fn>
}) {
  if (fns.createCustomer) mockCreateCustomer = fns.createCustomer
  if (fns.createCheckoutSession) mockCreateCheckoutSession = fns.createCheckoutSession
  if (fns.constructEvent) mockConstructEvent = fns.constructEvent
}

export function __resetMockStripe() {
  mockCreateCustomer = null
  mockCreateCheckoutSession = null
  mockConstructEvent = null
}

export const mockStripe = {
  customers: {
    create: (...args: any[]) => mockCreateCustomer?.(...args) ?? Promise.resolve({ id: "cus_mock" }),
  },
  checkout: {
    sessions: {
      create: (...args: any[]) =>
        mockCreateCheckoutSession?.(...args) ??
        Promise.resolve({ id: "cs_mock", url: "https://checkout.stripe.com/mock" }),
    },
  },
  webhooks: {
    constructEvent: (...args: any[]) =>
      mockConstructEvent?.(...args) ?? ({ type: "checkout.session.completed", data: { object: {} } }),
  },
}

vi.mock("@/lib/stripe/client", () => ({
  stripe: mockStripe,
  createStripeCustomer: (...args: any[]) => mockStripe.customers.create(...args),
  createEventCheckoutSession: (...args: any[]) => mockStripe.checkout.sessions.create(...args),
  getEventBasePriceId: () => "price_base_mock",
  getPerAthletePriceId: () => "price_per_athlete_mock",
}))
