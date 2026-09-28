import { ApiError, apiHandler, requireString } from '@/lib/api';
import { audit, getSettings, getUser, listAllOwners, listRequests, listUsers, updateUser } from '@/lib/accounts';
import { effectiveLimits } from '@/lib/accounts';

export default apiHandler('admin', {
  // All Clerk users with their limits, owned mailboxes and pending requests.
  GET: async (req, res) => {
    const [users, owners, pending, settings] = await Promise.all([
      listUsers(),
      listAllOwners(),
      listRequests({ status: 'pending' }),
      getSettings(),
    ]);
    res.status(200).json(users.map((u) => ({
      ...u,
      limits: effectiveLimits(u, settings),
      mailboxes: owners.filter((o) => o.clerk_user_id === u.clerk_user_id).map((o) => o.mailbox).sort(),
      pendingRequests: pending.filter((r) => r.clerk_user_id === u.clerk_user_id).length,
    })));
  },

  // { clerk_user_id, role?, disabled?, max_mailboxes?, requires_approval?, extra_domains? }
  // max_mailboxes / requires_approval set to null go back to the defaults.
  PATCH: async (req, res, session) => {
    const id = requireString(req.body?.clerk_user_id, 'user');
    if (!(await getUser(id))) {
      throw new ApiError('User not found', 404, 'user_not_found');
    }
    const body = req.body || {};
    const fields: Record<string, unknown> = {};
    if (body.role !== undefined) {
      if (body.role !== 'guest' && body.role !== 'admin') throw new ApiError('Invalid role', 400);
      if (body.role === 'guest' && id === session.clerkUserId && session.via === 'clerk') {
        throw new ApiError("You can't remove your own admin role", 400, 'cannot_demote_self');
      }
      fields.role = body.role;
    }
    if (body.disabled !== undefined) {
      if (body.disabled && id === session.clerkUserId && session.via === 'clerk') {
        throw new ApiError("You can't disable yourself", 400, 'cannot_disable_self');
      }
      fields.disabled = Boolean(body.disabled);
    }
    if (body.max_mailboxes !== undefined) {
      const n = body.max_mailboxes === null ? null : Number(body.max_mailboxes);
      if (n !== null && (!Number.isInteger(n) || n < 0)) throw new ApiError('Invalid mailbox limit', 400);
      fields.max_mailboxes = n;
    }
    if (body.requires_approval !== undefined) {
      fields.requires_approval = body.requires_approval === null ? null : Boolean(body.requires_approval);
    }
    if (body.extra_domains !== undefined) {
      if (!Array.isArray(body.extra_domains)) throw new ApiError('extra_domains must be a list', 400);
      fields.extra_domains = body.extra_domains.map((d: unknown) => String(d).trim().toLowerCase()).filter(Boolean);
    }
    await updateUser(id, fields);
    await audit(session.actor, 'user.update', id, fields);
    res.status(200).json({ success: true });
  },
});
