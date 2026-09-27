import { getMessage } from '@/lib/mail/operations';
import { mailHandler, requireMailbox, requireString, requireUid } from '@/lib/mail/route';

export default mailHandler({
  GET: async (req, res) => {
    const message = await getMessage(
      requireMailbox(req.query.mailbox),
      requireString(req.query.folder, 'folder'),
      requireUid(req.query.uid),
      { allowRemoteImages: req.query.images === '1' }
    );
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(message);
  },
});
