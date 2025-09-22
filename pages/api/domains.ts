import { NextApiRequest, NextApiResponse } from 'next';
import { PurelyMailAPI } from '@/lib/purelymail';

const apiKey = process.env.PURELYMAIL_API_KEY;

// Mock data for development/testing
const mockDomains = [
  {
    name: 'example.com',
    ownershipVerified: true,
    dkimEnabled: true,
    aliases: ['admin@example.com', 'contact@example.com'],
    users: ['user1@example.com', 'user2@example.com'],
  },
  {
    name: 'test.com',
    ownershipVerified: false,
    dkimEnabled: false,
    aliases: [],
    users: ['test@test.com'],
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  // For development, use mock data if API calls fail
  const useMockData = process.env.NODE_ENV === 'development';

  try {
    const api = new PurelyMailAPI({ apiKey });

    switch (req.method) {
      case 'GET':
        try {
          const domains = await api.listDomains();
          return res.status(200).json(domains);
        } catch (apiError) {
          if (useMockData) {
            console.warn('API call failed, using mock data:', apiError);
            return res.status(200).json(mockDomains);
          }
          throw apiError;
        }
      
      case 'POST':
        const { domainName } = req.body;
        try {
          await api.addDomain(domainName);
          return res.status(200).json({ success: true });
        } catch (apiError) {
          if (useMockData) {
            console.warn('API call failed, simulating success:', apiError);
            return res.status(200).json({ success: true });
          }
          throw apiError;
        }
      
      case 'DELETE':
        const { domainName: deleteDomain } = req.body;
        try {
          await api.deleteDomain(deleteDomain);
          return res.status(200).json({ success: true });
        } catch (apiError) {
          if (useMockData) {
            console.warn('API call failed, simulating success:', apiError);
            return res.status(200).json({ success: true });
          }
          throw apiError;
        }
      
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Domains API error:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message 
    });
  }
}