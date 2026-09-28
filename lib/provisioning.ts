import { randomBytes } from 'crypto';
import { ApiError } from './errors';
import {
  audit,
  countPendingRequests,
  deleteRequestsFor,
  effectiveLimits,
  getSettings,
  Limits,
  listOwnedMailboxes,
  PanelUser,
  setOwner,
} from './accounts';
import { forgetAppPassword, revokeAppPassword as revokeSharedCredentials } from './mail/credentials';
import { getPurelyMail, RoutingRule } from './purelymail';

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

// Routing rules that would take mail addressed to `address` away from the
// mailbox: exact or prefix matches that aren't catch-alls (a catch-all never
// fires for an address that belongs to a user).
export function interceptingRules(rules: RoutingRule[], address: string): RoutingRule[] {
  const [local, domain] = address.split('@');
  return rules.filter((r) => {
    if (r.catchall || r.domainName.toLowerCase() !== domain) return false;
    const match = r.matchUser.toLowerCase();
    return r.prefix ? local.startsWith(match) : local === match;
  });
}

// The rules for exactly this address, i.e. its forwarding.
export function exactRules(rules: RoutingRule[], address: string): RoutingRule[] {
  const [local, domain] = address.split('@');
  return rules.filter((r) => !r.prefix && !r.catchall && r.matchUser.toLowerCase() === local && r.domainName.toLowerCase() === domain);
}

// Refuses to make a mailbox private while a broader rule (e.g. a prefix rule
// covering the whole domain) would still route its mail elsewhere.
async function assertNotIntercepted(address: string): Promise<RoutingRule[]> {
  const rules = await getPurelyMail().listRoutingRules();
  const broad = interceptingRules(rules, address).filter((r) => r.prefix);
  if (broad.length) {
    const r = broad[0];
    throw new ApiError(`${address} is covered by the routing rule for ${r.matchUser}*@${r.domainName}; change that rule first`, 409);
  }
  return exactRules(rules, address);
}

// Hands an existing mailbox to a user and cuts off the admin's access: the
// mailbox password is replaced with one nobody knows, password recovery
// methods and the admin's stored app password are removed, and forwarding set
// up for the address is deleted.
export async function handOverMailbox(address: string, ownerId: string, actor: string): Promise<void> {
  const api = getPurelyMail();
  const forwarding = await assertNotIntercepted(address);
  await revokeSharedCredentials(address);
  for (const rule of forwarding) {
    await api.deleteRoutingRule(rule.id);
  }
  // Recovery methods the admin set up could be used to reset the password.
  for (const method of await api.listPasswordReset(address)) {
    await api.deletePasswordReset(address, method.target);
  }
  await api.modifyUser({ userName: address, password: randomBytes(24).toString('base64url') });
  await setOwner(address, ownerId);
  await audit(actor, 'mailbox.assign', address, { owner: ownerId });
}

// Creates a mailbox with a random password and assigns it to the guest. The
// guest can set their own password afterwards; webmail works immediately.
export async function createMailboxFor(ownerId: string, address: string, actor: string): Promise<void> {
  const existing = await getPurelyMail().listUserNames();
  if (existing.some((name) => name.toLowerCase() === address)) {
    throw new ApiError(`${address} already exists`, 409);
  }
  if ((await assertNotIntercepted(address)).length) {
    throw new ApiError(`${address} has a routing rule; remove it first`, 409);
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

// Deletes a mailbox and everything the panel kept about it: forwarding rules,
// ownership, stored credentials and requests for the address. (PurelyMail
// deletes the mail and any app passwords with the user.)
export async function deleteMailbox(address: string, actor: string): Promise<void> {
  const api = getPurelyMail();
  await api.deleteUser(address);
  const rules = await api.listRoutingRules().catch(() => []);
  await Promise.all([
    ...exactRules(rules, address).map((r) => api.deleteRoutingRule(r.id)),
    setOwner(address, null),
    forgetAppPassword(address),
    deleteRequestsFor(address),
  ]).catch((err) => console.warn(`Cleanup after deleting ${address} failed:`, err.message));
  await audit(actor, 'mailbox.delete', address);
}
