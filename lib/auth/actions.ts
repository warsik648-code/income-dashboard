"use server"

import { AuthError } from "next-auth"
import { redirect } from "next/navigation"

import { signIn, signOut } from "@/auth"
import { AUTH_ERROR } from "@/lib/auth/errors"
import { loginSchema } from "@/lib/validations/auth"

export type LoginActionState = {
  error?: string
}

export async function loginAction(
  _prev: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { error: AUTH_ERROR.invalidCredentials }
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: AUTH_ERROR.invalidCredentials }
      }
      return { error: AUTH_ERROR.invalidCredentials }
    }

    if (error instanceof Error && error.message === AUTH_ERROR.tooManyAttempts) {
      return { error: AUTH_ERROR.tooManyAttempts }
    }

    // Next.js redirect() throws; rethrow so navigation works
    throw error
  }

  return {}
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" })
  redirect("/login")
}
