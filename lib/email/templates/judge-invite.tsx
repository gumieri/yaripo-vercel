import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import * as React from "react"

interface JudgeInviteEmailProps {
  eventName: string
  organizerName: string
  inviteUrl: string
  locale: string
  supportedLocales: { code: string; label: string }[]
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://yaripo.app"

export const JudgeInviteEmail = ({
  eventName,
  organizerName,
  inviteUrl,
  locale,
  supportedLocales,
}: JudgeInviteEmailProps) => {
  const previewText = `You've been invited to judge ${eventName}`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logo}>Yari<span style={logoHighlight}>po</span></Text>
          </Section>

          {/* Language Switcher */}
          <Section style={langSection}>
            <Text style={langLabel}>View in:</Text>
            {supportedLocales.map((loc, idx) => (
              <React.Fragment key={loc.code}>
                {idx > 0 && <Text style={langDivider}>|</Text>}
                <Link
                  href={`${baseUrl}/${loc.code}/invitations?invite=${inviteUrl.split("/").pop()}`}
                  style={loc.code === locale ? langLinkActive : langLink}
                >
                  {loc.label}
                </Link>
              </React.Fragment>
            ))}
          </Section>

          <Heading style={heading}>You&apos;re invited to judge!</Heading>

          <Text style={text}>
            <strong>{organizerName}</strong> has invited you to judge{" "}
            <strong>{eventName}</strong> on Yaripo.
          </Text>

          <Section style={buttonSection}>
            <Button style={button} href={inviteUrl}>
              View Invitation
            </Button>
          </Section>

          <Text style={textSmall}>
            This link will take you to the invitation page where you can accept or decline.
          </Text>

          <Text style={footer}>
            Yaripo — Climbing Competition Platform
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

JudgeInviteEmail.PreviewProps = {
  eventName: "Boulder Open 2026",
  organizerName: "João Silva",
  inviteUrl: "https://yaripo.app/en/invitations/abc-123",
  locale: "en",
  supportedLocales: [
    { code: "en", label: "EN" },
    { code: "pt", label: "PT" },
    { code: "es", label: "ES" },
    { code: "fr", label: "FR" },
    { code: "de", label: "DE" },
    { code: "it", label: "IT" },
    { code: "ja", label: "JA" },
    { code: "ko", label: "KO" },
    { code: "uk", label: "UK" },
  ],
} satisfies JudgeInviteEmailProps

export default JudgeInviteEmail

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
  marginBottom: "16px",
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

const langSection = {
  textAlign: "center" as const,
  marginBottom: "24px",
  padding: "0 24px",
}

const langLabel = {
  fontSize: "12px",
  color: "#718096",
  margin: "0 8px 0 0",
  display: "inline",
}

const langLink: React.CSSProperties = {
  fontSize: "12px",
  color: "#22c55e",
  textDecoration: "none",
  margin: "0 4px",
  display: "inline",
}

const langLinkActive: React.CSSProperties = {
  ...langLink,
  fontWeight: "700",
}

const langDivider = {
  color: "#cbd5e0",
  margin: "0 2px",
  display: "inline",
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