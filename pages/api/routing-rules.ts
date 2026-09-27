import { NextApiRequest, NextApiResponse } from 'next';
import { PurelyMailAPI } from '@/lib/purelymail';

const apiKey = process.env.PURELYMAIL_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const api = new PurelyMailAPI({ apiKey });

  try {
    switch (req.method) {
      case 'GET':
        const rules = await api.listRoutingRules();
        return res.status(200).json(rules);
      
      case 'POST':
        await api.addRoutingRule(req.body);
        return res.status(200).json({ success: true });
      
      case 'PUT':
        await api.modifyRoutingRule(req.body);
        return res.status(200).json({ success: true });
      
      case 'DELETE':
        const { id } = req.body;
        await api.deleteRoutingRule(id);
        return res.status(200).json({ success: true });
      
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