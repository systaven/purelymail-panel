import { ApiError, apiHandler, requireEmail, requireString } from '@/lib/api';
import { getOwner, getUser } from '@/lib/accounts';
import { getPurelyMail } from '@/lib/purelymail';
import { handOverMailbox } from '@/lib/provisioning';

// Gives an unowned mailbox to a user: { mailbox, clerk_user_id }. This is one
// way: the mailbox becomes private to that user and the admin loses access (its
// password is reset). Owned mailboxes can't be taken back or moved, only deleted.
export default apiHandler('admin', {
  PUT: async (req, res, session) => {
    const mailbox = requireEmail(req.body?.mailbox);
    const ownerId = requireString(req.body?.clerk_user_id, 'user');
    if (!(await getUser(ownerId))) {
      throw new ApiError('User not found', 404, 'user_not_found');
    }
    if (await getOwner(mailbox)) {
      throw new ApiError('This mailbox already belongs to someone; it can only be deleted', 409, 'mailbox_owned');
    }
    const names = await getPurelyMail().listUserNames();
    if (!names.some((n) => n.toLowerCase() === mailbox)) {
      throw new ApiError(`${mailbox} doesn't exist`, 404, 'mailbox_missing', { address: mailbox });
    }
    await handOverMailbox(mailbox, ownerId, session.actor);
    res.status(200).json({ success: true });
  },
});
