import type { NextAuthConfig } from "next-auth"

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
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl
      const isLoggedIn = Boolean(auth?.user?.id)

      if (pathname.startsWith("/dashboard")) {
        return isLoggedIn
      }

      if (pathname === "/login") {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", request.nextUrl))
        }
        return true
      }

      if (pathname === "/") {
        return Response.redirect(
          new URL(isLoggedIn ? "/dashboard" : "/login", request.nextUrl)
        )
      }

      return true
    },
  },
  trustHost: true,
} satisfies NextAuthConfig
