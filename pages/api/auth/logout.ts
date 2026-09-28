import { NextApiRequest, NextApiResponse } from 'next';
import { AUTH_COOKIE } from '@/lib/auth';
import { appendSetCookie, revokePrivateCookies } from '@/lib/mail/handle';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Private mailboxes' webmail passwords end with the session.
    await revokePrivateCookies(req, res).catch((err) => console.warn('Revoking private credentials failed:', err.message));

    // Clear the authentication cookie
    appendSetCookie(res, `${AUTH_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`);

    return res.status(200).json({ 
      success: true, 
      message: 'Logout successful' 
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}