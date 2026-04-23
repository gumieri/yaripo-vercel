import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import * as React from "react"

interface MagicLinkEmailProps {
  url: string
  email: string
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://yaripo.app"

export const MagicLinkEmail = ({ url, email }: MagicLinkEmailProps) => {
  const previewText = `Sign in to Yaripo`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logo}>Yari<span style={logoHighlight}>po</span></Text>
          </Section>

          <Heading style={heading}>Sign in to Yaripo</Heading>

          <Text style={text}>
            Click the button below to sign in to your account. This link will expire in 1 hour.
          </Text>

          <Section style={buttonSection}>
            <Button style={button} href={url}>
              Sign in
            </Button>
          </Section>

          <Text style={text}>
            If you didn&apos;t request this email, you can safely ignore it.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Having trouble? Copy and paste this link into your browser:{" "}
            <Link href={url} style={link}>
              {url}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

MagicLinkEmail.PreviewProps = {
  url: "https://yaripo.app/api/auth/verify-request?token=abc123",
  email: "user@example.com",
} satisfies MagicLinkEmailProps

export default MagicLinkEmail

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

const hr = {
  border: "none",
  borderTop: "1px solid #e2e8f0",
  margin: "24px 24px 0",
}

const footer = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#718096",
  textAlign: "center" as const,
  margin: "0",
  padding: "0 24px",
}

const link = {
  color: "#22c55e",
  textDecoration: "underline",
}