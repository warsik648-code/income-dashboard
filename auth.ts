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

        // Stamp last login after successful credential check.
        const previousLoginAt = user.lastLoginAt
        const lastLoginAt = new Date()
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt },
        })
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            entityType: "User",
            entityId: user.id,
            action: "UPDATE",
            beforeJson: { lastLoginAt: previousLoginAt?.toISOString() ?? null },
            afterJson: { lastLoginAt: lastLoginAt.toISOString() },
            reason: "Successful login",
            ipAddress: ip === "unknown" ? null : ip.slice(0, 128),
          },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          passwordChangedAt: user.passwordChangedAt?.getTime() ?? 0,
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
        token.pwdAt =
          typeof user.passwordChangedAt === "number"
            ? user.passwordChangedAt
            : 0
        return token
      }

      if (!token.sub) return token

      const dbUser = await prisma.user.findFirst({
        where: { id: token.sub, deletedAt: null },
        select: { passwordChangedAt: true, email: true },
      })

      if (!dbUser) {
        // Returning null deletes the JWT / clears the session cookie.
        return null
      }

      const currentPwdAt = dbUser.passwordChangedAt?.getTime() ?? 0
      if ((token.pwdAt as number | undefined) !== currentPwdAt) {
        // Password changed elsewhere — invalidate this JWT.
        return null
      }

      token.email = dbUser.email
      return token
    },
    async session({ session, token }) {
      if (!token.sub) {
        // No valid subject — empty id is rejected by layout / requireUserId / middleware.
        return {
          ...session,
          user: {
            ...session.user,
            id: "",
            email: "",
            name: null,
          },
          expires: new Date(0).toISOString(),
        }
      }
      if (session.user) {
        session.user.id = token.sub
        if (typeof token.email === "string") {
          session.user.email = token.email
        }
      }
      return session
    },
  },
})
