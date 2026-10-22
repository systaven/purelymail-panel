import { useMemo } from 'react';
import { PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import type { Contact } from '@/components/dav/api';
import { useLocale, useT } from '@/lib/i18n';
import { contactsMessages } from '@/lib/i18n/messages/contacts';
import Avatar from './Avatar';
import { contactLabel, groupContacts } from './utils';

export default function ContactListPane({
  contacts,
  total,
  query,
  loading,
  error,
  noBooks,
  selectedHref,
  onSelect,
  onNew,
}: {
  contacts: Contact[] | null; // already filtered
  total: number;
  query: string;
  loading: boolean;
  error: string | null;
  noBooks: boolean;
  selectedHref: string | null;
  onSelect: (href: string) => void;
  onNew: () => void;
}) {
  const t = useT(contactsMessages);
  const { locale } = useLocale();
  const groups = useMemo(() => groupContacts(contacts || [], locale), [contacts, locale]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center border-b border-gray-200 px-3 text-sm text-gray-500">
        {contacts && !noBooks ? t('contactCount', { n: total }) : ''}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && <div className="m-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {loading && !contacts && !error && (
          <div className="space-y-4 p-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-3">
                <div className="h-9 w-9 shrink-0 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/2 rounded bg-gray-200" />
                  <div className="h-3 w-3/4 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        )}
        {noBooks && !error && (
          <div className="flex flex-col items-center p-6 text-center text-sm text-gray-500">
            <UserGroupIcon className="mb-2 h-10 w-10 text-gray-400" />
            {t('noAddressBooks')}
          </div>
        )}
        {contacts && !noBooks && !error && contacts.length === 0 && (
          query.trim() ? (
            <div className="break-words p-6 text-center text-sm text-gray-500">{t('noMatches', { query: query.trim() })}</div>
          ) : (
            <div className="flex flex-col items-center gap-3 p-6 text-center text-sm text-gray-500">
              <UserGroupIcon className="h-10 w-10 text-gray-400" />
              {t('noContacts')}
              <button onClick={onNew} className="btn-secondary text-sm">
                <PlusIcon className="h-4 w-4" />
                {t('newContact')}
              </button>
            </div>
          )
        )}

        {groups.map((group) => (
          <section key={group.key} aria-label={group.key}>
            <h3 className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-500">
              {group.key}
            </h3>
            <ul>
              {group.contacts.map((c) => {
                const label = contactLabel(c) || t('noName');
                const active = c.href === selectedHref;
                const secondary = c.name ? c.emails[0] || c.org || c.phones[0] : c.org;
                return (
                  <li key={c.href}>
                    <button
                      onClick={() => onSelect(c.href)}
                      aria-current={active ? 'true' : undefined}
                      className={`flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2 text-left ${
                        active ? 'bg-primary-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <Avatar label={label} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-900">{label}</span>
                        {secondary && <span className="block truncate text-xs text-gray-500">{secondary}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
