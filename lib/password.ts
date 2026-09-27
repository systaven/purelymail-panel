import { createHash, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';

// Checks a login attempt against ADMIN_PASSWORD.
// ADMIN_PASSWORD may be a bcrypt hash (recommended) or a plain-text password.
// Kept separate from lib/auth.ts because middleware runs on the Edge runtime,
// which cannot load Node's crypto module.
export async function verifyAdminPassword(input: string, adminPassword: string): Promise<boolean> {
  if (/^\$2[aby]\$\d{2}\$/.test(adminPassword)) {
    return bcrypt.compare(input, adminPassword);
  }

  // Hash both sides so the buffers have equal length, then compare in constant time.
  const a = createHash('sha256').update(input).digest();
  const b = createHash('sha256').update(adminPassword).digest();
  return timingSafeEqual(a, b);
}
