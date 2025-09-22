import { NextApiRequest, NextApiResponse } from 'next';
import { PurelyMailAPI } from '@/lib/purelymail';

const apiKey = process.env.PURELYMAIL_API_KEY;

// Mock data for development/testing
const mockRoutingRules = [
  {
    id: 'rule1',
    prefix: 'support',
    domainName: 'example.com',
    targetAddresses: ['support@company.com', 'help@company.com'],
    enabled: true,
  },
  {
    id: 'rule2',
    prefix: 'info',
    domainName: 'example.com',
    targetAddresses: ['info@company.com'],
    enabled: true,
  },
  {
    id: 'rule3',
    prefix: 'sales',
    domainName: 'test.com',
    targetAddresses: ['sales@company.com'],
    enabled: false,
  },
];

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
          const rules = await api.listRoutingRules();
          return res.status(200).json(rules);
        } catch (apiError) {
          if (useMockData) {
            console.warn('API call failed, using mock data:', apiError);
            return res.status(200).json(mockRoutingRules);
          }
          throw apiError;
        }
      
      case 'POST':
        try {
          await api.addRoutingRule(req.body);
          return res.status(200).json({ success: true });
        } catch (apiError) {
          if (useMockData) {
            console.warn('API call failed, simulating success:', apiError);
            return res.status(200).json({ success: true });
          }
          throw apiError;
        }
      
      case 'PUT':
        try {
          await api.modifyRoutingRule(req.body);
          return res.status(200).json({ success: true });
        } catch (apiError) {
          if (useMockData) {
            console.warn('API call failed, simulating success:', apiError);
            return res.status(200).json({ success: true });
          }
          throw apiError;
        }
      
      case 'DELETE':
        const { id } = req.body;
        try {
          await api.deleteRoutingRule(id);
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
    console.error('Routing rules API error:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message 
    });
  }
}