import { ApiError, apiHandler, requireEmail } from '@/lib/api';
import { getOwner } from '@/lib/accounts';
import { getPurelyMail } from '@/lib/purelymail';

export default apiHandler('admin', {
  POST: async (req, res) => {
    const { userName, method } = req.body || {};
    const mailbox = requireEmail(userName);
    // A recovery address would let the admin reset a private mailbox's password.
    if (await getOwner(mailbox)) {
      throw new ApiError('This mailbox is private to its owner', 403, 'mailbox_private');
    }
    await getPurelyMail().upsertPasswordReset(mailbox, method);
    res.status(200).json({ success: true, message: 'Password reset method configured' });
  },
});
