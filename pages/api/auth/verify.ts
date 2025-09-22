import { NextApiRequest, NextApiResponse } from 'next';
import { jwtVerify } from 'jose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.cookies['auth-token'];

    if (!token) {
      return res.status(401).json({ authenticated: false });
    }

    // Verify JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');
    
    try {
      const { payload } = await jwtVerify(token, secret);
      
      if (payload.authenticated) {
        return res.status(200).json({ authenticated: true, user: payload.user });
      } else {
        return res.status(401).json({ authenticated: false });
      }
    } catch (jwtError) {
      // Token is invalid or expired
      return res.status(401).json({ authenticated: false });
    }

  } catch (error) {
    console.error('Verify error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}