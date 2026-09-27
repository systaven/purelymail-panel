import { NextApiRequest, NextApiResponse } from 'next';
import { AUTH_COOKIE, verifyAuthToken } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = await verifyAuthToken(req.cookies[AUTH_COOKIE]);

    if (payload) {
      return res.status(200).json({ authenticated: true, user: payload.user });
    }
    return res.status(401).json({ authenticated: false });

  } catch (error) {
    console.error('Verify error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}