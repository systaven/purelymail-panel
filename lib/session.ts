import type { NextApiRequest } from 'next';
import { AUTH_COOKIE, clerkEnabled, verifyAuthToken } from './auth';
import { getUser, insertUser, PanelUser, updateUser } from './accounts';

// Who is making a request. Two ways in:
// - the admin password (JWT cookie): always an admin
// - a Clerk session: a guest, or an admin if promoted/linked in panel_users
export interface Session {
  role: 'admin' | 'guest';
  via: 'password' | 'clerk';
  // Identifies the caller in the audit log: 'admin' or a Clerk user ID.
  actor: string;
  // The signed-in Clerk user, if any (also set for a password admin who is
  // signed in to Clerk at the same time, which is how linking works).
  clerkUserId: string | null;
  user: PanelUser | null;
  disabled: boolean;
}

const LAST_SEEN_INTERVAL_MS = 10 * 60 * 1000;

async function clerkUserId(req: NextApiRequest): Promise<string | null> {
  if (!clerkEnabled()) return null;
  const { getAuth } = await import('@clerk/nextjs/server');
  return getAuth(req).userId ?? null;
}

// Loads the panel_users row for a Clerk user, creating it on first sign-in.
export async function ensureUser(id: string): Promise<PanelUser> {
  const existing = await getUser(id);
  if (existing) {
    if (Date.now() - new Date(existing.last_seen_at).getTime() > LAST_SEEN_INTERVAL_MS) {
      await updateUser(id, { last_seen_at: new Date().toISOString() }).catch(() => {});
    }
    return existing;
  }
  const { clerkClient } = await import('@clerk/nextjs/server');
  const profile = await (await clerkClient()).users.getUser(id);
  const email = profile.primaryEmailAddress?.emailAddress ?? profile.emailAddresses[0]?.emailAddress ?? null;
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username || null;
  return insertUser({ clerk_user_id: id, email, name });
}

export async function getSession(req: NextApiRequest): Promise<Session | null> {
  const adminToken = await verifyAuthToken(req.cookies[AUTH_COOKIE]);
  const clerkId = await clerkUserId(req);

  if (adminToken) {
    return {
      role: 'admin',
      via: 'password',
      actor: 'admin',
      clerkUserId: clerkId,
      user: clerkId ? await ensureUser(clerkId) : null,
      disabled: false,
    };
  }

  if (clerkId) {
    const user = await ensureUser(clerkId);
    return {
      role: user.role,
      via: 'clerk',
      actor: clerkId,
      clerkUserId: clerkId,
      user,
      disabled: user.disabled,
    };
  }

  return null;
}
