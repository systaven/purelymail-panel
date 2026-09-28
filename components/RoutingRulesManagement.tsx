import { useEffect, useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { Domain, RoutingRule } from '@/lib/purelymail';

async function call<T = any>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.details ? `${data.error}: ${data.details}` : data.error || `Request failed (${response.status})`);
  return data;
}

// Describes which addresses a rule matches, e.g. "sales@example.com" or "sales*@example.com".
function describeMatch(rule: Pick<RoutingRule, 'matchUser' | 'prefix' | 'domainName' | 'catchall'>): string {
  const local = rule.prefix ? `${rule.matchUser}*` : rule.matchUser || '(empty)';
  return `${local}@${rule.domainName}${rule.catchall ? ' (only if no such user)' : ''}`;
}

function AddRuleForm({ domains, onAdded }: { domains: string[]; onAdded: () => void }) {
  const [matchUser, setMatchUser] = useState('');
  const [domainName, setDomainName] = useState(domains[0] || '');
  const [prefix, setPrefix] = useState(false);
  const [catchall, setCatchall] = useState(false);
  const [targets, setTargets] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!domainName && domains[0]) setDomainName(domains[0]); }, [domains, domainName]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await call('/api/routing-rules', 'POST', {
        matchUser: matchUser.trim().toLowerCase(),
        domainName,
        prefix,
        catchall,
        targetAddresses: targets.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean),
      });
      setMatchUser('');
      setTargets('');
      onAdded();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Add a routing rule</h2>
      <div className="flex flex-wrap items-center gap-2">
        <input className="form-input min-w-[8rem] flex-1" placeholder={prefix ? 'prefix (empty = everything)' : 'address, e.g. sales'} value={matchUser} onChange={(e) => setMatchUser(e.target.value)} />
        <span className="text-gray-500">{prefix ? '*@' : '@'}</span>
        <select className="form-input w-auto" value={domainName} onChange={(e) => setDomainName(e.target.value)}>
          {domains.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="rounded border-gray-300" checked={prefix} onChange={(e) => setPrefix(e.target.checked)} />
          Match as a prefix (anything starting with it)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="rounded border-gray-300" checked={catchall} onChange={(e) => setCatchall(e.target.checked)} />
          Only when the address isn't an existing user (catch-all)
        </label>
      </div>
      <div>
        <label className="form-label" htmlFor="targets">Deliver to</label>
        <input id="targets" className="form-input" placeholder="one@example.com, two@example.com" value={targets} onChange={(e) => setTargets(e.target.value)} />
      </div>
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <button type="submit" className="btn-primary flex items-center gap-2 disabled:opacity-50" disabled={saving || !domainName || !targets.trim() || (!prefix && !matchUser.trim())}>
        <PlusIcon className="h-4 w-4" /> {saving ? 'Adding...' : 'Add rule'}
      </button>
    </form>
  );
}

export default function RoutingRulesManagement() {
  const [rules, setRules] = useState<RoutingRule[] | null>(null);
  const [domains, setDomains] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [r, d] = await Promise.all([call<RoutingRule[]>('/api/routing-rules'), call<Domain[]>('/api/domains')]);
      setRules(r);
      setDomains(d.map((x) => x.name).sort());
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };
  useEffect(() => { load(); }, []);

  const remove = async (rule: RoutingRule) => {
    if (!confirm(`Delete the rule for ${describeMatch(rule)}?`)) return;
    try {
      await call('/api/routing-rules', 'DELETE', { id: rule.id });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Routing Rules</h1>
        <p className="mt-2 text-gray-600">Forward or reroute mail for addresses on your domains. To change a rule, delete it and add a new one.</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <AddRuleForm domains={domains} onAdded={load} />

      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">Rules {rules && `(${rules.length})`}</h2>
        {!rules && !error && <div className="h-24 animate-pulse rounded-lg bg-gray-100" />}
        {rules && rules.length === 0 && <div className="card text-center text-sm text-gray-500">No routing rules yet.</div>}
        {rules?.map((rule) => (
          <div key={rule.id} className="card flex flex-wrap items-center gap-3">
            <div className="mr-auto min-w-0">
              <div className="break-all font-medium text-gray-900">{describeMatch(rule)}</div>
              <div className="break-all text-sm text-gray-600">
                {(rule as RoutingRule & { private?: boolean }).private
                  ? 'Forwarding set by the mailbox owner (private)'
                  : `→ ${rule.targetAddresses.join(', ')}`}
              </div>
            </div>
            <button className="btn-danger flex items-center gap-1 text-sm" onClick={() => remove(rule)}>
              <TrashIcon className="h-4 w-4" /> Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
