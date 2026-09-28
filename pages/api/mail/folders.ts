import { listFolders } from '@/lib/mail/operations';
import { mailHandler, openMailbox } from '@/lib/mail/route';

export default mailHandler({
  GET: async (req, res, session) => {
    const folders = await listFolders(await openMailbox(session, req.query.mailbox, req, res));
    res.status(200).json(folders);
  },
});
