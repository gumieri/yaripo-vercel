import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const { auth } = NextAuth({
  providers: [
    CredentialsProvider({
      id: "edge-placeholder",
      name: "Edge Placeholder",
      credentials: {},
      authorize: () => null,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
})
