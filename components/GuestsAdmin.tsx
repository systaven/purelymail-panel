import { useEffect, useState } from 'react';
import { CheckIcon, LockClosedIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { apiFetch } from '@/lib/client-api';
import { useLocale, useT } from '@/lib/i18n';
import { commonMessages } from '@/lib/i18n/messages/common';
import { guestsMessages } from '@/lib/i18n/messages/guests';
import { useErrorText } from '@/lib/i18n/useErrorText';

interface Limits {
  maxMailboxes: number;
  requiresApproval: boolean;
  allowedDomains: string[];
}

interface Guest {
  clerk_user_id: string;
  email: string | null;
  name: string | null;
  role: 'guest' | 'admin';
  disabled: boolean;
  max_mailboxes: number | null;
  requires_approval: boolean | null;
  extra_domains: string[];
  created_at: string;
  last_seen_at: string;
  limits: Limits;
  mailboxes: string[];
  pendingRequests: number;
}

interface Settings {
  default_max_mailboxes: number;
  default_requires_approval: boolean;
  open_domains: string[];
}

interface MailboxRequest {
  id: string;
  clerk_user_id: string;
  mailbox: string;
  note: string | null;
  created_at: string;
}

interface AuditEntry {
  id: number;
  actorLabel: string;
  action: string;
  target: string | null;
  created_at: string;
}

// Audit action codes with a translated label; unknown codes are shown as-is.
type GuestsKey = keyof typeof guestsMessages.en;
const actionKey = (action: string) => `action.${action}` as GuestsKey;
const hasActionLabel = (action: string) => actionKey(action) in guestsMessages.en;

const label = (g: { email: string | null; name: string | null; clerk_user_id: string }) => g.email || g.name || g.clerk_user_id;

function DomainChecklist({ domains, selected, onChange }: { domains: string[]; selected: string[]; onChange: (next: string[]) => void }) {
  const t = useT(guestsMessages);
  if (domains.length === 0) return <p className="text-sm text-gray-500">{t('noDomainsInAccount')}</p>;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {domains.map((d) => (
        <label key={d} className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="rounded border-gray-300"
            checked={selected.includes(d)}
            onChange={(e) => onChange(e.target.checked ? [...selected, d] : selected.filter((x) => x !== d))}
          />
          {d}
        </label>
      ))}
    </div>
  );
}

