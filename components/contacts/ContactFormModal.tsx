import { useEffect, useRef, useState } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Contact, ContactInput } from '@/components/dav/api';
import { useT } from '@/lib/i18n';
import { commonMessages } from '@/lib/i18n/messages/common';
import { contactsMessages } from '@/lib/i18n/messages/contacts';
import { useErrorText } from '@/lib/i18n/useErrorText';
import { cleanInput } from './utils';

interface Draft {
  name: string;
  org: string;
  emails: string[];
  phones: string[];
  note: string;
}

// Lists always show at least one (possibly empty) row to type into.
const rows = (values: string[]) => (values.length ? values : ['']);

function toDraft(contact: Contact | null): Draft {
  return {
    name: contact?.name || '',
    org: contact?.org || '',
    emails: rows(contact?.emails || []),
    phones: rows(contact?.phones || []),
    note: contact?.note || '',
  };
}

export default function ContactFormModal({
  contact,
  onClose,
  onSave,
}: {
  contact: Contact | null; // null creates a new one
  onClose: () => void;
  onSave: (input: ContactInput) => Promise<void>;
}) {
  const t = useT(contactsMessages);
  const tc = useT(commonMessages);
  const errorText = useErrorText();
  const [initial] = useState(() => toDraft(contact));
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mod, setMod] = useState('Ctrl');
  const pendingFocus = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) setMod('⌘');
  }, []);

  // Focus a row right after it was added.
  useEffect(() => {
    if (!pendingFocus.current) return;
    formRef.current?.querySelector<HTMLInputElement>(`[data-row="${pendingFocus.current}"]`)?.focus();
    pendingFocus.current = null;
  });

  const dirty = JSON.stringify(cleanInput(draft)) !== JSON.stringify(cleanInput(initial));

  const cancel = () => {
    if (saving) return;
    if (dirty && !confirm(t('discardConfirm'))) return;
    onClose();
  };

  const save = async () => {
    if (saving) return;
    const input = cleanInput(draft);
    if (!input.name && !input.emails?.length) {
      setError(t('nameOrEmailRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(input);
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  };

  const listEditor = (field: 'emails' | 'phones', label: string, addLabel: string, type: 'email' | 'tel') => {
    const values = draft[field];
    const setValues = (next: string[]) => setDraft({ ...draft, [field]: rows(next) });
    return (
      <fieldset>
        <legend className="form-label">{label}</legend>
        <div className="space-y-2">
          {values.map((value, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                type={type}
                inputMode={type}
                autoComplete="off"
                className="form-input min-w-0"
                value={value}
                data-row={`${field}-${i}`}
                aria-label={`${label} ${i + 1}`}
                onChange={(e) => setValues(values.map((v, j) => (j === i ? e.target.value : v)))}
              />
              <button
                type="button"
                className="btn-icon"
                onClick={() => setValues(values.filter((_, j) => j !== i))}
                disabled={values.length === 1 && !value}
                title={t('remove')}
                aria-label={`${t('remove')} ${label} ${i + 1}`}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
          onClick={() => {
            pendingFocus.current = `${field}-${values.length}`;
            setDraft({ ...draft, [field]: [...values, ''] });
          }}
        >
          <PlusIcon className="h-4 w-4" />
          {addLabel}
        </button>
      </fieldset>
    );
  };

  const title = contact ? t('editContact') : t('newContact');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          cancel();
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          save();
        }
      }}
    >
      <form
        ref={formRef}
        noValidate
        className="flex h-full w-full flex-col bg-surface shadow-xl sm:h-auto sm:max-h-full sm:max-w-lg sm:rounded-lg"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-5">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button type="button" onClick={cancel} className="btn-icon" aria-label={tc('close')}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="form-label" htmlFor="contact-name">{t('name')}</label>
            <input
              id="contact-name"
              className="form-input"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              autoComplete="off"
              autoFocus
            />
          </div>
          <div>
            <label className="form-label" htmlFor="contact-org">{t('organization')}</label>
            <input
              id="contact-org"
              className="form-input"
              value={draft.org}
              onChange={(e) => setDraft({ ...draft, org: e.target.value })}
              autoComplete="off"
            />
          </div>
          {listEditor('emails', t('emails'), t('addEmail'), 'email')}
          {listEditor('phones', t('phones'), t('addPhone'), 'tel')}
          <div>
            <label className="form-label" htmlFor="contact-note">{t('note')}</label>
            <textarea
              id="contact-note"
              className="form-input min-h-[6rem]"
              rows={4}
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-gray-200 px-4 py-3 sm:px-5">
          <span className="mr-auto hidden text-xs text-gray-500 sm:inline">{t('shortcutHint', { mod })}</span>
          <button type="button" onClick={cancel} className="btn-secondary ml-auto text-sm sm:ml-0" disabled={saving}>
            {tc('cancel')}
          </button>
          <button type="submit" className="btn-primary text-sm" disabled={saving}>
            {saving ? tc('saving') : tc('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
