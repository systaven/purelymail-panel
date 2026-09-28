import { ApiError, apiHandler, requireString } from '@/lib/api';
import { audit, getRequest, updateRequest } from '@/lib/accounts';

export default apiHandler('user', {
  // Cancels one of the caller's pending requests: { id }.
  DELETE: async (req, res, session) => {
    const request = await getRequest(requireString(req.body?.id, 'request id'));
    if (!request || request.clerk_user_id !== session.clerkUserId) {
      throw new ApiError('Request not found', 404, 'request_not_found');
    }
    if (request.status !== 'pending') {
      throw new ApiError('Only pending requests can be cancelled', 400, 'request_not_pending');
    }
    await updateRequest(request.id, { status: 'cancelled', decided_at: new Date().toISOString() });
    await audit(session.actor, 'request.cancel', request.mailbox);
    res.status(200).json({ success: true });
  },
});
