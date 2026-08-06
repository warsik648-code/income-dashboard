import NextAuth from "next-auth"

import { authConfig } from "@/auth.config"

export default NextAuth(authConfig).auth

export const config = {
  // Do not match /login — it must always render. Auth API, static assets,
  // and Next internals are excluded by omitting them from the matcher.
  matcher: ["/", "/dashboard", "/dashboard/:path*"],
}
