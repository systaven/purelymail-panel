import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import { getPurelyMail } from '@/lib/purelymail';
import { decrypt, encrypt } from './crypto';
import { getAppPassword, revokeAppPassword } from './credentials';

// Where a mailbox's webmail password (a PurelyMail app password) comes from.
export interface CredentialStore {
  // The app password, creating one if needed.
  get(): Promise<string>;
  // Called after a failed login: forget the password so get() makes a new one.
  invalidate(): Promise<void>;
  // Deletes the password in PurelyMail and forgets it ("Reset access").
  revoke(): Promise<void>;
}

// A mailbox the caller may use, with the credentials to open it.
export interface MailboxHandle {
  address: string;
  credentials: CredentialStore;
}

// Mailboxes nobody owns belong to the admin: the app password is stored
// encrypted in Supabase and shared by admin sessions.
export function sharedMailbox(address: string): MailboxHandle {
  return {
    address,
    credentials: {
      get: () => getAppPassword(address),
      invalidate: () => revokeAppPassword(address),
      revoke: () => revokeAppPassword(address),
    },
  };
}

// --- Private mailboxes -------------------------------------------------------
// A mailbox owned by a user is private: its app password lives only in that
// user's browser, in an HttpOnly cookie encrypted with the server key and bound
// to the user and address. Nothing is stored server-side, so the admin (or
// anyone with database access) has no way to open it through the panel.

const COOKIE_PREFIX = 'pmx_';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
const APP_PASSWORD_NAME = 'PurelyMail Panel webmail (private)';

interface CookiePayload {
  m: string; // mailbox
  u: string; // owner's Clerk user ID
  p: string; // app password
}

// Cookie names don't reveal the address.
function cookieName(ownerId: string, address: string): string {
  return COOKIE_PREFIX + createHash('sha256').update(`${ownerId}:${address}`).digest('hex').slice(0, 20);
}

function serializeCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; HttpOnly; Path=/api; Max-Age=${maxAge}; SameSite=Strict${
    process.env.NODE_ENV === 'production' ? '; Secure' : ''
  }`;
}

// Adds a Set-Cookie header without dropping ones already set on the response.
export function appendSetCookie(res: NextApiResponse, cookie: string): void {
  const existing = res.getHeader('Set-Cookie');
  const list = existing === undefined ? [] : Array.isArray(existing) ? existing : [String(existing)];
  res.setHeader('Set-Cookie', [...list, cookie]);
}

function readPayload(value: string | undefined): CookiePayload | null {
  if (!value) return null;
  try {
    return JSON.parse(decrypt(decodeURIComponent(value)));
  } catch {
    return null;
  }
}

export function privateMailbox(
  address: string,
  ownerId: string,
  req: NextApiRequest,
  res: NextApiResponse
): MailboxHandle {
  const name = cookieName(ownerId, address);
  // Within one request, remember a password we just created or cleared.
  let current: string | null | undefined;

  const fromCookie = (): string | null => {
    const payload = readPayload(req.cookies[name]);
    return payload && payload.m === address && payload.u === ownerId ? payload.p : null;
  };

  const clear = () => {
    current = null;
    appendSetCookie(res, serializeCookie(name, '', 0));
  };

  const store: CredentialStore = {
    async get() {
      if (current === undefined) current = fromCookie();
      if (current) return current;

      // Credentials the admin stored before this mailbox became private must not
      // outlive the handover.
      await revokeAppPassword(address).catch(() => {});

      const created = await getPurelyMail().createAppPassword(address, APP_PASSWORD_NAME);
      const payload: CookiePayload = { m: address, u: ownerId, p: created };
      appendSetCookie(res, serializeCookie(name, encodeURIComponent(encrypt(JSON.stringify(payload))), COOKIE_MAX_AGE));
      current = created;
      return created;
    },
    async invalidate() {
      clear();
    },
    async revoke() {
      const password = current ?? fromCookie();
      if (password) {
        await getPurelyMail().deleteAppPassword(address, password).catch(() => {});
      }
      clear();
    },
  };
  return { address, credentials: store };
}

// On sign-out: delete every private app password this browser holds.
export async function revokePrivateCookies(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const api = getPurelyMail();
  await Promise.all(
    Object.entries(req.cookies)
      .filter(([name]) => name.startsWith(COOKIE_PREFIX))
      .map(async ([name, value]) => {
        const payload = readPayload(value);
        if (payload) await api.deleteAppPassword(payload.m, payload.p).catch(() => {});
        appendSetCookie(res, serializeCookie(name, '', 0));
      })
  );
}
