import { ApiError } from './errors';
import { getSupabase, unwrap } from './supabase';

// Data access for guest accounts, mailbox ownership, requests and the audit
// log (tables from supabase/panel_accounts.sql). Server-side only.

export interface PanelSettings {
  default_max_mailboxes: number;
  default_requires_approval: boolean;
  open_domains: string[];
}

export interface PanelUser {
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
}

export interface MailboxRequest {
  id: string;
  clerk_user_id: string;
  mailbox: string;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface Limits {
  maxMailboxes: number;
  requiresApproval: boolean;
  allowedDomains: string[];
}

const db = () => getSupabase();

// --- Settings ---------------------------------------------------------------

export async function getSettings(): Promise<PanelSettings> {
  const row = unwrap(
    await db().from('panel_settings').select('default_max_mailboxes, default_requires_approval, open_domains').eq('id', 1).maybeSingle(),
    'read panel settings'
  );
  return row || { default_max_mailboxes: 1, default_requires_approval: true, open_domains: [] };
}

export async function updateSettings(settings: PanelSettings): Promise<void> {
  unwrap(
    await db().from('panel_settings').upsert({ id: 1, ...settings, updated_at: new Date().toISOString() }),
    'update panel settings'
  );
}

// --- Users ------------------------------------------------------------------

export async function getUser(clerkUserId: string): Promise<PanelUser | null> {
  return unwrap(
    await db().from('panel_users').select('*').eq('clerk_user_id', clerkUserId).maybeSingle(),
    'read user'
  );
}

export async function insertUser(user: Pick<PanelUser, 'clerk_user_id' | 'email' | 'name'> & Partial<PanelUser>): Promise<PanelUser> {
  // ignoreDuplicates: a concurrent request may have inserted the same user.
  unwrap(await db().from('panel_users').upsert(user, { onConflict: 'clerk_user_id', ignoreDuplicates: true }), 'create user');
  const row = await getUser(user.clerk_user_id);
  if (!row) throw new Error('Failed to create user');
  return row;
}

export async function updateUser(clerkUserId: string, fields: Partial<Omit<PanelUser, 'clerk_user_id' | 'created_at'>>): Promise<void> {
  unwrap(await db().from('panel_users').update(fields).eq('clerk_user_id', clerkUserId), 'update user');
}

export async function listUsers(): Promise<PanelUser[]> {
  return unwrap(await db().from('panel_users').select('*').order('created_at', { ascending: false }), 'list users') || [];
}

export function effectiveLimits(user: PanelUser, settings: PanelSettings): Limits {
  const domains = new Set([...settings.open_domains, ...user.extra_domains].map((d) => d.toLowerCase()));
  return {
    maxMailboxes: user.max_mailboxes ?? settings.default_max_mailboxes,
    requiresApproval: user.requires_approval ?? settings.default_requires_approval,
    allowedDomains: Array.from(domains).sort(),
  };
}

// --- Mailbox ownership ------------------------------------------------------

export async function getOwner(mailbox: string): Promise<string | null> {
  const row = unwrap(
    await db().from('mailbox_owners').select('clerk_user_id').eq('mailbox', mailbox).maybeSingle(),
    'read mailbox owner'
  );
  return row?.clerk_user_id ?? null;
}

export async function listOwnedMailboxes(clerkUserId: string): Promise<string[]> {
  const rows = unwrap(
    await db().from('mailbox_owners').select('mailbox').eq('clerk_user_id', clerkUserId).order('mailbox'),
    'list mailboxes'
  );
  return (rows || []).map((r: { mailbox: string }) => r.mailbox);
}

export async function listAllOwners(): Promise<{ mailbox: string; clerk_user_id: string }[]> {
  return unwrap(await db().from('mailbox_owners').select('mailbox, clerk_user_id'), 'list mailbox owners') || [];
}

export async function setOwner(mailbox: string, clerkUserId: string | null): Promise<void> {
  if (clerkUserId) {
    unwrap(await db().from('mailbox_owners').upsert({ mailbox, clerk_user_id: clerkUserId }), 'assign mailbox');
  } else {
    unwrap(await db().from('mailbox_owners').delete().eq('mailbox', mailbox), 'unassign mailbox');
  }
}

// --- Requests ---------------------------------------------------------------

export async function createRequest(clerkUserId: string, mailbox: string, note: string | null): Promise<MailboxRequest> {
  const result = await db().from('mailbox_requests').insert({ clerk_user_id: clerkUserId, mailbox, note }).select().single();
  if (result.error?.code === '23505') {
    throw new ApiError('Someone has already requested this address', 409, 'address_requested');
  }
  return unwrap(result, 'create request');
}

export async function getRequest(id: string): Promise<MailboxRequest | null> {
  return unwrap(await db().from('mailbox_requests').select('*').eq('id', id).maybeSingle(), 'read request');
}

export async function listRequests(filter: { clerkUserId?: string; status?: string }): Promise<MailboxRequest[]> {
  let query = db().from('mailbox_requests').select('*').order('created_at', { ascending: false }).limit(200);
  if (filter.clerkUserId) query = query.eq('clerk_user_id', filter.clerkUserId);
  if (filter.status) query = query.eq('status', filter.status);
  return unwrap(await query, 'list requests') || [];
}

export async function countPendingRequests(clerkUserId: string): Promise<number> {
  const { count, error } = await db()
    .from('mailbox_requests')
    .select('id', { count: 'exact', head: true })
    .eq('clerk_user_id', clerkUserId)
    .eq('status', 'pending');
  if (error) throw new Error(`Failed to count requests: ${error.message}`);
  return count || 0;
}

export async function updateRequest(id: string, fields: Partial<MailboxRequest>): Promise<void> {
  unwrap(await db().from('mailbox_requests').update(fields).eq('id', id), 'update request');
}

export async function deleteRequestsFor(mailbox: string): Promise<void> {
  unwrap(await db().from('mailbox_requests').delete().eq('mailbox', mailbox), 'delete requests');
}

// --- Audit log --------------------------------------------------------------

export async function audit(actor: string, action: string, target: string | null, details?: Record<string, unknown>): Promise<void> {
  // Never let logging break the action itself.
  const { error } = await db().from('audit_log').insert({ actor, action, target, details: details ?? null });
  if (error) console.warn('Audit log write failed:', error.message);
}

export async function listAudit(limit = 100) {
  return unwrap(await db().from('audit_log').select('*').order('created_at', { ascending: false }).limit(limit), 'read audit log') || [];
}
