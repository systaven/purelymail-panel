import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon,
  CheckIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { RoutingRule } from '@/lib/purelymail';

interface RoutingRuleFormData {
  prefix: string;
  domainName: string;
  targetAddresses: string;
  enabled: boolean;
}

function AddRoutingRuleForm({ onSuccess }: { onSuccess: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RoutingRuleFormData>();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: RoutingRuleFormData) => {
    try {
      setError(null);
      const payload = {
        ...data,
        targetAddresses: data.targetAddresses.split(',').map(addr => addr.trim()),
      };

      const response = await fetch('/api/routing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add routing rule');
      }

      reset();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add routing rule');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Routing Rule</h3>
      
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="prefix" className="form-label">
            Email Prefix
          </label>
          <input
            type="text"
            id="prefix"
            placeholder="support"
            className="form-input"
            {...register('prefix', {
              required: 'Email prefix is required',
            })}
          />
          {errors.prefix && (
            <p className="mt-1 text-sm text-red-600">{errors.prefix.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="domainName" className="form-label">
            Domain
          </label>
          <input
            type="text"
            id="domainName"
            placeholder="example.com"
            className="form-input"
            {...register('domainName', {
              required: 'Domain name is required',
            })}
          />
          {errors.domainName && (
            <p className="mt-1 text-sm text-red-600">{errors.domainName.message}</p>
          )}
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="targetAddresses" className="form-label">
          Target Addresses (comma-separated)
        </label>
        <input
          type="text"
          id="targetAddresses"
          placeholder="user1@domain.com, user2@domain.com"
          className="form-input"
          {...register('targetAddresses', {
            required: 'At least one target address is required',
          })}
        />
        {errors.targetAddresses && (
          <p className="mt-1 text-sm text-red-600">{errors.targetAddresses.message}</p>
        )}
      </div>

      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            {...register('enabled')}
            defaultChecked={true}
          />
          <span className="ml-2 text-sm text-gray-700">Enable this rule</span>
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          {isSubmitting ? 'Adding...' : 'Add Rule'}
        </button>
      </div>
    </form>
  );
}

function RoutingRuleCard({ 
  rule, 
  onEdit, 
  onDelete, 
  onToggle 
}: { 
  rule: RoutingRule; 
  onEdit: (rule: RoutingRule) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this routing rule?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(rule.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggle(rule.id, !rule.enabled);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-medium text-gray-900">
              {rule.prefix}@{rule.domainName}
            </h3>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              rule.enabled 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {rule.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          
          <div className="text-sm text-gray-600">
            <p className="mb-1">
              <span className="font-medium">Forwards to:</span>{' '}
              {rule.targetAddresses.join(', ')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={handleToggle}
            disabled={isToggling}
            className={`p-2 rounded-md transition-colors ${
              rule.enabled
                ? 'text-yellow-600 hover:bg-yellow-50'
                : 'text-green-600 hover:bg-green-50'
            }`}
            title={rule.enabled ? 'Disable rule' : 'Enable rule'}
          >
            {rule.enabled ? (
              <XMarkIcon className="h-4 w-4" />
            ) : (
              <CheckIcon className="h-4 w-4" />
            )}
          </button>
          
          <button
            onClick={() => onEdit(rule)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Edit rule"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Delete rule"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RoutingRulesManagement() {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/routing-rules');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch routing rules');
      }

      const data = await response.json();
      setRules(data);
    } catch (err) {
      console.error('Failed to fetch routing rules:', err);
      setError(err instanceof Error ? err.message : 'Failed to load routing rules');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      const response = await fetch('/api/routing-rules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete routing rule');
      }

      await fetchRules(); // Refresh the list
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete routing rule');
    }
  };

  const handleToggleRule = async (id: string, enabled: boolean) => {
    try {
      const rule = rules.find(r => r.id === id);
      if (!rule) return;

      const response = await fetch('/api/routing-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rule, enabled }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update routing rule');
      }

      await fetchRules(); // Refresh the list
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update routing rule');
    }
  };

  const handleEditRule = (rule: RoutingRule) => {
    // For now, just show an alert. In a full implementation, 
    // you'd open a modal or navigate to an edit form
    alert(`Edit functionality for rule ${rule.id} would be implemented here`);
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
          onClick={fetchRules}
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
        <h1 className="text-3xl font-bold text-gray-900">Routing Rules</h1>
        <p className="mt-2 text-gray-600">
          Configure email routing and forwarding rules
        </p>
      </div>

      <AddRoutingRuleForm onSuccess={fetchRules} />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Active Rules ({rules.length})
        </h2>
        
        {rules.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-gray-500">
              <p className="text-lg">No routing rules configured yet</p>
              <p className="text-sm mt-1">Add your first rule to start routing emails</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <RoutingRuleCard
                key={rule.id}
                rule={rule}
                onEdit={handleEditRule}
                onDelete={handleDeleteRule}
                onToggle={handleToggleRule}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}