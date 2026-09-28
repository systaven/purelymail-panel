import { ApiError, apiHandler, requireEmail } from '@/lib/api';
import { audit, getUser, setOwner } from '@/lib/accounts';
import { forgetAppPassword } from '@/lib/mail/credentials';
import { getPurelyMail } from '@/lib/purelymail';

// Assigns an existing mailbox to a user, or takes it back: { mailbox, clerk_user_id | null }.
export default apiHandler('admin', {
  PUT: async (req, res, session) => {
    const mailbox = requireEmail(req.body?.mailbox);
    const owner = req.body?.clerk_user_id ?? null;
    if (owner !== null && !(await getUser(String(owner)))) {
      throw new ApiError('User not found', 404);
    }
    const names = await getPurelyMail().listUserNames();
    if (!names.some((n) => n.toLowerCase() === mailbox)) {
      throw new ApiError(`${mailbox} doesn't exist`, 404);
    }
    await setOwner(mailbox, owner === null ? null : String(owner));
    await audit(session.actor, owner ? 'mailbox.assign' : 'mailbox.unassign', mailbox, { owner });
    res.status(200).json({ success: true });
  },
});
