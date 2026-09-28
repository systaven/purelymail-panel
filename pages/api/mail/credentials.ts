import { revokeAppPassword } from '@/lib/mail/credentials';
import { mailHandler, requireMailbox } from '@/lib/mail/route';

export default mailHandler({
  // Deletes the panel's app password for a mailbox (in PurelyMail and Supabase).
  // A new one is created automatically the next time the mailbox is opened.
  DELETE: async (req, res, session) => {
    await revokeAppPassword(await requireMailbox(session, req.body?.mailbox));
    res.status(200).json({ success: true });
  },
});
