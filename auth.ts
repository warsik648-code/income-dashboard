import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

import { authConfig } from "@/auth.config"
import { AUTH_ERROR } from "@/lib/auth/errors"
import {
  dummyPasswordVerify,
  verifyPassword,
} from "@/lib/auth/password"
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  getLoginRateLimitKey,
  recordLoginAttempt,
} from "@/lib/auth/rate-limit"
import { prisma } from "@/lib/db"
import { loginSchema } from "@/lib/validations/auth"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) {
          return null
        }

        const { email, password } = parsed.data
        const forwarded = request?.headers.get("x-forwarded-for")
        const ip =
          forwarded?.split(",")[0]?.trim() ||
          request?.headers.get("x-real-ip") ||
          "unknown"
        const rateKey = getLoginRateLimitKey(ip, email)
        const limit = checkLoginRateLimit(rateKey)

        if (!limit.allowed) {
          throw new Error(AUTH_ERROR.tooManyAttempts)
        }

        recordLoginAttempt(rateKey)

        const user = await prisma.user.findFirst({
          where: { email, deletedAt: null },
        })

        if (!user) {
          await dummyPasswordVerify(password)
          return null
        }

        const valid = await verifyPassword(user.passwordHash, password)
        if (!valid) {
          return null
        }

        clearLoginRateLimit(rateKey)

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        if (typeof token.email === "string") {
          session.user.email = token.email
        }
      }
      return session
    },
  },
})
