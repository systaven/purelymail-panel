import { applyAction, listMessages, MailError, MessageAction } from '@/lib/mail/operations';
import { mailHandler, requireMailbox, requireString, requireUid } from '@/lib/mail/route';

const ACTIONS: MessageAction[] = ['seen', 'unseen', 'flag', 'unflag', 'move', 'delete'];
const PAGE_SIZE = 50;

export default mailHandler({
  GET: async (req, res, session) => {
    const mailbox = await requireMailbox(session, req.query.mailbox);
    const folder = requireString(req.query.folder, 'folder');
    const page = Math.max(0, Number(req.query.page) || 0);
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const result = await listMessages(mailbox, folder, { page, pageSize: PAGE_SIZE, query: query || undefined });
    res.status(200).json(result);
  },

  // Bulk actions: { mailbox, folder, uids, action, target? }
  POST: async (req, res, session) => {
    const { mailbox, folder, uids, action, target } = req.body || {};
    if (!ACTIONS.includes(action)) {
      throw new MailError('Invalid action', 400);
    }
    if (!Array.isArray(uids) || uids.length === 0) {
      throw new MailError('No messages selected', 400);
    }
    await applyAction(
      await requireMailbox(session, mailbox),
      requireString(folder, 'folder'),
      uids.map((uid: unknown) => requireUid(uid)),
      action,
      action === 'move' ? requireString(target, 'target') : undefined
    );
    res.status(200).json({ success: true });
  },
});
