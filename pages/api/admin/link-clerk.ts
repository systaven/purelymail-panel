import { ApiError, apiHandler } from '@/lib/api';
import { audit, updateUser } from '@/lib/accounts';
import { ensureUser } from '@/lib/session';

// Linking: an admin signed in with the password who is also signed in to Clerk
// makes that Clerk account an admin, so they can sign in with Clerk later.
export default apiHandler('admin', {
  POST: async (req, res, session) => {
    if (session.via !== 'password') {
      throw new ApiError('Sign in with the admin password to link a Clerk account', 400, 'link_needs_password');
    }
    if (!session.clerkUserId) {
      throw new ApiError('Sign in to Clerk first', 400, 'link_needs_clerk');
    }
    const user = await ensureUser(session.clerkUserId);
    await updateUser(user.clerk_user_id, { role: 'admin', disabled: false });
    await audit('admin', 'admin.link_clerk', user.clerk_user_id, { email: user.email });
    res.status(200).json({ success: true, email: user.email });
  },
  // Turns the linked Clerk account back into a guest.
  DELETE: async (req, res, session) => {
    if (session.via !== 'password' || !session.clerkUserId) {
      throw new ApiError('Sign in with the admin password and the Clerk account to unlink it', 400, 'unlink_needs_both');
    }
    await updateUser(session.clerkUserId, { role: 'guest' });
    await audit('admin', 'admin.unlink_clerk', session.clerkUserId);
    res.status(200).json({ success: true });
  },
});
