import { withDav } from '@/lib/dav/client';
import { listAddressBooks } from '@/lib/dav/contacts';
import { mailHandler, openMailbox } from '@/lib/mail/route';

export default mailHandler({
  GET: async (req, res, session) => {
    const box = await openMailbox(session, req.query.mailbox, req, res);
    res.status(200).json(await withDav(box, listAddressBooks));
  },
});
