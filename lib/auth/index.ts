import { SignJWT, jwtVerify } from 'jose'

export const COOKIE_NAME = 'suins_session'
const JWT_EXPIRY = '1h'

function getSecret(): Uint8Array {
  const secret = process.env.COOKIE_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('COOKIE_SECRET env var must be at least 32 characters')
  }
  return new TextEncoder().encode(secret)
}

function getValidTokens(): string[] {
  const raw = process.env.ACCESS_TOKENS
  if (!raw) return []
  return raw.split(',').map((t) => t.trim()).filter(Boolean)
}

/**
 * Returns true if the submitted token matches any token in ACCESS_TOKENS
 */
export function validateToken(submitted: string): boolean {
  if (!submitted || typeof submitted !== 'string') return false
  const tokens = getValidTokens()
  return tokens.includes(submitted.trim())
}

/**
 * Creates a signed JWT session token
 */
export async function createSession(): Promise<string> {
  const secret = getSecret()
  return await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secret)
}

/**
 * Verifies a session JWT. Returns true if valid and not expired.
 */
export async function verifySession(token: string): Promise<boolean> {
  if (!token) return false
  try {
    const secret = getSecret()
    await jwtVerify(token, secret)
    return true
  } catch {
    return false
  }
}
