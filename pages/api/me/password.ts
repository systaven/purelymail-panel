import { ApiError, apiHandler } from '@/lib/api';
import { audit } from '@/lib/accounts';
import { requireMailbox } from '@/lib/mail/route';
import { getPurelyMail } from '@/lib/purelymail';

// Sets the mailbox's own password, for use in IMAP/SMTP mail apps. The panel's
// webmail uses a separate app password and keeps working.
export default apiHandler('user', {
  POST: async (req, res, session) => {
    const mailbox = await requireMailbox(session, req.body?.mailbox);
    const password = req.body?.password;
    if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
      throw new ApiError('Password must be 10 to 128 characters', 400);
    }
    await getPurelyMail().modifyUser({ userName: mailbox, password });
    await audit(session.actor, 'mailbox.password', mailbox);
    res.status(200).json({ success: true });
  },
});
