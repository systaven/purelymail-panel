import { NextApiRequest, NextApiResponse } from 'next';
import { clerkEnabled } from '@/lib/auth';
import { getSession } from '@/lib/session';

// Tells the browser who is signed in and how. Public, so the login page can call it.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ authenticated: false, clerkEnabled: clerkEnabled() });
    }
    return res.status(200).json({
      authenticated: true,
      clerkEnabled: clerkEnabled(),
      role: session.role,
      via: session.via,
      disabled: session.disabled,
      user: session.via === 'password' ? 'admin' : session.user?.email || session.user?.name || null,
      // For the password admin: which Clerk account (if any) is signed in and whether it's linked.
      clerk: session.clerkUserId
        ? { email: session.user?.email ?? null, linkedAdmin: session.user?.role === 'admin' }
        : null,
    });
  } catch (error) {
    console.error('Verify error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
