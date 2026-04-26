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

interface JudgeInvitationAcceptedEmailProps {
  judgeName: string
  eventName: string
  organizerName: string
  eventUrl: string
}

export const JudgeInvitationAcceptedEmail = ({
  judgeName,
  eventName,
  organizerName,
  eventUrl,
}: JudgeInvitationAcceptedEmailProps) => {
  const previewText = `${judgeName} aceitou o convite para julgar ${eventName}`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logo}>Yari<span style={logoHighlight}>po</span></Text>
          </Section>

          <Heading style={heading}>Convite Aceito!</Heading>

          <Text style={text}>
            <strong>{judgeName}</strong> aceitou o seu convite para julgar{" "}
            <strong>{eventName}</strong>.
          </Text>

          <Text style={text}>
            O juiz já pode acessar o painel de julgamento e começar a registrar tentativas.
          </Text>

          <Section style={buttonSection}>
            <a href={eventUrl} style={button}>
              Ver Evento
            </a>
          </Section>

          <Text style={footer}>
            Yaripo — Plataforma de Competições de Escalada
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

JudgeInvitationAcceptedEmail.PreviewProps = {
  judgeName: "Maria Santos",
  eventName: "Boulder Open 2026",
  organizerName: "João Silva",
  eventUrl: "https://yaripo.app/pt/manage/events/boulder-open-2026",
} satisfies JudgeInvitationAcceptedEmailProps

export default JudgeInvitationAcceptedEmail

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
  color: "#22c55e",
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

const buttonSection = {
  textAlign: "center" as const,
  margin: "32px 0",
}

const button = {
  backgroundColor: "#22c55e",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
}

const footer = {
  fontSize: "14px",
  color: "#a0aec0",
  textAlign: "center" as const,
  margin: "0",
  padding: "0 24px",
}
