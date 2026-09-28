import { getMessage } from '@/lib/mail/operations';
import { mailHandler, openMailbox, requireString, requireUid } from '@/lib/mail/route';

export default mailHandler({
  GET: async (req, res, session) => {
    const message = await getMessage(
      await openMailbox(session, req.query.mailbox, req, res),
      requireString(req.query.folder, 'folder'),
      requireUid(req.query.uid),
      { allowRemoteImages: req.query.images === '1' }
    );
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(message);
  },
});
