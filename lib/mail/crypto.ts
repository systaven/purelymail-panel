import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

// AES-256-GCM encryption for app passwords stored in Supabase.
// Stored format: "v1:" + base64(iv | authTag | ciphertext).

const VERSION = 'v1';

export function getKey(): Buffer {
  const secret = process.env.MAIL_CREDENTIALS_KEY;
  if (!secret) {
    throw new Error('MAIL_CREDENTIALS_KEY environment variable is not set');
  }
  // Derive a fixed-length key so any sufficiently random string works.
  return createHash('sha256').update(secret).digest();
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${Buffer.concat([iv, tag, ciphertext]).toString('base64')}`;
}

export function decrypt(payload: string): string {
  const [version, data] = payload.split(':');
  if (version !== VERSION || !data) {
    throw new Error('Unsupported credential format');
  }
  const raw = Buffer.from(data, 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
