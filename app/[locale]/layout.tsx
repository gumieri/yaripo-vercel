import { NextIntlClientProvider } from "next-intl"
import { Inter } from "next/font/google"
import { Providers } from "../providers"
import "../globals.css"
import { routing } from "@/i18n/routing"
import { getTranslations } from "next-intl/server"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Home" })

  return {
    title: t("footer"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const savedTheme = localStorage.getItem('yaripo-theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="bg-background text-foreground min-h-full font-sans">
        <Providers>
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  )
}
