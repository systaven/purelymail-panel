import { apiHandler } from '@/lib/api';
import { listRequests } from '@/lib/accounts';
import { getUsage } from '@/lib/provisioning';

// The caller's own account: quota, allowed domains, mailboxes and requests.
export default apiHandler('user', {
  GET: async (req, res, session) => {
    if (!session.user) {
      // The password admin without a linked Clerk account has no guest profile.
      return res.status(200).json({ role: session.role, via: session.via, user: null });
    }
    const [usage, requests] = await Promise.all([
      getUsage(session.user),
      listRequests({ clerkUserId: session.user.clerk_user_id }),
    ]);
    res.status(200).json({
      role: session.role,
      via: session.via,
      user: { email: session.user.email, name: session.user.name },
      limits: usage.limits,
      mailboxes: usage.owned,
      pendingRequests: usage.pendingRequests,
      requests: requests.slice(0, 50),
    });
  },
});
