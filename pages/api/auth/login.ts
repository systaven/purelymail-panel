import { NextApiRequest, NextApiResponse } from 'next';
import { SignJWT } from 'jose';
import { AUTH_COOKIE, getJwtSecret } from '@/lib/auth';
import { verifyAdminPassword } from '@/lib/password';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password } = req.body;

    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Get admin password from environment
    const adminPassword = process.env.ADMIN_PASSWORD;
    const secret = getJwtSecret();
    if (!adminPassword || !secret) {
      console.error('ADMIN_PASSWORD and JWT_SECRET environment variables must be set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const isValid = await verifyAdminPassword(password, adminPassword);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Create JWT token
    const token = await new SignJWT({ user: 'admin', authenticated: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    // Set secure HTTP-only cookie
    res.setHeader('Set-Cookie', [
      `${AUTH_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${24 * 60 * 60}; SameSite=Strict${
        process.env.NODE_ENV === 'production' ? '; Secure' : ''
      }`
    ]);

    return res.status(200).json({ 
      success: true, 
      message: 'Authentication successful' 
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}