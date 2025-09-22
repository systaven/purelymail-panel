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

interface DomainFormData {
  domainName: string;
}

interface DomainListProps {
  onRefresh: () => void;
}

function AddDomainForm({ onSuccess }: { onSuccess: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DomainFormData>();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: DomainFormData) => {
    try {
      setError(null);
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add domain');
      }

      reset();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add domain');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Domain</h3>
      
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="domainName" className="form-label">
            Domain Name
          </label>
          <input
            type="text"
            id="domainName"
            placeholder="example.com"
            className="form-input"
            {...register('domainName', {
              required: 'Domain name is required',
              pattern: {
                value: /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/,
                message: 'Please enter a valid domain name',
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
            {isSubmitting ? 'Adding...' : 'Add Domain'}
          </button>
        </div>
      </div>
    </form>
  );
}

function DomainCard({ domain, onDelete }: { domain: Domain; onDelete: (name: string) => void }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${domain.name}?`)) {
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
      text: '✓ Configured',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    } : {
      icon: XCircleIcon,
      text: '✗ Missing',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    };
  };

  const overallStatus = domain.dnsSummary?.passesMx ? 'verified' : 'pending';

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <GlobeAltIcon className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900">{domain.name}</h3>
            </div>
            
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              overallStatus === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {overallStatus === 'verified' ? (
                <>
                  <CheckCircleIcon className="h-3 w-3" />
                  Verified
                </>
              ) : (
                <>
                  <ClockIcon className="h-3 w-3" />
                  Pending Setup
                </>
              )}
            </span>

            {domain.isShared && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <ShieldCheckIcon className="h-3 w-3" />
                Shared Domain
              </span>
            )}
          </div>

          {/* Domain Settings Row */}
          <div className="flex flex-wrap gap-2 mb-3">
            {domain.allowAccountReset && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Account Reset Enabled
              </span>
            )}
            {domain.symbolicSubaddressing && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                Symbolic Subaddressing
              </span>
            )}
          </div>

          {/* DNS Status Grid */}
          {domain.dnsSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="text-center">
                <div className="text-xs font-medium text-gray-500 mb-1">MX Record</div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDnsStatus(domain.dnsSummary.passesMx).bgColor} ${getDnsStatus(domain.dnsSummary.passesMx).color}`}>
                  {getDnsStatus(domain.dnsSummary.passesMx).text}
                </span>
              </div>
              
              <div className="text-center">
                <div className="text-xs font-medium text-gray-500 mb-1">SPF Record</div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDnsStatus(domain.dnsSummary.passesSpf).bgColor} ${getDnsStatus(domain.dnsSummary.passesSpf).color}`}>
                  {getDnsStatus(domain.dnsSummary.passesSpf).text}
                </span>
              </div>
              
              <div className="text-center">
                <div className="text-xs font-medium text-gray-500 mb-1">DKIM Record</div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDnsStatus(domain.dnsSummary.passesDkim).bgColor} ${getDnsStatus(domain.dnsSummary.passesDkim).color}`}>
                  {getDnsStatus(domain.dnsSummary.passesDkim).text}
                </span>
              </div>
              
              <div className="text-center">
                <div className="text-xs font-medium text-gray-500 mb-1">DMARC Record</div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDnsStatus(domain.dnsSummary.passesDmarc).bgColor} ${getDnsStatus(domain.dnsSummary.passesDmarc).color}`}>
                  {getDnsStatus(domain.dnsSummary.passesDmarc).text}
                </span>
              </div>
            </div>
          )}

          {/* Legacy Info */}
          <div className="text-sm text-gray-600">
            <p>Users: {domain.users?.length || 0} • Aliases: {domain.aliases?.length || 0}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <Cog6ToothIcon className="h-4 w-4" />
            {showDetails ? 'Hide' : 'Details'}
          </button>
          
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn-danger text-sm flex items-center gap-2"
          >
            <TrashIcon className="h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Detailed Information Panel */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Domain Configuration</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Domain Type:</span>
                <span className="ml-2 text-gray-600">
                  {domain.isShared ? 'Shared (PurelyMail)' : 'Private'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Account Reset:</span>
                <span className="ml-2 text-gray-600">
                  {domain.allowAccountReset ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Symbolic Subaddressing:</span>
                <span className="ml-2 text-gray-600">
                  {domain.symbolicSubaddressing ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Overall Status:</span>
                <span className="ml-2 text-gray-600">
                  {overallStatus === 'verified' ? 'Fully Configured' : 'Needs DNS Setup'}
                </span>
              </div>
            </div>

            {domain.dnsSummary && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">DNS Records Status</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>MX (Mail Exchange):</span>
                    <span className={domain.dnsSummary.passesMx ? 'text-green-600' : 'text-red-600'}>
                      {domain.dnsSummary.passesMx ? 'Configured' : 'Missing/Incorrect'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>SPF (Sender Policy Framework):</span>
                    <span className={domain.dnsSummary.passesSpf ? 'text-green-600' : 'text-red-600'}>
                      {domain.dnsSummary.passesSpf ? 'Configured' : 'Missing/Incorrect'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>DKIM (DomainKeys):</span>
                    <span className={domain.dnsSummary.passesDkim ? 'text-green-600' : 'text-red-600'}>
                      {domain.dnsSummary.passesDkim ? 'Configured' : 'Missing/Incorrect'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>DMARC (Domain-based Message Authentication):</span>
                    <span className={domain.dnsSummary.passesDmarc ? 'text-green-600' : 'text-red-600'}>
                      {domain.dnsSummary.passesDmarc ? 'Configured' : 'Missing/Incorrect'}
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

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/domains');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch domains');
      }

      const data = await response.json();
      setDomains(data);
    } catch (err) {
      console.error('Failed to fetch domains:', err);
      setError(err instanceof Error ? err.message : 'Failed to load domains');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDomain = async (domainName: string) => {
    try {
      const response = await fetch('/api/domains', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete domain');
      }

      await fetchDomains(); // Refresh the list
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete domain');
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
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Domain Management</h1>
        <p className="mt-2 text-gray-600">
          Manage your email domains and their settings
        </p>
      </div>

      <AddDomainForm onSuccess={fetchDomains} />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Your Domains ({domains.length})
        </h2>
        
        {domains.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-gray-500">
              <p className="text-lg">No domains configured yet</p>
              <p className="text-sm mt-1">Add your first domain to get started</p>
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