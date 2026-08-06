/**
 * Edge-safe route authorization used by Auth.js middleware.
 *
 * Important: middleware only decodes the JWT. It does NOT run auth.ts's
 * Node jwt callback (DB user / passwordChangedAt checks). Never bounce
 * "/login" → "/dashboard" here, or a Node-invalidated session cookie
 * causes ERR_TOO_MANY_REDIRECTS: /login ↔ /dashboard.
 */
export type AuthorizedDecision = true | false | { redirectTo: string }

export function decideAuthorized(input: {
  pathname: string
  isLoggedIn: boolean
}): AuthorizedDecision {
  const { pathname, isLoggedIn } = input

  if (pathname.startsWith("/dashboard")) {
    return isLoggedIn
  }

  // Always allow the login page through middleware. Valid sessions are
  // redirected from the login RSC using full Node auth().
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return true
  }

  if (pathname === "/") {
    return { redirectTo: isLoggedIn ? "/dashboard" : "/login" }
  }

  return true
}
