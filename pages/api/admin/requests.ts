import { ApiError, apiHandler, requireString } from '@/lib/api';
import { audit, getRequest, listRequests, updateRequest } from '@/lib/accounts';
import { createMailboxFor } from '@/lib/provisioning';

export default apiHandler('admin', {
  GET: async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.status(200).json(await listRequests({ status }));
  },

  // { id, decision: 'approve' | 'reject', note? }
  POST: async (req, res, session) => {
    const request = await getRequest(requireString(req.body?.id, 'request id'));
    if (!request) throw new ApiError('Request not found', 404);
    if (request.status !== 'pending') throw new ApiError('This request was already handled', 400);
    const decision = req.body?.decision;
    if (decision !== 'approve' && decision !== 'reject') throw new ApiError('Invalid decision', 400);
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) || null : null;

    if (decision === 'approve') {
      await createMailboxFor(request.clerk_user_id, request.mailbox, session.actor);
    }
    await updateRequest(request.id, {
      status: decision === 'approve' ? 'approved' : 'rejected',
      decision_note: note,
      decided_at: new Date().toISOString(),
    });
    await audit(session.actor, `request.${decision}`, request.mailbox, { user: request.clerk_user_id, note });
    res.status(200).json({ success: true });
  },
});
