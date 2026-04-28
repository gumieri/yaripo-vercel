import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import * as React from "react"

interface JudgeInvitationDeclinedEmailProps {
  judgeName: string
  eventName: string
  organizerName: string
}

export const JudgeInvitationDeclinedEmail = ({
  judgeName,
  eventName,
  organizerName,
}: JudgeInvitationDeclinedEmailProps) => {
  const previewText = `${judgeName} recusou o convite para julgar ${eventName}`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logo}>
              Yari<span style={logoHighlight}>po</span>
            </Text>
          </Section>

          <Heading style={heading}>Convite Recusado</Heading>

          <Text style={text}>
            <strong>{judgeName}</strong> recusou o seu convite para julgar{" "}
            <strong>{eventName}</strong>.
          </Text>

          <Text style={text}>
            Você pode enviar um novo convite a outro juiz pelo painel de gerenciamento do evento.
          </Text>

          <Text style={footer}>Yaripo — Plataforma de Competições de Escalada</Text>
        </Container>
      </Body>
    </Html>
  )
}

JudgeInvitationDeclinedEmail.PreviewProps = {
  judgeName: "Maria Santos",
  eventName: "Boulder Open 2026",
  organizerName: "João Silva",
} satisfies JudgeInvitationDeclinedEmailProps

export default JudgeInvitationDeclinedEmail

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 0",
  maxWidth: "440px",
  borderRadius: "8px",
}

const logoSection = {
  textAlign: "center" as const,
  marginBottom: "24px",
}

const logo = {
  fontSize: "28px",
  fontWeight: "700",
  color: "#1a1a2e",
  margin: "0",
}

const logoHighlight = {
  color: "#22c55e",
}

const heading = {
  fontSize: "24px",
  fontWeight: "600",
  color: "#ef4444",
  textAlign: "center" as const,
  margin: "0 0 24px",
  padding: "0 24px",
}

const text = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#4a5568",
  textAlign: "center" as const,
  margin: "0 0 16px",
  padding: "0 24px",
}

const footer = {
  fontSize: "14px",
  color: "#a0aec0",
  textAlign: "center" as const,
  margin: "0",
  padding: "0 24px",
}
