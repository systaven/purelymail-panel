import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const apiKey = process.env.PURELYMAIL_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const client = axios.create({
    baseURL: 'https://purelymail.com/api/v0',
    headers: {
      'Purelymail-Api-Token': apiKey,
      'Content-Type': 'application/json',
    },
  });

  const testEndpoints = [
    // User-related endpoints
    '/listUsers',
    '/getUsers', 
    '/listAddresses',
    '/getAddresses',
    '/listMailboxes',
    '/getMailboxes',
    '/listAccounts',
    '/getAccounts',
    
    // Domain-specific user endpoints
    '/getDomainUsers',
    '/listDomainUsers',
    '/getDomainAddresses',
    '/listDomainAddresses',
    
    // With domain parameter
    { endpoint: '/listUsers', body: { domainName: 'bing-bong.uk' } },
    { endpoint: '/getUsers', body: { domainName: 'bing-bong.uk' } },
    { endpoint: '/listAddresses', body: { domainName: 'bing-bong.uk' } },
    { endpoint: '/getAddresses', body: { domainName: 'bing-bong.uk' } },
    
    // Alternative approaches
    '/getDomainInfo',
    { endpoint: '/getDomainInfo', body: { domainName: 'bing-bong.uk' } },
    '/getDomainDetails',
    { endpoint: '/getDomainDetails', body: { domainName: 'bing-bong.uk' } },
  ];

  const results = [];

  for (const test of testEndpoints) {
    const endpoint = typeof test === 'string' ? test : test.endpoint;
    const body = typeof test === 'string' ? {} : test.body;
    
    try {
      console.log(`Testing ${endpoint} with body:`, body);
      const response = await client.post(endpoint, body);
      
      results.push({
        endpoint,
        body,
        status: response.status,
        success: true,
        data: response.data,
      });
      
      // If we get a successful response, log it
      if (response.data.type === 'success') {
        console.log(`SUCCESS: ${endpoint}`, JSON.stringify(response.data, null, 2));
      }
      
    } catch (error: any) {
      results.push({
        endpoint,
        body,
        status: error.response?.status || 'unknown',
        success: false,
        error: error.response?.data || error.message,
      });
    }
  }

  return res.status(200).json({ results });
}