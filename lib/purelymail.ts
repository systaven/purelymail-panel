import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface PurelyMailConfig {
  apiKey: string;
  baseURL?: string;
}

export interface Domain {
  name: string;
  allowAccountReset: boolean;
  symbolicSubaddressing: boolean;
  isShared: boolean;
  dnsSummary: {
    passesMx: boolean;
    passesSpf: boolean;
    passesDkim: boolean;
    passesDmarc: boolean;
  };
  // Legacy fields for compatibility
  ownershipVerified?: boolean;
  dkimEnabled?: boolean;
  aliases?: string[];
  users?: string[];
}

export interface RoutingRule {
  id: string;
  prefix: string;
  domainName: string;
  targetAddresses: string[];
  enabled: boolean;
}

export interface User {
  userName: string; // Full email address
  enableSearchIndexing: boolean;
  recoveryEnabled: boolean;
  requireTwoFactorAuthentication: boolean;
  enableSpamFiltering: boolean;
  resetMethods: any[];
}

export interface AccountCredit {
  credit: string; // BigDecimal string
}

// Like Promise.all(items.map(fn)), but runs at most `limit` calls at a time.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

export class PurelyMailAPI {
  private client: AxiosInstance;

  constructor(config: PurelyMailConfig) {
    this.client = axios.create({
      baseURL: config.baseURL || 'https://purelymail.com/api/v0',
      headers: {
        'Purelymail-Api-Token': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  // Account Management
  async checkAccountCredit(): Promise<AccountCredit> {
    const response = await this.client.post('/checkAccountCredit', {});
    if (response.data.type === 'success') {
      return response.data.result;
    }
    throw new Error(response.data.message || 'Failed to check account credit');
  }

  // Domain Management
  async listDomains(): Promise<Domain[]> {
    const response = await this.client.post('/listDomains', {});
    if (response.data.type === 'success') {
      return response.data.result.domains.map((domain: any) => ({
        ...domain,
        // Add legacy fields for backward compatibility
        ownershipVerified: domain.dnsSummary?.passesMx || false,
        dkimEnabled: domain.dnsSummary?.passesDkim || false,
        aliases: [], // Would need separate API call to get aliases
        users: [], // Would need separate API call to get users
      }));
    }
    throw new Error(response.data.message || 'Failed to list domains');
  }

  async addDomain(domainName: string): Promise<void> {
    const response = await this.client.post('/addDomain', { domainName });
    if (response.data.type !== 'success') {
      throw new Error(response.data.message || 'Failed to add domain');
    }
  }

  async deleteDomain(domainName: string): Promise<void> {
    const response = await this.client.post('/deleteDomain', { domainName });
    if (response.data.type !== 'success') {
      throw new Error(response.data.message || 'Failed to delete domain');
    }
  }

  async updateDomainSettings(domainName: string, settings: {
    allowAccountReset?: boolean;
    symbolicSubaddressing?: boolean;
  }): Promise<void> {
    const response = await this.client.post('/updateDomainSettings', { 
      name: domainName,
      ...settings 
    });
    if (response.data.type !== 'success') {
      throw new Error(response.data.message || 'Failed to update domain settings');
    }
  }

  async getOwnershipCode(): Promise<{ code: string }> {
    const response = await this.client.post('/getOwnershipCode', {});
    if (response.data.type === 'success') {
      return response.data.result;
    }
    throw new Error(response.data.message || 'Failed to get ownership code');
  }

  // Routing Rules Management
  async listRoutingRules(): Promise<RoutingRule[]> {
    const response = await this.client.post('/listRoutingRules', {});
    if (response.data.type === 'success') {
      return response.data.result.rules || [];
    }
    throw new Error(response.data.message || 'Failed to list routing rules');
  }

  async addRoutingRule(rule: Omit<RoutingRule, 'id'>): Promise<void> {
    const response = await this.client.post('/createRoutingRule', rule);
    if (response.data.type !== 'success') {
      throw new Error(response.data.message || 'Failed to add routing rule');
    }
  }

  async modifyRoutingRule(rule: RoutingRule): Promise<void> {
    const response = await this.client.post('/modifyRoutingRule', rule);
    if (response.data.type !== 'success') {
      throw new Error(response.data.message || 'Failed to modify routing rule');
    }
  }

  async deleteRoutingRule(ruleId: string): Promise<void> {
    const response = await this.client.post('/deleteRoutingRule', { id: ruleId });
    if (response.data.type !== 'success') {
      throw new Error(response.data.message || 'Failed to delete routing rule');
    }
  }

  // User Management
  async listUsers(): Promise<User[]> {
    const response = await this.client.post('/listUser', {});
    if (response.data.type === 'success') {
      const userNames = response.data.result.users || response.data.result || [];
      
      // listUser only returns names, so fetch details per user,
      // a few at a time to avoid flooding the PurelyMail API.
      const users = await mapWithConcurrency(userNames, 5, async (userName: string) => {
        try {
          const userDetails = await this.getUser(userName);
          return {
            ...userDetails,
            userName
          };
        } catch (error) {
          // If we can't get user details, return basic info
          return {
            userName,
            enableSearchIndexing: true,
            recoveryEnabled: false,
            requireTwoFactorAuthentication: false,
            enableSpamFiltering: true,
            resetMethods: []
          };
        }
      });

      return users;
    }
    throw new Error(response.data.message || 'Failed to list users');
  }

  async getUser(userName: string): Promise<User> {
    const response = await this.client.post('/getUser', { userName });
    if (response.data.type === 'success') {
      return response.data.result;
    }
    throw new Error(response.data.message || 'Failed to get user');
  }

  async createUser(userData: {
    userName: string; // Full email address
    password?: string;
    recoveryEnabled?: boolean;
    enableSearchIndexing?: boolean;
    enableSpamFiltering?: boolean;
    requireTwoFactorAuthentication?: boolean;
  }): Promise<void> {
    // Split email into local part and domain
    const emailParts = userData.userName.split('@');
    if (emailParts.length !== 2) {
      throw new Error('Invalid email format');
    }
    
    const [localPart, domain] = emailParts;
    
    const requestData = {
      userName: localPart,
      domainName: domain,
      password: userData.password,
      enablePasswordReset: userData.recoveryEnabled !== false,
      enableSearchIndexing: userData.enableSearchIndexing !== false,
      sendWelcomeEmail: false, // Don't send welcome emails by default
    };

    const response = await this.client.post('/createUser', requestData);
    if (response.data.type !== 'success') {
      throw new Error(response.data.message || 'Failed to create user');
    }
  }

  async modifyUser(userData: Partial<User> & { 
    userName: string;
    newUserName?: string;
    password?: string;
  }): Promise<void> {
    // Map our interface to the API's expected format
    const requestData: any = {
      userName: userData.userName,
    };

    if (userData.newUserName) {
      requestData.newUserName = userData.newUserName;
    }

    if (userData.password) {
      requestData.newPassword = userData.password;
    }

    if (userData.enableSearchIndexing !== undefined) {
      requestData.enableSearchIndexing = userData.enableSearchIndexing;
    }

    if (userData.recoveryEnabled !== undefined) {
      requestData.enablePasswordReset = userData.recoveryEnabled;
    }

    if (userData.requireTwoFactorAuthentication !== undefined) {
      requestData.requireTwoFactorAuthentication = userData.requireTwoFactorAuthentication;
    }

    const response = await this.client.post('/modifyUser', requestData);
    if (response.data.type !== 'success') {
      throw new Error(response.data.message || 'Failed to modify user');
    }
  }

  async deleteUser(userName: string): Promise<void> {
    const response = await this.client.post('/deleteUser', { userName });
    if (response.data.type !== 'success') {
      throw new Error(response.data.message || 'Failed to delete user');
    }
  }

  // Password Reset Methods
  async upsertPasswordReset(userName: string, method: {
    type: 'email' | 'phone';
    target: string;
  }): Promise<void> {
    const response = await this.client.post('/upsertPasswordReset', { 
      userName,
      ...method
    });
    if (response.data.type !== 'success') {
      throw new Error(response.data.message || 'Failed to upsert password reset method');
    }
  }

  async deletePasswordReset(userName: string, method: {
    type: 'email' | 'phone';
    target: string;
  }): Promise<void> {
    const response = await this.client.post('/deletePasswordReset', { 
      userName,
      ...method
    });
    if (response.data.type !== 'success') {
      throw new Error(response.data.message || 'Failed to delete password reset method');
    }
  }

  async listPasswordReset(userName: string): Promise<any[]> {
    const response = await this.client.post('/listPasswordReset', { userName });
    if (response.data.type === 'success') {
      return response.data.result.methods || [];
    }
    throw new Error(response.data.message || 'Failed to list password reset methods');
  }

  // App Password Methods
  async createAppPassword(userHandle: string, name: string = ''): Promise<string> {
    const response = await this.client.post('/createAppPassword', {
      userHandle,
      name
    });
    if (response.data.type === 'success') {
      return response.data.result.appPassword;
    }
    throw new Error(response.data.message || 'Failed to create app password');
  }

  async deleteAppPassword(userName: string, appPassword: string): Promise<void> {
    const response = await this.client.post('/deleteAppPassword', {
      userName,
      appPassword
    });
    if (response.data.type !== 'success') {
      throw new Error(response.data.message || 'Failed to delete app password');
    }
  }

  // Utility method for testing API connection
  async testConnection(): Promise<boolean> {
    try {
      await this.checkAccountCredit();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
let apiInstance: PurelyMailAPI | null = null;

export function initializeAPI(apiKey: string): PurelyMailAPI {
  apiInstance = new PurelyMailAPI({ apiKey });
  return apiInstance;
}

export function getAPI(): PurelyMailAPI {
  if (!apiInstance) {
    throw new Error('API not initialized. Call initializeAPI first.');
  }
  return apiInstance;
}