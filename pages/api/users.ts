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
        const users = await api.listUsers();
        return res.status(200).json(users);
      
      case 'POST':
        await api.createUser(req.body);
        return res.status(200).json({ success: true });
      
      case 'PUT':
        await api.modifyUser(req.body);
        return res.status(200).json({ success: true });
      
      case 'PATCH':
        const { userName: currentUserName, newUserName, password, ...userSettings } = req.body;
        
        // Use the modifyUser API which can handle username changes directly
        const updateData: any = { 
          userName: currentUserName, 
          ...userSettings 
        };
        
        if (newUserName && newUserName !== currentUserName) {
          updateData.newUserName = newUserName;
        }
        
        if (password) {
          updateData.password = password;
        }
        
        await api.modifyUser(updateData);
        return res.status(200).json({ success: true });
      
      case 'DELETE':
        const { userName: deleteUserName } = req.body;
        await api.deleteUser(deleteUserName);
        return res.status(200).json({ success: true });
      
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Users API error:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message 
    });
  }
}