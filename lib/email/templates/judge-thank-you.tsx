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

interface JudgeThankYouEmailProps {
  judgeName: string
  eventName: string
  organizerName: string
  eventUrl: string
}

export const JudgeThankYouEmail = ({
  judgeName,
  eventName,
  organizerName,
  eventUrl,
}: JudgeThankYouEmailProps) => {
  const previewText = `Obrigado por julgar ${eventName}!`

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

          <Heading style={heading}>Obrigado pelo seu trabalho!</Heading>

          <Text style={text}>
            Olá, <strong>{judgeName}</strong>!
          </Text>

          <Text style={text}>
            A competição <strong>{eventName}</strong> foi finalizada. Muito obrigado por contribuir
            como juiz — o seu trabalho foi essencial para o sucesso do evento!
          </Text>

          <Text style={text}>A classificação final já está disponível.</Text>

          <Section style={buttonSection}>
            <a href={eventUrl} style={button}>
              Ver Classificação Final
            </a>
          </Section>

          <Text style={textSmall}>
            Enviado por {organizerName} em nome da organização do evento.
          </Text>

          <Text style={footer}>Yaripo — Plataforma de Competições de Escalada</Text>
        </Container>
      </Body>
    </Html>
  )
}

JudgeThankYouEmail.PreviewProps = {
  judgeName: "Maria Santos",
  eventName: "Boulder Open 2026",
  organizerName: "João Silva",
  eventUrl: "https://yaripo.app/pt/events/boulder-open-2026",
} satisfies JudgeThankYouEmailProps

export default JudgeThankYouEmail

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
  color: "#1a1a2e",
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

const textSmall = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#718096",
  textAlign: "center" as const,
  margin: "0 0 24px",
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
