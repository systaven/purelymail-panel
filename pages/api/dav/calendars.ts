import { listCalendars } from '@/lib/dav/calendar';
import { withDav } from '@/lib/dav/client';
import { mailHandler, openMailbox } from '@/lib/mail/route';

export default mailHandler({
  GET: async (req, res, session) => {
    const box = await openMailbox(session, req.query.mailbox, req, res);
    res.status(200).json(await withDav(box, listCalendars));
  },
});
