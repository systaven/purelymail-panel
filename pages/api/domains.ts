import { NextApiRequest, NextApiResponse } from 'next';
import { PurelyMailAPI } from '@/lib/purelymail';

const apiKey = process.env.PURELYMAIL_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const api = new PurelyMailAPI({ apiKey });

    switch (req.method) {
      case 'GET':
        const domains = await api.listDomains();
        return res.status(200).json(domains);
      
      case 'POST':
        const { domainName } = req.body;
        await api.addDomain(domainName);
        return res.status(200).json({ success: true });
      
      case 'DELETE':
        const { domainName: deleteDomain } = req.body;
        await api.deleteDomain(deleteDomain);
        return res.status(200).json({ success: true });
      
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