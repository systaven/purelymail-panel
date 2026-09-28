import { jwtVerify } from 'jose';

export const AUTH_COOKIE = 'auth-token';

// Returns the JWT signing key, or null if JWT_SECRET is not configured.
// There is deliberately no fallback: a default secret would let anyone forge tokens.
export function getJwtSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return null;
  }
  return new TextEncoder().encode(secret);
}

// Returns the token payload if the token is valid, otherwise null.
export async function verifyAuthToken(token: string | undefined) {
  const secret = getJwtSecret();
  if (!token || !secret) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.authenticated ? payload : null;
  } catch {
    return null;
  }
}

// Clerk sign-in is on only when both keys are configured; otherwise the panel
// runs with the admin password alone. Safe to call from the Edge middleware.
export function clerkEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}
