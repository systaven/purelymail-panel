import { apiHandler } from '@/lib/api';
import { listOwnedMailboxes } from '@/lib/accounts';
import { getPurelyMail } from '@/lib/purelymail';

// Mailboxes the caller can open on the Mail page.
export default apiHandler('user', {
  GET: async (req, res, session) => {
    const names = session.role === 'admin'
      ? await getPurelyMail().listUserNames()
      : await listOwnedMailboxes(session.clerkUserId!);
    res.status(200).json(names.map((n) => n.toLowerCase()).sort());
  },
});
