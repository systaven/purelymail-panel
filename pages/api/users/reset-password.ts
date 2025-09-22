import { NextApiRequest, NextApiResponse } from 'next';
import { PurelyMailAPI } from '@/lib/purelymail';

const apiKey = process.env.PURELYMAIL_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const api = new PurelyMailAPI({ apiKey });

  try {
    const { userName, method } = req.body;
    
    if (!userName || !method) {
      return res.status(400).json({ error: 'Missing required fields: userName and method' });
    }

    // Use the password reset methods from the official API
    await api.upsertPasswordReset(userName, method);
    return res.status(200).json({ success: true, message: 'Password reset method configured' });
  } catch (error: any) {
    console.error('Password reset API error:', error);
    return res.status(500).json({ 
      error: 'Failed to configure password reset',
      details: error.message 
    });
  }
}