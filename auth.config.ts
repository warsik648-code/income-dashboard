import type { NextAuthConfig } from "next-auth"

import { decideAuthorized } from "@/lib/auth/authorized"

/**
 * Edge-safe Auth.js config used by middleware.
 * Credentials authorize (Prisma/Argon2) lives in auth.ts only.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8 hours for a finance app
    updateAge: 60 * 30,
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [],
  callbacks: {
    // Edge-safe: map JWT subject onto session.user.id for middleware checks.
    // (Node auth.ts also sets this; middleware only loads this config.)
    session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub
      }
      return session
    },
    authorized({ auth, request }) {
      const decision = decideAuthorized({
        pathname: request.nextUrl.pathname,
        isLoggedIn: Boolean(auth?.user?.id?.trim()),
      })

      if (decision === true || decision === false) {
        return decision
      }

      return Response.redirect(new URL(decision.redirectTo, request.nextUrl))
    },
  },
  trustHost: true,
} satisfies NextAuthConfig
