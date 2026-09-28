import { useEffect, useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { Domain, RoutingRule } from '@/lib/purelymail';
import { apiFetch } from '@/lib/client-api';
import { useT } from '@/lib/i18n';
import { commonMessages } from '@/lib/i18n/messages/common';
import { routingMessages } from '@/lib/i18n/messages/routing';
import { useErrorText } from '@/lib/i18n/useErrorText';

type RoutingT = (key: keyof typeof routingMessages.en, vars?: Record<string, string | number>) => string;

// Describes which addresses a rule matches, e.g. "sales@example.com" or "sales*@example.com".
function describeMatch(rule: Pick<RoutingRule, 'matchUser' | 'prefix' | 'domainName' | 'catchall'>, t: RoutingT): string {
  const local = rule.prefix ? `${rule.matchUser}*` : rule.matchUser || t('emptyLocal');
  return `${local}@${rule.domainName}${rule.catchall ? t('onlyIfNoUser') : ''}`;
}

function AddRuleForm({ domains, onAdded }: { domains: string[]; onAdded: () => void }) {
  const [matchUser, setMatchUser] = useState('');
  const [domainName, setDomainName] = useState(domains[0] || '');
  const [prefix, setPrefix] = useState(false);
  const [catchall, setCatchall] = useState(false);
  const [targets, setTargets] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const t = useT(routingMessages);
  const errorText = useErrorText();
  useEffect(() => { if (!domainName && domains[0]) setDomainName(domains[0]); }, [domains, domainName]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/routing-rules', 'POST', {
        matchUser: matchUser.trim().toLowerCase(),
        domainName,
        prefix,
        catchall,
        targetAddresses: targets.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean),
      });
      setMatchUser('');
      setTargets('');
      onAdded();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">{t('addTitle')}</h2>
      <div className="flex flex-wrap items-center gap-2">
        <input className="form-input min-w-[8rem] flex-1" placeholder={prefix ? t('prefixPlaceholder') : t('addressPlaceholder')} value={matchUser} onChange={(e) => setMatchUser(e.target.value)} />
        <span className="text-gray-500">{prefix ? '*@' : '@'}</span>
        <select className="form-input w-auto" value={domainName} onChange={(e) => setDomainName(e.target.value)}>
          {domains.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="rounded border-gray-300" checked={prefix} onChange={(e) => setPrefix(e.target.checked)} />
          {t('matchPrefix')}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="rounded border-gray-300" checked={catchall} onChange={(e) => setCatchall(e.target.checked)} />
          {t('catchall')}
        </label>
      </div>
      <div>
        <label className="form-label" htmlFor="targets">{t('deliverTo')}</label>
        <input id="targets" className="form-input" placeholder="one@example.com, two@example.com" value={targets} onChange={(e) => setTargets(e.target.value)} />
      </div>
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <button type="submit" className="btn-primary flex items-center gap-2 disabled:opacity-50" disabled={saving || !domainName || !targets.trim() || (!prefix && !matchUser.trim())}>
        <PlusIcon className="h-4 w-4" /> {saving ? t('adding') : t('addRule')}
      </button>
    </form>
  );
}

export default function RoutingRulesManagement() {
  const [rules, setRules] = useState<RoutingRule[] | null>(null);
  const [domains, setDomains] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const t = useT(routingMessages);
  const tc = useT(commonMessages);
  const errorText = useErrorText();

  const load = async () => {
    try {
      const [r, d] = await Promise.all([apiFetch<RoutingRule[]>('/api/routing-rules'), apiFetch<Domain[]>('/api/domains')]);
      setRules(r);
      setDomains(d.map((x) => x.name).sort());
      setError(null);
    } catch (err) {
      setError(errorText(err));
    }
  };
  useEffect(() => { load(); }, []);

  const remove = async (rule: RoutingRule) => {
    if (!confirm(t('confirmDelete', { match: describeMatch(rule, t) }))) return;
    try {
      await apiFetch('/api/routing-rules', 'DELETE', { id: rule.id });
      load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-2 text-gray-600">{t('subtitle')}</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <AddRuleForm domains={domains} onAdded={load} />

      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">{t('rules')} {rules && `(${rules.length})`}</h2>
        {!rules && !error && <div className="h-24 animate-pulse rounded-lg bg-gray-100" />}
        {rules && rules.length === 0 && <div className="card text-center text-sm text-gray-500">{t('empty')}</div>}
        {rules?.map((rule) => (
          <div key={rule.id} className="card flex flex-wrap items-center gap-3">
            <div className="mr-auto min-w-0">
              <div className="break-all font-medium text-gray-900">{describeMatch(rule, t)}</div>
              <div className="break-all text-sm text-gray-600">
                {(rule as RoutingRule & { private?: boolean }).private
                  ? t('privateForwarding')
                  : `→ ${rule.targetAddresses.join(', ')}`}
              </div>
            </div>
            <button className="btn-danger flex items-center gap-1 text-sm" onClick={() => remove(rule)}>
              <TrashIcon className="h-4 w-4" /> {tc('delete')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
