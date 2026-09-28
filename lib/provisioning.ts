import { randomBytes } from 'crypto';
import { ApiError } from './errors';
import {
  audit,
  countPendingRequests,
  effectiveLimits,
  getSettings,
  Limits,
  listOwnedMailboxes,
  PanelUser,
  setOwner,
} from './accounts';
import { forgetAppPassword } from './mail/credentials';
import { getPurelyMail } from './purelymail';

// Creating and deleting mailboxes on behalf of guests, with their limits.

// Addresses guests may never take: role accounts that mail systems and
// certificate authorities rely on, or that could be used to impersonate staff.
const RESERVED_LOCAL_PARTS = new Set([
  'abuse', 'admin', 'administrator', 'hostmaster', 'info', 'mailer-daemon', 'no-reply', 'noc',
  'noreply', 'postmaster', 'root', 'security', 'ssl-admin', 'support', 'webmaster', 'www',
]);

const LOCAL_PART_RE = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;

export interface Usage {
  owned: string[];
  pendingRequests: number;
  limits: Limits;
}

export async function getUsage(user: PanelUser): Promise<Usage> {
  const [owned, pendingRequests, settings] = await Promise.all([
    listOwnedMailboxes(user.clerk_user_id),
    countPendingRequests(user.clerk_user_id),
    getSettings(),
  ]);
  return { owned, pendingRequests, limits: effectiveLimits(user, settings) };
}

// Builds and checks an address a guest wants: format, reserved names, allowed
// domains and quota (owned mailboxes plus pending requests).
export function checkNewAddress(localPart: unknown, domain: unknown, usage: Usage): string {
  const local = String(localPart ?? '').trim().toLowerCase();
  const dom = String(domain ?? '').trim().toLowerCase();
  if (!LOCAL_PART_RE.test(local) || local.includes('..')) {
    throw new ApiError('Use 1-64 letters, digits, dots, hyphens or underscores, starting and ending with a letter or digit', 400);
  }
  if (RESERVED_LOCAL_PARTS.has(local)) {
    throw new ApiError(`"${local}" is reserved`, 400);
  }
  if (!usage.limits.allowedDomains.includes(dom)) {
    throw new ApiError(`You can't create mailboxes on ${dom || 'that domain'}`, 403);
  }
  if (usage.owned.length + usage.pendingRequests >= usage.limits.maxMailboxes) {
    throw new ApiError(`You've reached your limit of ${usage.limits.maxMailboxes} mailbox(es)`, 403);
  }
  return `${local}@${dom}`;
}

// Creates a mailbox with a random password and assigns it to the guest. The
// guest can set their own password afterwards; webmail works immediately.
export async function createMailboxFor(ownerId: string, address: string, actor: string): Promise<void> {
  const existing = await getPurelyMail().listUserNames();
  if (existing.some((name) => name.toLowerCase() === address)) {
    throw new ApiError(`${address} already exists`, 409);
  }
  await getPurelyMail().createUser({
    userName: address,
    password: randomBytes(24).toString('base64url'),
    recoveryEnabled: false,
  });
  try {
    await setOwner(address, ownerId);
  } catch (error) {
    // Don't leave an ownerless mailbox behind that the guest can't see.
    await getPurelyMail().deleteUser(address).catch(() => {});
    throw error;
  }
  await audit(actor, 'mailbox.create', address, { owner: ownerId });
}

// Deletes a mailbox and everything the panel stored about it, including
// forwarding rules for the address.
export async function deleteMailbox(address: string, actor: string): Promise<void> {
  const api = getPurelyMail();
  await api.deleteUser(address);
  const [local, domain] = address.split('@');
  const rules = await api.listRoutingRules().catch(() => []);
  await Promise.all([
    ...rules
      .filter((r) => !r.prefix && r.matchUser.toLowerCase() === local && r.domainName.toLowerCase() === domain)
      .map((r) => api.deleteRoutingRule(r.id)),
    setOwner(address, null),
    forgetAppPassword(address),
  ]).catch((err) => console.warn(`Cleanup after deleting ${address} failed:`, err.message));
  await audit(actor, 'mailbox.delete', address);
}
