import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUturnRightIcon,
  EnvelopeIcon,
  KeyIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { apiFetch } from '@/lib/client-api';
import { useLocale, useT } from '@/lib/i18n';
import { commonMessages } from '@/lib/i18n/messages/common';
import { myMailboxesMessages } from '@/lib/i18n/messages/myMailboxes';
import { useErrorText } from '@/lib/i18n/useErrorText';

interface Limits {
  maxMailboxes: number;
  requiresApproval: boolean;
  allowedDomains: string[];
}

interface MailboxRequest {
  id: string;
  mailbox: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  note: string | null;
  decision_note: string | null;
  created_at: string;
}

interface Me {
  role: 'admin' | 'guest';
  user: { email: string | null; name: string | null } | null;
  limits?: Limits;
  mailboxes?: string[];
  pendingRequests?: number;
  requests?: MailboxRequest[];
}

const STATUS_STYLES: Record<MailboxRequest['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS = {
  pending: 'statusPending',
  approved: 'statusApproved',
  rejected: 'statusRejected',
  cancelled: 'statusCancelled',
} as const;

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const tc = useT(commonMessages);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label={tc('close')}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function PasswordModal({ mailbox, onClose }: { mailbox: string; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const t = useT(myMailboxesMessages);
  const tc = useT(commonMessages);
  const errorText = useErrorText();

  const save = async () => {
    if (password !== confirm) return setError(t('passwordsDontMatch'));
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/me/password', 'POST', { mailbox, password });
      setDone(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={t('passwordFor', { mailbox })} onClose={onClose}>
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">{t('passwordUpdated')}</p>
          <MailAppSettings mailbox={mailbox} />
          <div className="flex justify-end"><button className="btn-primary" onClick={onClose}>{tc('done')}</button></div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{t('passwordHelp')}</p>
          <input type="password" className="form-input" placeholder={t('newPasswordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <input type="password" className="form-input" placeholder={t('confirmPasswordPlaceholder')} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={onClose}>{tc('cancel')}</button>
            <button className="btn-primary disabled:opacity-50" onClick={save} disabled={saving || password.length < 10}>
              {saving ? tc('saving') : t('setPassword')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function MailAppSettings({ mailbox }: { mailbox: string }) {
  const t = useT(myMailboxesMessages);
  return (
    <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 rounded-md bg-gray-50 p-3 text-sm">
      <dt className="text-gray-500">{t('username')}</dt><dd className="break-all">{mailbox}</dd>
      <dt className="text-gray-500">IMAP</dt><dd>imap.purelymail.com, {t('port', { port: 993 })}, SSL/TLS</dd>
      <dt className="text-gray-500">SMTP</dt><dd>smtp.purelymail.com, {t('port', { port: 465 })}, SSL/TLS</dd>
    </dl>
  );
}

function ForwardingModal({ mailbox, onClose }: { mailbox: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [targets, setTargets] = useState('');
  const [keepCopy, setKeepCopy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const t = useT(myMailboxesMessages);
  const tc = useT(commonMessages);
  const errorText = useErrorText();

  useEffect(() => {
    apiFetch(`/api/me/forwarding?mailbox=${encodeURIComponent(mailbox)}`)
      .then((f) => {
        setEnabled(f.enabled);
        setTargets(f.targets.join(', '));
        setKeepCopy(f.enabled ? f.keepCopy : true);
      })
      .catch((err) => setError(errorText(err)))
      .finally(() => setLoading(false));
  }, [mailbox, errorText]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const list = targets.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
      await apiFetch('/api/me/forwarding', 'PUT', { mailbox, targets: list, keepCopy });
      onClose();
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/me/forwarding', 'DELETE', { mailbox });
      onClose();
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  };

  return (
    <Modal title={t('forwardingFor', { mailbox })} onClose={onClose}>
      {loading ? (
        <div className="py-6 text-center text-sm text-gray-500">{tc('loading')}</div>
      ) : (
        <div className="space-y-3">
          <label className="form-label" htmlFor="targets">{t('forwardTo')}</label>
          <textarea id="targets" className="form-input min-h-[5rem] text-sm" placeholder={t('forwardPlaceholder')} value={targets} onChange={(e) => setTargets(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" className="rounded border-gray-300" checked={keepCopy} onChange={(e) => setKeepCopy(e.target.checked)} />
            {t('keepCopy')}
          </label>
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="flex flex-wrap justify-end gap-3">
            {enabled && <button className="btn-danger mr-auto" onClick={remove} disabled={saving}>{t('turnOffForwarding')}</button>}
            <button className="btn-secondary" onClick={onClose}>{tc('cancel')}</button>
            <button className="btn-primary disabled:opacity-50" onClick={save} disabled={saving || !targets.trim()}>
              {saving ? tc('saving') : tc('save')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function NewMailboxForm({ limits, onDone }: { limits: Limits; onDone: (message: string) => void }) {
  const [localPart, setLocalPart] = useState('');
  const [domain, setDomain] = useState(limits.allowedDomains[0] || '');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const t = useT(myMailboxesMessages);
  const errorText = useErrorText();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await apiFetch('/api/me/mailboxes', 'POST', { localPart, domain, note });
      setLocalPart('');
      setNote('');
      onDone(result.requested
        ? t('requested', { mailbox: result.request.mailbox })
        : t('created', { mailbox: result.mailbox }));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">{limits.requiresApproval ? t('requestMailbox') : t('createMailbox')}</h2>
      <div className="flex flex-wrap items-center gap-2">
        <input className="form-input min-w-[10rem] flex-1" placeholder={t('namePlaceholder')} value={localPart} onChange={(e) => setLocalPart(e.target.value.toLowerCase())} required />
        <span className="text-gray-500">@</span>
        <select className="form-input w-auto" value={domain} onChange={(e) => setDomain(e.target.value)}>
          {limits.allowedDomains.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      {limits.requiresApproval && (
        <input className="form-input" placeholder={t('notePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      )}
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <button type="submit" className="btn-primary flex items-center gap-2 disabled:opacity-50" disabled={saving || !localPart || !domain}>
        <PlusIcon className="h-4 w-4" />
        {saving ? t('working') : limits.requiresApproval ? t('sendRequest') : t('createButton')}
      </button>
    </form>
  );
}

export default function MyMailboxes() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [passwordFor, setPasswordFor] = useState<string | null>(null);
  const [forwardingFor, setForwardingFor] = useState<string | null>(null);
  const t = useT(myMailboxesMessages);
  const tc = useT(commonMessages);
  const { locale } = useLocale();
  const errorText = useErrorText();

  const load = () => apiFetch<Me>('/api/me').then(setMe).catch((err) => setError(errorText(err)));
  useEffect(() => { load(); }, []);

  const removeMailbox = async (mailbox: string) => {
    if (!confirm(t('confirmDelete', { mailbox }))) return;
    try {
      await apiFetch('/api/me/mailboxes', 'DELETE', { mailbox });
      setNotice(t('deleted', { mailbox }));
      load();
    } catch (err) {
      setNotice(errorText(err));
    }
  };

  const cancelRequest = async (id: string) => {
    try {
      await apiFetch('/api/me/requests', 'DELETE', { id });
      load();
    } catch (err) {
      setNotice(errorText(err));
    }
  };

  if (error) return <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div>;
  if (!me) return <div className="h-40 animate-pulse rounded-lg bg-gray-100" />;

  if (!me.user || !me.limits) {
    return <div className="card text-gray-600">{t('linkClerk')}</div>;
  }

  const { limits, mailboxes = [], requests = [], pendingRequests = 0 } = me;
  const used = mailboxes.length + pendingRequests;
  const canAdd = used < limits.maxMailboxes && limits.allowedDomains.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-2 text-gray-600">
          {pendingRequests > 0
            ? t('usagePending', { used: mailboxes.length, max: limits.maxMailboxes, pending: pendingRequests })
            : t('usage', { used: mailboxes.length, max: limits.maxMailboxes })}
          {limits.allowedDomains.length > 0
            ? t('availableDomains', { domains: limits.allowedDomains.join(', ') })
            : t('noDomains')}
        </p>
        <p className="mt-1 text-sm text-gray-500">{t('privacyNote')}</p>
      </div>

      {notice && (
        <div className="flex items-center justify-between rounded-md bg-blue-50 px-4 py-2 text-sm text-blue-800">
          {notice}
          <button onClick={() => setNotice(null)} className="font-medium">{tc('dismiss')}</button>
        </div>
      )}

      {mailboxes.length === 0 ? (
        <div className="card text-center text-gray-500">{t('noMailboxes')}</div>
      ) : (
        <ul className="space-y-3">
          {mailboxes.map((m) => (
            <li key={m} className="card flex flex-wrap items-center gap-3">
              <span className="mr-auto break-all text-lg font-medium text-gray-900">{m}</span>
              <Link href={{ pathname: '/mail', query: { mailbox: m } }} className="btn-primary flex items-center gap-2 text-sm">
                <EnvelopeIcon className="h-4 w-4" /> {t('open')}
              </Link>
              <button className="btn-secondary flex items-center gap-2 text-sm" onClick={() => setPasswordFor(m)}>
                <KeyIcon className="h-4 w-4" /> {t('password')}
              </button>
              <button className="btn-secondary flex items-center gap-2 text-sm" onClick={() => setForwardingFor(m)}>
                <ArrowUturnRightIcon className="h-4 w-4" /> {t('forwarding')}
              </button>
              <button className="btn-danger flex items-center gap-2 text-sm" onClick={() => removeMailbox(m)}>
                <TrashIcon className="h-4 w-4" /> {tc('delete')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {canAdd ? (
        <NewMailboxForm limits={limits} onDone={(message) => { setNotice(message); load(); }} />
      ) : (
        <div className="card text-sm text-gray-600">
          {limits.allowedDomains.length === 0
            ? t('needDomain')
            : t('limitReached')}
        </div>
      )}

      {requests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">{t('requests')}</h2>
          <ul className="card divide-y divide-gray-100 p-0">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="break-all font-medium text-gray-900">{r.mailbox}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>{STATUS_LABELS[r.status] ? t(STATUS_LABELS[r.status]) : r.status}</span>
                <span className="text-gray-500">{new Date(r.created_at).toLocaleDateString(locale)}</span>
                {r.decision_note && <span className="text-gray-600">"{r.decision_note}"</span>}
                {r.status === 'pending' && (
                  <button className="ml-auto text-sm text-red-600 hover:underline" onClick={() => cancelRequest(r.id)}>{tc('cancel')}</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {passwordFor && <PasswordModal mailbox={passwordFor} onClose={() => setPasswordFor(null)} />}
      {forwardingFor && <ForwardingModal mailbox={forwardingFor} onClose={() => setForwardingFor(null)} />}
    </div>
  );
}
