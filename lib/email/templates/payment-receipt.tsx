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

interface PaymentReceiptEmailProps {
  customerName: string
  eventName: string
  planName: string
  amount: string
  paymentDate: string
  receiptUrl: string
}

export const PaymentReceiptEmail = ({
  customerName,
  eventName,
  planName,
  amount,
  paymentDate,
  receiptUrl,
}: PaymentReceiptEmailProps) => {
  const previewText = `Recibo de pagamento — ${planName}`

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

          <Heading style={heading}>Recibo de Pagamento</Heading>

          <Text style={text}>
            Olá, <strong>{customerName}</strong>!
          </Text>

          <Text style={text}>
            Confirmamos o recebimento do pagamento para o plano <strong>{planName}</strong>.
          </Text>

          <Section style={receiptSection}>
            <Text style={receiptRow}>
              <span style={receiptLabel}>Evento:</span>{" "}
              <span style={receiptValue}>{eventName}</span>
            </Text>
            <Text style={receiptRow}>
              <span style={receiptLabel}>Plano:</span> <span style={receiptValue}>{planName}</span>
            </Text>
            <Text style={receiptRow}>
              <span style={receiptLabel}>Valor:</span> <span style={receiptValue}>{amount}</span>
            </Text>
            <Text style={receiptRow}>
              <span style={receiptLabel}>Data:</span>{" "}
              <span style={receiptValue}>{paymentDate}</span>
            </Text>
          </Section>

          <Section style={buttonSection}>
            <a href={receiptUrl} style={button}>
              Ver Recibo Completo
            </a>
          </Section>

          <Text style={textSmall}>
            Se você não reconhece este pagamento, entre em contato conosco.
          </Text>

          <Text style={footer}>Yaripo — Plataforma de Competições de Escalada</Text>
        </Container>
      </Body>
    </Html>
  )
}

PaymentReceiptEmail.PreviewProps = {
  customerName: "João Silva",
  eventName: "Boulder Open 2026",
  planName: "Plano Pro",
  amount: "R$ 49,90",
  paymentDate: "25 de abril de 2026",
  receiptUrl: "https://yaripo.app/receipt/abc-123",
} satisfies PaymentReceiptEmailProps

export default PaymentReceiptEmail

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

const receiptSection = {
  margin: "24px auto",
  padding: "20px 24px",
  backgroundColor: "#f7fafc",
  borderRadius: "8px",
  maxWidth: "320px",
}

const receiptRow = {
  fontSize: "15px",
  lineHeight: "28px",
  color: "#4a5568",
  margin: "0",
}

const receiptLabel = {
  fontWeight: "600",
  color: "#2d3748",
}

const receiptValue = {
  color: "#4a5568",
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
