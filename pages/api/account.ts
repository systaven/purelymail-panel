import { NextApiRequest, NextApiResponse } from 'next';
import { PurelyMailAPI } from '@/lib/purelymail';

const apiKey = process.env.PURELYMAIL_API_KEY;

if (!apiKey) {
  console.error('PURELYMAIL_API_KEY environment variable is not set');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const api = new PurelyMailAPI({ apiKey });

  try {
    switch (req.method) {
      case 'GET':
        const accountCredit = await api.checkAccountCredit();
        return res.status(200).json(accountCredit);
      
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Account API error:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message 
    });
  }
}