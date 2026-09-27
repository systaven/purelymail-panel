import { listFolders } from '@/lib/mail/operations';
import { mailHandler, requireMailbox } from '@/lib/mail/route';

export default mailHandler({
  GET: async (req, res) => {
    const folders = await listFolders(requireMailbox(req.query.mailbox));
    res.status(200).json(folders);
  },
});
