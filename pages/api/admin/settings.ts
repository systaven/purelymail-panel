import { ApiError, apiHandler, requireInt } from '@/lib/api';
import { audit, getSettings, updateSettings } from '@/lib/accounts';

export default apiHandler('admin', {
  GET: async (req, res) => {
    res.status(200).json(await getSettings());
  },
  PUT: async (req, res, session) => {
    const { default_max_mailboxes, default_requires_approval, open_domains } = req.body || {};
    if (!Array.isArray(open_domains)) {
      throw new ApiError('open_domains must be a list', 400);
    }
    const settings = {
      default_max_mailboxes: requireInt(default_max_mailboxes, 'default mailbox limit'),
      default_requires_approval: Boolean(default_requires_approval),
      open_domains: open_domains.map((d: unknown) => String(d).trim().toLowerCase()).filter(Boolean),
    };
    await updateSettings(settings);
    await audit(session.actor, 'settings.update', null, settings);
    res.status(200).json({ success: true });
  },
});
