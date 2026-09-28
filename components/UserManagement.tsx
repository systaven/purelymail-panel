import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { 
  PlusIcon, 
  TrashIcon, 
  KeyIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  PencilIcon,
  XMarkIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { User, Domain } from '@/lib/purelymail';
import { apiFetch } from '@/lib/client-api';
import { useT } from '@/lib/i18n';
import { commonMessages } from '@/lib/i18n/messages/common';
import { userMessages } from '@/lib/i18n/messages/users';
import { useErrorText } from '@/lib/i18n/useErrorText';

interface UserFormData {
  localPart: string;
  domain: string;
  customDomain?: string;
  password: string;
  recoveryEnabled?: boolean;
  enableSearchIndexing?: boolean;
  enableSpamFiltering?: boolean;
  requireTwoFactorAuthentication?: boolean;
}

interface EditUserData {
  userName?: string;
  password?: string;
  confirmPassword?: string;
  recoveryEnabled?: boolean;
  enableSearchIndexing?: boolean;
  enableSpamFiltering?: boolean;
  requireTwoFactorAuthentication?: boolean;
}

function AddUserForm({ onSuccess }: { onSuccess: () => void }) {
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<UserFormData>();
  const [error, setError] = useState<string | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(true);
  const t = useT(userMessages);
  const errorText = useErrorText();
  
  const selectedDomain = watch('domain');

  // Predefined PurelyMail domains
  const predefinedDomains = [
    'purelymail.com',
    'cheapermail.com', 
    'placeq.com',
    'rethinkmail.com',
    'worldofmail.com'
  ];

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      setDomainsLoading(true);
      const response = await fetch('/api/domains');
      if (response.ok) {
        const fetchedDomains = await response.json();
        setDomains(fetchedDomains);
      }
    } catch (err) {
      console.error('Failed to fetch domains:', err);
      // Continue with predefined domains if API fails
    } finally {
      setDomainsLoading(false);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      setError(null);
      
      // Determine the actual domain to use
      const actualDomain = data.domain === 'custom' ? data.customDomain : data.domain;
      
      if (!actualDomain) {
        setError(t('domainMissing'));
        return;
      }

      const payload = {
        userName: `${data.localPart}@${actualDomain}`,
        password: data.password,
        recoveryEnabled: data.recoveryEnabled || false,
        enableSearchIndexing: data.enableSearchIndexing !== false,
        enableSpamFiltering: data.enableSpamFiltering !== false,
        requireTwoFactorAuthentication: data.requireTwoFactorAuthentication || false,
      };

      await apiFetch('/api/users', 'POST', payload);

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="localPart" className="form-label">
            {t('localPart')}
          </label>
          <input
            type="text"
            id="localPart"
            placeholder={t('localPartPlaceholder')}
            className="form-input"
            {...register('localPart', {
              required: t('localPartRequired'),
              pattern: {
                value: /^[a-zA-Z0-9._-]+$/,
                message: t('localPartInvalid'),
              },
            })}
          />
          {errors.localPart && (
            <p className="mt-1 text-sm text-red-600">{errors.localPart.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="domain" className="form-label">
            {t('domain')} {domainsLoading && <span className="text-xs text-gray-500">{t('domainLoading')}</span>}
          </label>
          <select
            id="domain"
            className="form-input"
            disabled={domainsLoading}
            {...register('domain', {
              required: t('domainRequired'),
            })}
          >
            <option value="">{t('selectDomain')}</option>
            
            {/* Predefined PurelyMail domains */}
            <optgroup label={t('purelymailDomains')}>
              {predefinedDomains.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </optgroup>

            {/* Custom domains from API */}
            {domains.length > 0 && (
              <optgroup label={t('customDomains')}>
                {domains
                  .filter(domain => !predefinedDomains.includes(domain.name))
                  .map((domain) => (
                    <option key={domain.name} value={domain.name}>
                      {domain.name} {domain.dnsSummary?.passesMx ? '✓' : '⚠️'}
                    </option>
                  ))}
              </optgroup>
            )}

            <option value="custom">{t('otherDomain')}</option>
          </select>
          {errors.domain && (
            <p className="mt-1 text-sm text-red-600">{errors.domain.message}</p>
          )}
        </div>
      </div>

      {/* Custom domain input - shown when "custom" is selected */}
      {selectedDomain === 'custom' && (
        <div className="mb-4">
          <label htmlFor="customDomain" className="form-label">
            {t('customDomain')}
          </label>
          <input
            type="text"
            id="customDomain"
            placeholder="yourdomain.com"
            className="form-input"
            {...register('customDomain', {
              required: selectedDomain === 'custom' ? t('customDomainRequired') : false,
              pattern: {
                value: /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/,
                message: t('domainInvalid'),
              },
            })}
          />
          {errors.customDomain && (
            <p className="mt-1 text-sm text-red-600">{errors.customDomain.message}</p>
          )}
        </div>
      )}

      <div className="mb-4">
        <div className="max-w-md">
          <label htmlFor="password" className="form-label">
            {t('password')}
          </label>
          <input
            type="password"
            id="password"
            className="form-input"
            {...register('password', {
              required: t('passwordRequired'),
              minLength: {
                value: 8,
                message: t('passwordMin'),
              },
            })}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="recoveryEnabled"
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              {...register('recoveryEnabled')}
            />
            <label htmlFor="recoveryEnabled" className="ml-2 text-sm text-gray-700">
              {t('enableRecovery')}
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableSpamFiltering"
              defaultChecked
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              {...register('enableSpamFiltering')}
            />
            <label htmlFor="enableSpamFiltering" className="ml-2 text-sm text-gray-700">
              {t('enableSpamFiltering')}
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableSearchIndexing"
              defaultChecked
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              {...register('enableSearchIndexing')}
            />
            <label htmlFor="enableSearchIndexing" className="ml-2 text-sm text-gray-700">
              {t('enableSearchIndexing')}
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="requireTwoFactorAuthentication"
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              {...register('requireTwoFactorAuthentication')}
            />
            <label htmlFor="requireTwoFactorAuthentication" className="ml-2 text-sm text-gray-700">
              {t('requireTwoFactor')}
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          {isSubmitting ? t('creating') : t('createUser')}
        </button>
      </div>
    </form>
  );
}

function EditUserModal({ 
  user, 
  isOpen, 
  onClose, 
  onSuccess 
}: { 
  user: User; 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<EditUserData>({
    defaultValues: {
      userName: user.userName,
      recoveryEnabled: user.recoveryEnabled,
      enableSearchIndexing: user.enableSearchIndexing,
      enableSpamFiltering: user.enableSpamFiltering,
      requireTwoFactorAuthentication: user.requireTwoFactorAuthentication,
    }
  });
  const [error, setError] = useState<string | null>(null);
  const t = useT(userMessages);
  const tc = useT(commonMessages);
  const errorText = useErrorText();
  
  const password = watch('password');

  const onSubmit = async (data: EditUserData) => {
    try {
      setError(null);

      // Validate passwords if provided
      if (data.password && data.password !== data.confirmPassword) {
        setError(t('passwordMismatch'));
        return;
      }

      // Prepare the update payload
      const updatePayload: any = {
        userName: user.userName, // Original username for identification
        recoveryEnabled: data.recoveryEnabled,
        enableSearchIndexing: data.enableSearchIndexing,
        enableSpamFiltering: data.enableSpamFiltering,
        requireTwoFactorAuthentication: data.requireTwoFactorAuthentication,
      };

      // Add password if provided
      if (data.password && data.password.trim()) {
        updatePayload.password = data.password;
      }

      // Add new username if changed
      if (data.userName && data.userName !== user.userName) {
        updatePayload.newUserName = data.userName;
      }

      await apiFetch('/api/users', 'PATCH', updatePayload);

      onSuccess();
      onClose();
    } catch (err) {
      setError(errorText(err));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-black/40 px-4">
      <div className="relative mx-auto my-10 w-full max-w-md rounded-md border border-gray-200 bg-surface p-5 shadow-lg sm:my-20">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {t('editTitle', { name: user.userName })}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label={tc('close')}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 mb-6">
            {/* Username Field */}
            <div>
              <label htmlFor="edit-userName" className="form-label">
                {t('emailAddress')}
              </label>
              <input
                type="email"
                id="edit-userName"
                className="form-input"
                {...register('userName', {
                  required: t('emailRequired'),
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: t('emailInvalid'),
                  },
                })}
              />
              {errors.userName && (
                <p className="mt-1 text-sm text-red-600">{errors.userName.message}</p>
              )}
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-password" className="form-label">
                  {t('newPassword')}
                </label>
                <input
                  type="password"
                  id="edit-password"
                  className="form-input"
                  {...register('password', {
                    minLength: {
                      value: 8,
                      message: t('passwordMin'),
                    },
                  })}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">{t('keepPassword')}</p>
              </div>

              <div>
                <label htmlFor="edit-confirmPassword" className="form-label">
                  {t('confirmPassword')}
                </label>
                <input
                  type="password"
                  id="edit-confirmPassword"
                  className="form-input"
                  {...register('confirmPassword', {
                    validate: (value) => {
                      if (password && password.trim() && value !== password) {
                        return t('passwordMismatch');
                      }
                      return true;
                    },
                  })}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Separator */}
            <hr className="border-gray-200" />

            {/* Settings Checkboxes */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="edit-recoveryEnabled"
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                {...register('recoveryEnabled')}
              />
              <label htmlFor="edit-recoveryEnabled" className="ml-2 text-sm text-gray-700">
                {t('enableRecovery')}
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="edit-enableSpamFiltering"
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                {...register('enableSpamFiltering')}
              />
              <label htmlFor="edit-enableSpamFiltering" className="ml-2 text-sm text-gray-700">
                {t('enableSpamFiltering')}
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="edit-enableSearchIndexing"
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                {...register('enableSearchIndexing')}
              />
              <label htmlFor="edit-enableSearchIndexing" className="ml-2 text-sm text-gray-700">
                {t('enableSearchIndexing')}
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="edit-requireTwoFactorAuthentication"
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                {...register('requireTwoFactorAuthentication')}
              />
              <label htmlFor="edit-requireTwoFactorAuthentication" className="ml-2 text-sm text-gray-700">
                {t('requireTwoFactor')}
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              {tc('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? t('updating') : t('updateUser')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserCard({ 
  user, 
  onDelete,
  onEdit
}: { 
  user: User; 
  onDelete: (userName: string) => void;
  onEdit: (user: User) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const t = useT(userMessages);
  const tc = useT(commonMessages);

  const owned = user as User & { ownerLabel?: string | null; private?: boolean };

  const handleDelete = async () => {
    const warning = owned.private
      ? t('confirmDeletePrivate', { name: user.userName, owner: owned.ownerLabel ?? '' })
      : t('confirmDelete', { name: user.userName });
    if (!confirm(warning)) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(user.userName);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-lg font-medium text-gray-900 break-all">
              {user.userName}
            </h3>
            {owned.private && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                <LockClosedIcon className="h-3 w-3" />
                {t('privateBadge', { owner: owned.ownerLabel ?? '' })}
              </span>
            )}
          </div>

          {owned.private && (
            <p className="text-sm text-gray-500">{t('privateNote')}</p>
          )}
          
          <div className="flex flex-wrap gap-2 mb-3">
            {user.enableSpamFiltering && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <ShieldCheckIcon className="h-3 w-3" />
                {t('badgeSpam')}
              </span>
            )}
            {user.requireTwoFactorAuthentication && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <ShieldCheckIcon className="h-3 w-3" />
                {t('badgeTwoFactor')}
              </span>
            )}
            {user.recoveryEnabled && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                <EnvelopeIcon className="h-3 w-3" />
                {t('badgeRecovery')}
              </span>
            )}
            {user.enableSearchIndexing && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {t('badgeSearch')}
              </span>
            )}
          </div>

          {user.recoveryEnabled && (
            <div className="text-sm text-gray-600">
              <p>{t('recoveryEnabled')}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-4 sm:shrink-0">
          {!owned.private && (<>
          <Link
            href={{ pathname: '/mail', query: { mailbox: user.userName } }}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <EnvelopeIcon className="h-4 w-4" />
            {t('openMailbox')}
          </Link>

          <button
            onClick={() => onEdit(user)}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <PencilIcon className="h-4 w-4" />
            {tc('edit')}
          </button>
          </>)}

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
    </div>
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const t = useT(userMessages);
  const tc = useT(commonMessages);
  const errorText = useErrorText();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await apiFetch<User[]>('/api/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userName: string) => {
    try {
      await apiFetch('/api/users', 'DELETE', { userName });

      await fetchUsers(); // Refresh the list
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
          onClick={fetchUsers}
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

      <AddUserForm onSuccess={fetchUsers} />

      {editingUser && (
        <EditUserModal
          user={editingUser}
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={fetchUsers}
        />
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {t('usersCount', { count: users.length })}
        </h2>
        
        {users.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-gray-500">
              <p className="text-lg">{t('empty')}</p>
              <p className="text-sm mt-1 mb-4">{t('emptyHint')}</p>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-left">
                <h4 className="text-sm font-medium text-blue-800 mb-2">{t('alternatives')}</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>{t('altWeb')}</li>
                  <li>{t('altApiKey')}</li>
                  <li>{t('altSupport')}</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <UserCard
                key={user.userName}
                user={user}
                onDelete={handleDeleteUser}
                onEdit={setEditingUser}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}