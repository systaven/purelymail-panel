import { useState, useEffect } from 'react';
import { AccountCredit } from '@/lib/purelymail';

export default function AccountSettings() {
  const [accountCredit, setAccountCredit] = useState<AccountCredit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: string): string => {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
  };

  useEffect(() => {
    fetchAccountCredit();
  }, []);

  const fetchAccountCredit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/account');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch account credit');
      }

      const data: AccountCredit = await response.json();
      setAccountCredit(data);
    } catch (err) {
      console.error('Failed to fetch account credit:', err);
      setError(err instanceof Error ? err.message : 'Failed to load account credit');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
        <div className="card">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p className="mt-2 text-gray-600">
          View your account credit and API configuration
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {/* Account Credit */}
      {accountCredit && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Account Credit</h3>
          
          <div className="bg-green-50 p-4 rounded-md">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-green-800">Available Credit</h4>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(accountCredit.credit)}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <button
              onClick={fetchAccountCredit}
              className="btn-secondary"
            >
              Refresh Credit
            </button>
          </div>
        </div>
      )}

      {/* API Configuration */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">API Configuration</h3>
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-600 mb-2">
            This application uses the PurelyMail API to manage your email services.
            Your API key is securely stored as an environment variable.
          </p>
          <p className="text-sm text-gray-500">
            To update your API key, modify the <code className="bg-gray-200 px-1 rounded">PURELYMAIL_API_KEY</code> environment variable.
          </p>
        </div>
      </div>

      {/* API Endpoints Information */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">API Endpoints</h3>
        <div className="bg-blue-50 p-4 rounded-md">
          <p className="text-sm text-blue-800 mb-2">
            This management panel uses the official PurelyMail API v0 endpoints:
          </p>
          <ul className="text-xs text-blue-700 space-y-1 ml-4">
            <li>• User Management: listUser, getUser, createUser, modifyUser, deleteUser</li>
            <li>• Domain Management: listDomains, addDomain, deleteDomain, updateDomainSettings</li>
            <li>• Routing Rules: listRoutingRules, createRoutingRule, deleteRoutingRule</li>
            <li>• Account: checkAccountCredit</li>
          </ul>
        </div>
      </div>
    </div>
  );
}