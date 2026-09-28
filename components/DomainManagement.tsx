import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  PlusIcon, 
  TrashIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { Domain } from '@/lib/purelymail';
import { apiFetch } from '@/lib/client-api';
import { useT } from '@/lib/i18n';
import { commonMessages } from '@/lib/i18n/messages/common';
import { domainMessages } from '@/lib/i18n/messages/domains';
import { useErrorText } from '@/lib/i18n/useErrorText';

interface DomainFormData {
  domainName: string;
}

interface DomainListProps {
  onRefresh: () => void;
}

function AddDomainForm({ onSuccess }: { onSuccess: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DomainFormData>();
  const [error, setError] = useState<string | null>(null);
  const t = useT(domainMessages);
  const errorText = useErrorText();

  const onSubmit = async (data: DomainFormData) => {
    try {
      setError(null);
      await apiFetch('/api/domains', 'POST', data);

      reset();
      onSuccess();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{t('addTitle')}</h3>
      
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <label htmlFor="domainName" className="form-label">
            {t('domainName')}
          </label>
          <input
            type="text"
            id="domainName"
            placeholder="example.com"
            className="form-input"
            {...register('domainName', {
              required: t('domainRequired'),
              pattern: {
                value: /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/,
                message: t('domainInvalid'),
              },
            })}
          />
          {errors.domainName && (
            <p className="mt-1 text-sm text-red-600">{errors.domainName.message}</p>
          )}
        </div>
        
        <div className="flex items-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            {isSubmitting ? t('adding') : t('addDomain')}
          </button>
        </div>
      </div>
    </form>
  );
}

function DomainCard({ domain, onDelete }: { domain: Domain; onDelete: (name: string) => void }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const t = useT(domainMessages);
  const tc = useT(commonMessages);

  const handleDelete = async () => {
    if (!confirm(t('confirmDelete', { name: domain.name }))) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(domain.name);
    } finally {
      setIsDeleting(false);
    }
  };

  const getDnsStatus = (passes: boolean) => {
    return passes ? {
      icon: CheckCircleIcon,
      text: t('dnsConfiguredBadge'),
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    } : {
      icon: XCircleIcon,
      text: t('dnsMissingBadge'),
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    };
  };

  const overallStatus = domain.dnsSummary?.passesMx ? 'verified' : 'pending';

  return (
    <div className="card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="flex items-center gap-2">
              <GlobeAltIcon className="h-5 w-5 text-gray-400" />
              <h3 className="break-all text-lg font-medium text-gray-900">{domain.name}</h3>
            </div>
            
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              overallStatus === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {overallStatus === 'verified' ? (
                <>
                  <CheckCircleIcon className="h-3 w-3" />
                  {t('verified')}
                </>
              ) : (
                <>
                  <ClockIcon className="h-3 w-3" />
                  {t('pendingSetup')}
                </>
              )}
            </span>

            {domain.isShared && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <ShieldCheckIcon className="h-3 w-3" />
                {t('sharedDomain')}
              </span>
            )}
          </div>

          {/* Domain Settings Row */}
          <div className="flex flex-wrap gap-2 mb-3">
            {domain.allowAccountReset && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {t('accountResetEnabled')}
              </span>
            )}
            {domain.symbolicSubaddressing && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {t('symbolicSubaddressing')}
              </span>
            )}
          </div>

          {/* DNS Status Grid */}
          {domain.dnsSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="text-center">
                <div className="text-xs font-medium text-gray-500 mb-1">{t('mxRecord')}</div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDnsStatus(domain.dnsSummary.passesMx).bgColor} ${getDnsStatus(domain.dnsSummary.passesMx).color}`}>
                  {getDnsStatus(domain.dnsSummary.passesMx).text}
                </span>
              </div>
              
              <div className="text-center">
                <div className="text-xs font-medium text-gray-500 mb-1">{t('spfRecord')}</div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDnsStatus(domain.dnsSummary.passesSpf).bgColor} ${getDnsStatus(domain.dnsSummary.passesSpf).color}`}>
                  {getDnsStatus(domain.dnsSummary.passesSpf).text}
                </span>
              </div>
              
              <div className="text-center">
                <div className="text-xs font-medium text-gray-500 mb-1">{t('dkimRecord')}</div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDnsStatus(domain.dnsSummary.passesDkim).bgColor} ${getDnsStatus(domain.dnsSummary.passesDkim).color}`}>
                  {getDnsStatus(domain.dnsSummary.passesDkim).text}
                </span>
              </div>
              
              <div className="text-center">
                <div className="text-xs font-medium text-gray-500 mb-1">{t('dmarcRecord')}</div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDnsStatus(domain.dnsSummary.passesDmarc).bgColor} ${getDnsStatus(domain.dnsSummary.passesDmarc).color}`}>
                  {getDnsStatus(domain.dnsSummary.passesDmarc).text}
                </span>
              </div>
            </div>
          )}

          {/* Legacy Info */}
          <div className="text-sm text-gray-600">
            <p>{t('counts', { users: domain.users?.length || 0, aliases: domain.aliases?.length || 0 })}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-4 sm:shrink-0">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <Cog6ToothIcon className="h-4 w-4" />
            {showDetails ? t('hide') : t('details')}
          </button>
          
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn-danger text-sm flex items-center gap-2"
          >
            <TrashIcon className="h-4 w-4" />
            {isDeleting ? tc('deleting') : tc('delete')}
          </button>
        </div>
      </div>

      {/* Detailed Information Panel */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">{t('configuration')}</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">{t('domainType')}</span>
                <span className="ml-2 text-gray-600">
                  {domain.isShared ? t('typeShared') : t('typePrivate')}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">{t('accountReset')}</span>
                <span className="ml-2 text-gray-600">
                  {domain.allowAccountReset ? t('enabled') : t('disabled')}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">{t('symbolicSubaddressingLabel')}</span>
                <span className="ml-2 text-gray-600">
                  {domain.symbolicSubaddressing ? t('enabled') : t('disabled')}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">{t('overallStatus')}</span>
                <span className="ml-2 text-gray-600">
                  {overallStatus === 'verified' ? t('fullyConfigured') : t('needsDns')}
                </span>
              </div>
            </div>

            {domain.dnsSummary && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">{t('dnsStatus')}</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{t('mxLong')}</span>
                    <span className={domain.dnsSummary.passesMx ? 'text-green-600' : 'text-red-600'}>
                      {domain.dnsSummary.passesMx ? t('configured') : t('missing')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('spfLong')}</span>
                    <span className={domain.dnsSummary.passesSpf ? 'text-green-600' : 'text-red-600'}>
                      {domain.dnsSummary.passesSpf ? t('configured') : t('missing')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('dkimLong')}</span>
                    <span className={domain.dnsSummary.passesDkim ? 'text-green-600' : 'text-red-600'}>
                      {domain.dnsSummary.passesDkim ? t('configured') : t('missing')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('dmarcLong')}</span>
                    <span className={domain.dnsSummary.passesDmarc ? 'text-green-600' : 'text-red-600'}>
                      {domain.dnsSummary.passesDmarc ? t('configured') : t('missing')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DomainManagement() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useT(domainMessages);
  const tc = useT(commonMessages);
  const errorText = useErrorText();

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await apiFetch<Domain[]>('/api/domains');
      setDomains(data);
    } catch (err) {
      console.error('Failed to fetch domains:', err);
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDomain = async (domainName: string) => {
    try {
      await apiFetch('/api/domains', 'DELETE', { domainName });

      await fetchDomains(); // Refresh the list
    } catch (err) {
      alert(errorText(err));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-red-700">{error}</div>
        <button
          onClick={fetchDomains}
          className="mt-2 btn-primary"
        >
          {tc('retry')}
        </button>
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

      <AddDomainForm onSuccess={fetchDomains} />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {t('yourDomains', { count: domains.length })}
        </h2>
        
        {domains.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-gray-500">
              <p className="text-lg">{t('empty')}</p>
              <p className="text-sm mt-1">{t('emptyHint')}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {domains.map((domain) => (
              <DomainCard
                key={domain.name}
                domain={domain}
                onDelete={handleDeleteDomain}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}