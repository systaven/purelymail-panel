import { requireString } from '@/lib/api';
import { withDav } from '@/lib/dav/client';
import { createContact, deleteContact, listContacts, updateContact } from '@/lib/dav/contacts';
import { mailHandler, openMailbox } from '@/lib/mail/route';

const etagOf = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

export default mailHandler({
  GET: async (req, res, session) => {
    const box = await openMailbox(session, req.query.mailbox, req, res);
    const book = requireString(req.query.book, 'book');
    res.status(200).json(await withDav(box, (ctx) => listContacts(ctx, book)));
  },
  POST: async (req, res, session) => {
    const box = await openMailbox(session, req.body?.mailbox, req, res);
    const book = requireString(req.body?.book, 'book');
    await withDav(box, (ctx) => createContact(ctx, book, req.body?.contact || {}));
    res.status(200).json({ success: true });
  },
  PUT: async (req, res, session) => {
    const box = await openMailbox(session, req.body?.mailbox, req, res);
    const href = requireString(req.body?.href, 'href');
    await withDav(box, (ctx) => updateContact(ctx, href, etagOf(req.body?.etag), req.body?.contact || {}));
    res.status(200).json({ success: true });
  },
  DELETE: async (req, res, session) => {
    const box = await openMailbox(session, req.body?.mailbox, req, res);
    const href = requireString(req.body?.href, 'href');
    await withDav(box, (ctx) => deleteContact(ctx, href, etagOf(req.body?.etag)));
    res.status(200).json({ success: true });
  },
});
