import { apiHandler } from '@/lib/api';
import { listAudit, listUsers } from '@/lib/accounts';

export default apiHandler('admin', {
  GET: async (req, res) => {
    const [entries, users] = await Promise.all([listAudit(200), listUsers()]);
    const label = new Map(users.map((u) => [u.clerk_user_id, u.email || u.name || u.clerk_user_id]));
    res.status(200).json(entries.map((e: any) => ({
      ...e,
      actorLabel: e.actor === 'admin' ? 'Admin (password)' : label.get(e.actor) || e.actor,
    })));
  },
});
