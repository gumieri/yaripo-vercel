import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Email from "next-auth/providers/email"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      image?: string | null
      isPlatformAdmin: boolean
    }
  }
}

// Auth.js Drizzle adapter types don't match pg-core exactly.
// Runtime behavior is correct — PostgreSQL schema is compatible.
const adapter = DrizzleAdapter(db, {
  usersTable: schema.users,
  accountsTable: schema.accounts,
  sessionsTable: schema.sessions,
  verificationTokensTable: schema.verificationTokens,
} as never)

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Email({
      from: process.env.EMAIL_FROM,
      server: {
        host: "localhost",
        port: 25,
        auth: {
          user: "",
          pass: "",
        },
      },
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        const { render } = await import("@react-email/render")
        const MagicLinkEmail = (await import("@/lib/email/templates/magic-link")).default
        const { sendEmail } = await import("@/lib/email/client")

        const html = await render(MagicLinkEmail({ url, email }))

        await sendEmail({
          to: email,
          subject: "Sign in to Yaripo",
          html,
        })
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub
        session.user.isPlatformAdmin = session.user.email === "admin@yaripo.app"
      }
      return session
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id
      }
      if (trigger === "update" && session) {
        token.sub = session.user.id
      }
      return token
    },
  },
  session: {
    strategy: "jwt",
  },
})
