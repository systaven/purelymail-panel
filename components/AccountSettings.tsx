import { useState, useEffect } from 'react';
import { AccountCredit } from '@/lib/purelymail';
import { apiFetch } from '@/lib/client-api';
import { useLocale, useT } from '@/lib/i18n';
import { useErrorText } from '@/lib/i18n/useErrorText';
import { settingsMessages } from '@/lib/i18n/messages/dashboard';

export default function AccountSettings() {
  const t = useT(settingsMessages);
  const errorText = useErrorText();
  const { locale } = useLocale();
  const [accountCredit, setAccountCredit] = useState<AccountCredit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: string): string => {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat(locale, {
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
      
      const data = await apiFetch<AccountCredit>('/api/account');
      setAccountCredit(data);
    } catch (err) {
      console.error('Failed to fetch account credit:', err);
      setError(err instanceof Error ? errorText(err) : t('loadFailed'));
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
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-2 text-gray-600">
          {t('subtitle')}
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('accountCredit')}</h3>
          
          <div className="bg-green-50 p-4 rounded-md">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-green-800">{t('availableCredit')}</h4>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(accountCredit.credit)}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <button
              onClick={fetchAccountCredit}
              className="btn-secondary"
            >
              {t('refreshCredit')}
            </button>
          </div>
        </div>
      )}

      {/* API Configuration */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('apiConfig')}</h3>
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-600 mb-2">
            {t('apiConfigDesc')}
          </p>
          <p className="text-sm text-gray-500">
            {t('apiKeyBefore')}<code className="bg-gray-200 px-1 rounded">PURELYMAIL_API_KEY</code>{t('apiKeyAfter')}
          </p>
        </div>
      </div>

      {/* API Endpoints Information */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('apiEndpoints')}</h3>
        <div className="bg-blue-50 p-4 rounded-md">
          <p className="text-sm text-blue-800 mb-2">
            {t('apiEndpointsDesc')}
          </p>
          <ul className="text-xs text-blue-700 space-y-1 ml-4">
            <li>• {t('endpointUsers')}listUser, getUser, createUser, modifyUser, deleteUser</li>
            <li>• {t('endpointDomains')}listDomains, addDomain, deleteDomain, updateDomainSettings</li>
            <li>• {t('endpointRules')}listRoutingRules, createRoutingRule, deleteRoutingRule</li>
            <li>• {t('endpointAccount')}checkAccountCredit</li>
          </ul>
        </div>
      </div>
    </div>
  );
}