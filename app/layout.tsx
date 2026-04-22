import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Yaripo - Climbing Competition Platform",
  description:
    "Manage and participate in climbing competitions. Real-time leaderboards, queue management, and performance tracking.",
  metadataBase: new URL("https://yaripo.app"),
  openGraph: {
    title: "Yaripo",
    description: "Climbing competition management platform",
    url: "https://yaripo.app",
    siteName: "Yaripo",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
