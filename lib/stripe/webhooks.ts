import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { eventPayments, events } from "@/lib/db/schema"
import type Stripe from "stripe"

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { eventId, userId, type } = session.metadata || {}

  if (!eventId || !userId || !type) {
    console.error("[stripe webhook] Missing metadata in checkout session", session.id)
    return
  }

  await db
    .update(eventPayments)
    .set({
      status: "paid",
      stripePaymentIntentId: session.payment_intent as string,
      updatedAt: new Date(),
    })
    .where(eq(eventPayments.stripeCheckoutSessionId, session.id))

  if (type === "publish") {
    await db
      .update(events)
      .set({ status: "published", updatedAt: new Date() })
      .where(eq(events.id, eventId))
  }

  if (type === "delta") {
    const [event] = await db.select().from(events).where(eq(events.id, eventId))
    if (event?.status === "published") {
      await db
        .update(events)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(events.id, eventId))
    }
  }
}

export async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const { eventId } = session.metadata || {}

  if (!eventId) {
    console.error("[stripe webhook] Missing eventId in expired session", session.id)
    return
  }

  await db
    .update(eventPayments)
    .set({ status: "expired", updatedAt: new Date() })
    .where(eq(eventPayments.stripeCheckoutSessionId, session.id))
}

export async function handlePaymentFailed(session: Stripe.Checkout.Session) {
  const { eventId } = session.metadata || {}

  if (!eventId) {
    console.error("[stripe webhook] Missing eventId in failed payment", session.id)
    return
  }

  await db
    .update(eventPayments)
    .set({ status: "failed", updatedAt: new Date() })
    .where(eq(eventPayments.stripeCheckoutSessionId, session.id))
}

export async function handleAsyncPaymentFailed(session: Stripe.Checkout.Session) {
  const { eventId } = session.metadata || {}

  if (!eventId) {
    console.error("[stripe webhook] Missing eventId in async failed payment", session.id)
    return
  }

  await db
    .update(eventPayments)
    .set({ status: "failed", updatedAt: new Date() })
    .where(eq(eventPayments.stripeCheckoutSessionId, session.id))
}

export async function handleAsyncPaymentSucceeded(session: Stripe.Checkout.Session) {
  await handleCheckoutCompleted(session)
}
