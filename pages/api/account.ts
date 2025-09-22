import { NextApiRequest, NextApiResponse } from 'next';
import { PurelyMailAPI } from '@/lib/purelymail';

const apiKey = process.env.PURELYMAIL_API_KEY;

// Mock data for development/testing
const mockAccountCredit = {
  credit: '25.00',
};

if (!apiKey) {
  console.error('PURELYMAIL_API_KEY environment variable is not set');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  // For development, use mock data if API calls fail
  const useMockData = process.env.NODE_ENV === 'development';
  const api = new PurelyMailAPI({ apiKey });

  try {
    switch (req.method) {
      case 'GET':
        try {
          const accountCredit = await api.checkAccountCredit();
          return res.status(200).json(accountCredit);
        } catch (apiError) {
          if (useMockData) {
            console.warn('API call failed, using mock data:', apiError);
            return res.status(200).json(mockAccountCredit);
          }
          throw apiError;
        }
      
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