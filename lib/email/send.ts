import { render } from "@react-email/render"
import { sendEmail } from "./client"
import MagicLinkEmail from "./templates/magic-link"
import JudgeInviteEmail from "./templates/judge-invite"
import JudgeInvitationAcceptedEmail from "./templates/judge-invitation-accepted"
import JudgeInvitationDeclinedEmail from "./templates/judge-invitation-declined"
import JudgeThankYouEmail from "./templates/judge-thank-you"
import PaymentReceiptEmail from "./templates/payment-receipt"

export async function sendMagicLink({
  to,
  url,
}: {
  to: string
  url: string
}) {
  const html = await render(
    MagicLinkEmail({ email: to, url })
  )
  return sendEmail({
    to,
    subject: "Acesse sua conta — Yaripo",
    html,
  })
}

export async function sendJudgeInvite({
  to,
  eventName,
  organizerName,
  inviteUrl,
  locale,
  supportedLocales,
}: {
  to: string
  eventName: string
  organizerName: string
  inviteUrl: string
  locale: string
  supportedLocales: { code: string; label: string }[]
}) {
  const html = await render(
    JudgeInviteEmail({
      eventName,
      organizerName,
      inviteUrl,
      locale,
      supportedLocales,
    })
  )
  return sendEmail({
    to,
    subject: `Convite para julgar — ${eventName}`,
    html,
  })
}

export async function sendJudgeInvitationAccepted({
  to,
  judgeName,
  eventName,
  organizerName,
  eventUrl,
}: {
  to: string
  judgeName: string
  eventName: string
  organizerName: string
  eventUrl: string
}) {
  const html = await render(
    JudgeInvitationAcceptedEmail({
      judgeName,
      eventName,
      organizerName,
      eventUrl,
    })
  )
  return sendEmail({
    to,
    subject: `Convite aceito — ${eventName}`,
    html,
  })
}

export async function sendJudgeInvitationDeclined({
  to,
  judgeName,
  eventName,
  organizerName,
}: {
  to: string
  judgeName: string
  eventName: string
  organizerName: string
}) {
  const html = await render(
    JudgeInvitationDeclinedEmail({
      judgeName,
      eventName,
      organizerName,
    })
  )
  return sendEmail({
    to,
    subject: `Convite recusado — ${eventName}`,
    html,
  })
}

export async function sendJudgeThankYou({
  to,
  judgeName,
  eventName,
  organizerName,
  eventUrl,
}: {
  to: string
  judgeName: string
  eventName: string
  organizerName: string
  eventUrl: string
}) {
  const html = await render(
    JudgeThankYouEmail({
      judgeName,
      eventName,
      organizerName,
      eventUrl,
    })
  )
  return sendEmail({
    to,
    subject: `Obrigado por julgar — ${eventName}`,
    html,
  })
}

export async function sendPaymentReceipt({
  to,
  customerName,
  eventName,
  planName,
  amount,
  paymentDate,
  receiptUrl,
}: {
  to: string
  customerName: string
  eventName: string
  planName: string
  amount: string
  paymentDate: string
  receiptUrl: string
}) {
  const html = await render(
    PaymentReceiptEmail({
      customerName,
      eventName,
      planName,
      amount,
      paymentDate,
      receiptUrl,
    })
  )
  return sendEmail({
    to,
    subject: `Recibo de pagamento — ${planName}`,
    html,
  })
}