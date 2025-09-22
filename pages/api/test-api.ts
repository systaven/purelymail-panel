import { NextApiRequest, NextApiResponse } from 'next';

const apiKey = process.env.PURELYMAIL_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test official API endpoints
    const testEndpoints = [
      'https://purelymail.com/api/v0/listDomains',
      'https://purelymail.com/api/v0/checkAccountCredit', 
      'https://purelymail.com/api/v0/listRoutingRules',
      'https://purelymail.com/api/v0/listUser',
      'https://purelymail.com/api/v0/getOwnershipCode',
    ];

    // Test more endpoint possibilities
    const additionalEndpoints = [
      'https://purelymail.com/api/v0/listMailboxes',
      'https://purelymail.com/api/v0/listAccounts', 
      'https://purelymail.com/api/v0/getUsers',
      'https://purelymail.com/api/v0/listIdentities',
    ];

    // Test domain-specific endpoints  
    const domainSpecificEndpoints = [
      { endpoint: 'https://purelymail.com/api/v0/listAddresses', body: { domainName: 'bing-bong.uk' } },
      { endpoint: 'https://purelymail.com/api/v0/getDomainInfo', body: { domainName: 'bing-bong.uk' } },
      { endpoint: 'https://purelymail.com/api/v0/listAliases', body: { domainName: 'bing-bong.uk' } },
    ];

    const testResults = [];

    // Test basic endpoints
    for (const endpoint of [...testEndpoints, ...additionalEndpoints]) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Purelymail-Api-Token': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        testResults.push({
          endpoint,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: response.status === 200 ? await response.json() : await response.text(),
        });
      } catch (error) {
        testResults.push({
          endpoint,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Test domain-specific endpoints
    for (const { endpoint, body } of domainSpecificEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Purelymail-Api-Token': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        testResults.push({
          endpoint: `${endpoint} (with domain)`,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: response.status === 200 ? await response.json() : await response.text(),
        });
      } catch (error) {
        testResults.push({
          endpoint: `${endpoint} (with domain)`,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return res.status(200).json({
      message: 'API endpoint tests completed',
      results: testResults,
    });
  } catch (error: any) {
    console.error('Test API error:', error);
    return res.status(500).json({ 
      error: 'Failed to test API endpoints',
      details: error.message 
    });
  }
}