import { apiHandler } from '@/lib/api';
import { listAllOwners } from '@/lib/accounts';
import { getPurelyMail } from '@/lib/purelymail';

// Mailboxes the caller can open on the Mail page: their own, plus unowned ones
// for admins. Other people's mailboxes are private, even to admins.
export default apiHandler('user', {
  GET: async (req, res, session) => {
    const owners = await listAllOwners();
    const mine = owners.filter((o) => o.clerk_user_id === session.clerkUserId).map((o) => o.mailbox);
    let names = mine;
    if (session.role === 'admin') {
      const owned = new Set(owners.map((o) => o.mailbox));
      const unowned = (await getPurelyMail().listUserNames()).map((n) => n.toLowerCase()).filter((n) => !owned.has(n));
      names = [...unowned, ...mine];
    }
    res.status(200).json(Array.from(new Set(names)).sort());
  },
});
