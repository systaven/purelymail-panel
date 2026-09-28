import { ApiError, apiHandler } from '@/lib/api';
import { audit, createRequest } from '@/lib/accounts';
import { requireMailbox } from '@/lib/mail/route';
import { checkNewAddress, createMailboxFor, deleteMailbox, getUsage } from '@/lib/provisioning';

export default apiHandler('user', {
  // { localPart, domain, note? }: creates the mailbox right away, or files a
  // request for the admin if this user needs approval.
  POST: async (req, res, session) => {
    if (!session.user) {
      throw new ApiError('Create mailboxes for the account on the Users page', 400);
    }
    const usage = await getUsage(session.user);
    const address = checkNewAddress(req.body?.localPart, req.body?.domain, usage);
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) || null : null;

    if (usage.limits.requiresApproval && session.role !== 'admin') {
      const request = await createRequest(session.user.clerk_user_id, address, note);
      await audit(session.actor, 'request.create', address);
      return res.status(200).json({ requested: true, request });
    }
    await createMailboxFor(session.user.clerk_user_id, address, session.actor);
    res.status(200).json({ created: true, mailbox: address });
  },

  DELETE: async (req, res, session) => {
    await deleteMailbox(await requireMailbox(session, req.body?.mailbox), session.actor);
    res.status(200).json({ success: true });
  },
});
