import { argon2id, hash, verify } from "argon2"

/** Hash a password with Argon2id. Never log the plaintext or hash. */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    type: argon2id as 0 | 1 | 2,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  })
}

/** Verify a password against an Argon2id hash. */
export async function verifyPassword(
  digest: string,
  password: string
): Promise<boolean> {
  try {
    return await verify(digest, password)
  } catch {
    return false
  }
}

/**
 * Dummy verify used when no user exists, to reduce timing differences
 * that could leak whether an email is registered.
 */
export async function dummyPasswordVerify(password: string): Promise<void> {
  const dummyHash =
    "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
  try {
    await verify(dummyHash, password)
  } catch {
    // Expected — discard result
  }
}