function SettingsCard({ settings, domains, onSaved }: { settings: Settings; domains: string[]; onSaved: () => void }) {
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const t = useT(guestsMessages);
  const tc = useT(commonMessages);
  const errorText = useErrorText();
  useEffect(() => setDraft(settings), [settings]);

  const save = async () => {
    setError(null);
    try {
      await apiFetch('/api/admin/settings', 'PUT', draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">{t('defaultsTitle')}</h2>
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          {t('mailboxLimit')}
          <input
            type="number"
            min={0}
            className="form-input w-24"
            value={draft.default_max_mailboxes}
            onChange={(e) => setDraft({ ...draft, default_max_mailboxes: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="rounded border-gray-300"
            checked={draft.default_requires_approval}
            onChange={(e) => setDraft({ ...draft, default_requires_approval: e.target.checked })}
          />
          {t('needsMyApproval')}
        </label>
      </div>
      <div>
        <div className="form-label">{t('openDomains')}</div>
        <DomainChecklist domains={domains} selected={draft.open_domains} onChange={(open_domains) => setDraft({ ...draft, open_domains })} />
      </div>
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <button className="btn-primary" onClick={save}>{saved ? tc('saved') : t('saveDefaults')}</button>
    </div>
  );
}

function EditGuestModal({ guest, domains, settings, onClose, onSaved }: {
  guest: Guest; domains: string[]; settings: Settings; onClose: () => void; onSaved: () => void;
}) {
  const [role, setRole] = useState(guest.role);
  const [disabled, setDisabled] = useState(guest.disabled);
  const [maxMailboxes, setMaxMailboxes] = useState(guest.max_mailboxes === null ? '' : String(guest.max_mailboxes));
  const [approval, setApproval] = useState(guest.requires_approval === null ? 'default' : guest.requires_approval ? 'yes' : 'no');
  const [extraDomains, setExtraDomains] = useState(guest.extra_domains);
  const [error, setError] = useState<string | null>(null);
  const t = useT(guestsMessages);
  const tc = useT(commonMessages);
  const errorText = useErrorText();

  const save = async () => {
    setError(null);
    try {
      await apiFetch('/api/admin/guests', 'PATCH', {
        clerk_user_id: guest.clerk_user_id,
        role,
        disabled,
        max_mailboxes: maxMailboxes === '' ? null : Number(maxMailboxes),
        requires_approval: approval === 'default' ? null : approval === 'yes',
        extra_domains: extraDomains,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-lg bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="truncate text-lg font-semibold text-gray-900">{label(guest)}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label={tc('close')}><XMarkIcon className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 px-5 py-4 text-sm">
          <label className="block">
            <span className="form-label">{t('role')}</span>
            <select className="form-input" value={role} onChange={(e) => setRole(e.target.value as Guest['role'])}>
              <option value="guest">{t('roleGuest')}</option>
              <option value="admin">{t('roleAdmin')}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-gray-700">
            <input type="checkbox" className="rounded border-gray-300" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
            {t('disabledLabel')}
          </label>
          <label className="block">
            <span className="form-label">{t('mailboxLimit')}</span>
            <input type="number" min={0} className="form-input" placeholder={t('limitDefault', { n: settings.default_max_mailboxes })} value={maxMailboxes} onChange={(e) => setMaxMailboxes(e.target.value)} />
          </label>
          <label className="block">
            <span className="form-label">{t('newMailboxes')}</span>
            <select className="form-input" value={approval} onChange={(e) => setApproval(e.target.value)}>
              <option value="default">{settings.default_requires_approval ? t('approvalDefaultNeed') : t('approvalDefaultDirect')}</option>
              <option value="yes">{t('approvalYes')}</option>
              <option value="no">{t('approvalNo')}</option>
            </select>
          </label>
          <div>
            <div className="form-label">{t('extraDomains')}</div>
            <p className="mb-2 text-xs text-gray-500">{t('extraDomainsHelp', { domains: settings.open_domains.join(', ') || tc('none') })}</p>
            <DomainChecklist domains={domains.filter((d) => !settings.open_domains.includes(d))} selected={extraDomains} onChange={setExtraDomains} />
          </div>
          {error && <div className="rounded-md bg-red-50 p-3 text-red-700">{error}</div>}
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-3">
          <button className="btn-secondary" onClick={onClose}>{tc('cancel')}</button>
          <button className="btn-primary" onClick={save}>{tc('save')}</button>
        </div>
      </div>
    </div>
  );
}

export default function GuestsAdmin() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [domains, setDomains] = useState<string[]>([]);
  const [requests, setRequests] = useState<MailboxRequest[]>([]);
  const [unowned, setUnowned] = useState<string[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[] | null>(null);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const t = useT(guestsMessages);
  const tc = useT(commonMessages);
  const { locale } = useLocale();
  const errorText = useErrorText();

  const load = async () => {
    try {
      const [g, s, d, r, users] = await Promise.all([
        apiFetch<Guest[]>('/api/admin/guests'),
        apiFetch<Settings>('/api/admin/settings'),
        apiFetch<{ name: string }[]>('/api/domains'),
        apiFetch<MailboxRequest[]>('/api/admin/requests?status=pending'),
        apiFetch<{ userName: string; owner: string | null }[]>('/api/users'),
      ]);
      setGuests(g);
      setSettings(s);
      setDomains(d.map((x) => x.name.toLowerCase()).sort());
      setRequests(r);
      setUnowned(users.filter((u) => !u.owner).map((u) => u.userName.toLowerCase()).sort());
    } catch (err) {
      setError(errorText(err));
    }
  };
  useEffect(() => { load(); }, []);

  const decide = async (request: MailboxRequest, decision: 'approve' | 'reject') => {
    const note = decision === 'reject' ? prompt(t('rejectReason')) : null;
    if (note === null && decision === 'reject') return;
    try {
      await apiFetch('/api/admin/requests', 'POST', { id: request.id, decision, note });
      setNotice(t(decision === 'approve' ? 'approved' : 'rejected', { mailbox: request.mailbox }));
      load();
    } catch (err) {
      setNotice(errorText(err));
    }
  };

  const assign = async (mailbox: string, clerkUserId: string) => {
    try {
      await apiFetch('/api/admin/owners', 'PUT', { mailbox, clerk_user_id: clerkUserId });
      load();
    } catch (err) {
      setNotice(errorText(err));
    }
  };

  const guestById = new Map(guests.map((g) => [g.clerk_user_id, g]));

  if (error) return <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-2 text-gray-600">{t('description')}</p>
      </div>

      {notice && (
        <div className="flex items-center justify-between rounded-md bg-blue-50 px-4 py-2 text-sm text-blue-800">
          {notice}
          <button onClick={() => setNotice(null)} className="font-medium">{tc('dismiss')}</button>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">{t('pendingRequests')} {requests.length > 0 && `(${requests.length})`}</h2>
        {requests.length === 0 ? (
          <div className="card text-sm text-gray-500">{t('noPendingRequests')}</div>
        ) : (
          <ul className="card divide-y divide-gray-100 p-0">
            {requests.map((r) => {
              const g = guestById.get(r.clerk_user_id);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <div className="mr-auto min-w-0">
                    <div className="break-all font-medium text-gray-900">{r.mailbox}</div>
                    <div className="text-gray-500">
                      {g ? label(g) : r.clerk_user_id} · {new Date(r.created_at).toLocaleString(locale)}
                      {r.note && <> · "{r.note}"</>}
                    </div>
                  </div>
                  <button className="btn-primary flex items-center gap-1 text-sm" onClick={() => decide(r, 'approve')}><CheckIcon className="h-4 w-4" /> {t('approve')}</button>
                  <button className="btn-secondary flex items-center gap-1 text-sm" onClick={() => decide(r, 'reject')}><XMarkIcon className="h-4 w-4" /> {t('reject')}</button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {settings && <SettingsCard settings={settings} domains={domains} onSaved={load} />}

      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">{t('users', { n: guests.length })}</h2>
        {guests.length === 0 && <div className="card text-sm text-gray-500">{t('noUsers')}</div>}
        {guests.map((g) => (
          <div key={g.clerk_user_id} className="card space-y-3">
            <div className="flex flex-wrap items-start gap-3">
              <div className="mr-auto min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="break-all font-medium text-gray-900">{label(g)}</span>
                  {g.role === 'admin' && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">{t('badgeAdmin')}</span>}
                  {g.disabled && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">{t('badgeDisabled')}</span>}
                </div>
                <div className="text-sm text-gray-500">
                  {t('summaryMailboxes', { n: g.mailboxes.length, max: g.limits.maxMailboxes })}
                  {g.pendingRequests > 0 && ` · ${t('summaryPending', { n: g.pendingRequests })}`}
                  {' · '}{g.limits.requiresApproval ? t('needsApproval') : t('createsDirectly')}
                  {' · '}{t('summaryDomains', { domains: g.limits.allowedDomains.join(', ') || tc('none') })}
                  {' · '}{t('lastSeen', { date: new Date(g.last_seen_at).toLocaleDateString(locale) })}
                </div>
              </div>
              <button className="btn-secondary flex items-center gap-1 text-sm" onClick={() => setEditing(g)}>
                <PencilIcon className="h-4 w-4" /> {tc('edit')}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {g.mailboxes.map((m) => (
                <span key={m} className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-gray-700" title={t('privateToUser')}>
                  <LockClosedIcon className="h-3.5 w-3.5 text-gray-400" />
                  {m}
                </span>
              ))}
              {unowned.length > 0 && (
                <select className="rounded-md border border-gray-300 py-1 pl-2 pr-8 text-sm text-gray-700" value="" onChange={(e) => {
                  const m = e.target.value;
                  if (m && confirm(t('confirmAssign', { mailbox: m, user: label(g) }))) {
                    assign(m, g.clerk_user_id);
                  }
                }}>
                  <option value="">{t('assignMailbox')}</option>
                  {unowned.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900">{t('activity')}</h2>
          {!auditLog && <button className="text-sm text-primary-600 hover:underline" onClick={() => apiFetch<AuditEntry[]>('/api/admin/audit').then(setAuditLog).catch((e) => setNotice(errorText(e)))}>{tc('show')}</button>}
        </div>
        {auditLog && (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-gray-500">
                <tr><th className="px-4 py-2 font-medium">{t('colWhen')}</th><th className="px-4 py-2 font-medium">{t('colWho')}</th><th className="px-4 py-2 font-medium">{t('colWhat')}</th><th className="px-4 py-2 font-medium">{t('colTarget')}</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLog.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-gray-500">{new Date(e.created_at).toLocaleString(locale)}</td>
                    <td className="px-4 py-2">{e.actorLabel === 'Admin (password)' ? t('actorAdminPassword') : e.actorLabel}</td>
                    {hasActionLabel(e.action)
                      ? <td className="px-4 py-2" title={e.action}>{t(actionKey(e.action))}</td>
                      : <td className="px-4 py-2 font-mono text-xs">{e.action}</td>}
                    <td className="break-all px-4 py-2">{e.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && settings && (
        <EditGuestModal guest={editing} domains={domains} settings={settings} onClose={() => setEditing(null)} onSaved={load} />
      )}
    </div>
  );
}
