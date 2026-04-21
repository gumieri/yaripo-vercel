import type Stripe from "stripe"
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe/client"
import { handleCheckoutCompleted, handleCheckoutExpired } from "@/lib/stripe/webhooks"

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
      status: 400,
    })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET is not set")
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500,
    })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error("[stripe webhook] Signature verification failed", err)
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutExpired(session)
        break
      }
      default:
        console.log(`[stripe webhook] Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`[stripe webhook] Error processing ${event.type}`, err)
    return new Response(JSON.stringify({ error: "Webhook handler failed" }), { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
}
