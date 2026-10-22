import Link from 'next/link';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  ClipboardDocumentIcon,
  EnvelopeIcon,
  PencilSquareIcon,
  PhoneIcon,
  TrashIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import type { Contact } from '@/components/dav/api';
import { useT } from '@/lib/i18n';
import { commonMessages } from '@/lib/i18n/messages/common';
import { contactsMessages } from '@/lib/i18n/messages/contacts';
import Avatar from './Avatar';
import { contactLabel } from './utils';

export default function ContactDetail({
  mailbox,
  contact,
  deleting,
  onBack,
  onEdit,
  onDelete,
}: {
  mailbox: string;
  contact: Contact | null;
  deleting: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useT(contactsMessages);
  const tc = useT(commonMessages);

  if (!contact) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-gray-400">
        <UserCircleIcon className="mb-2 h-10 w-10" />
        {t('selectContact')}
      </div>
    );
  }

  const label = contactLabel(contact) || t('noName');

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('copied'));
    } catch {
      toast.error(t('copyFailed'));
    }
  };

  const copyButton = (value: string) => (
    <button className="btn-icon h-8 w-8" onClick={() => copy(value)} title={t('copy')} aria-label={`${t('copy')} ${value}`}>
      <ClipboardDocumentIcon className="h-4 w-4" />
    </button>
  );

  const rowClass = 'flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-primary-700 hover:bg-gray-100';

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-gray-200 px-2">
        <button className="btn-icon md:hidden" onClick={onBack} title={tc('back')} aria-label={t('backToContacts')}>
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button className="btn-icon" onClick={onEdit} title={tc('edit')} aria-label={tc('edit')}>
            <PencilSquareIcon className="h-5 w-5" />
          </button>
          <button className="btn-icon hover:text-red-600" onClick={onDelete} disabled={deleting} title={tc('delete')} aria-label={tc('delete')}>
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-4">
            <Avatar label={label} size="lg" />
            <div className="min-w-0">
              <h2 className="break-words text-xl font-semibold text-gray-900">{label}</h2>
              {contact.org && (
                <p className="mt-0.5 flex items-center gap-1.5 break-words text-sm text-gray-600">
                  <BuildingOfficeIcon className="h-4 w-4 shrink-0" />
                  {contact.org}
                </p>
              )}
            </div>
          </div>

          {contact.emails.length > 0 && (
            <section className="mt-6">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{t('email')}</h3>
              <ul>
                {contact.emails.map((email) => (
                  <li key={email} className="flex items-center gap-1">
                    <Link
                      href={{ pathname: '/mail', query: { mailbox, compose: email } }}
                      className={rowClass}
                      title={t('writeTo', { address: email })}
                    >
                      <EnvelopeIcon className="h-5 w-5 shrink-0 text-gray-400" />
                      <span className="min-w-0 break-all">{email}</span>
                    </Link>
                    {copyButton(email)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {contact.phones.length > 0 && (
            <section className="mt-5">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{t('phone')}</h3>
              <ul>
                {contact.phones.map((phone) => (
                  <li key={phone} className="flex items-center gap-1">
                    <a href={`tel:${phone.replace(/[^\d+*#,;]/g, '')}`} className={rowClass} title={t('call', { phone })}>
                      <PhoneIcon className="h-5 w-5 shrink-0 text-gray-400" />
                      <span className="min-w-0 break-all">{phone}</span>
                    </a>
                    {copyButton(phone)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {contact.note && (
            <section className="mt-5">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{t('note')}</h3>
              <p className="whitespace-pre-wrap break-words rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800">{contact.note}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
