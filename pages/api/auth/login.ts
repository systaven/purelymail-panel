import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Get admin password from environment
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Compare password with admin password
    // In production, this should be hashed, but for simplicity we'll use plain text comparison
    const isValid = password === adminPassword;

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Create JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');
    const token = await new SignJWT({ user: 'admin', authenticated: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    // Set secure HTTP-only cookie
    res.setHeader('Set-Cookie', [
      `auth-token=${token}; HttpOnly; Path=/; Max-Age=${24 * 60 * 60}; SameSite=Strict${
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