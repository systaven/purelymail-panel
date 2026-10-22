import { ApiError, requireString } from '@/lib/api';
import { createEvent, deleteEvent, listEvents, updateEvent } from '@/lib/dav/calendar';
import { withDav } from '@/lib/dav/client';
import { mailHandler, openMailbox } from '@/lib/mail/route';

// Longest range one request may ask for; the calendar UI asks for a month view
// plus padding.
const MAX_RANGE_DAYS = 100;

function requireDate(value: unknown, name: string): Date {
  const date = new Date(requireString(value, name));
  if (Number.isNaN(date.getTime())) throw new ApiError(`Invalid ${name}`, 400);
  return date;
}

const etagOf = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

export default mailHandler({
  GET: async (req, res, session) => {
    const box = await openMailbox(session, req.query.mailbox, req, res);
    const calendar = requireString(req.query.calendar, 'calendar');
    const from = requireDate(req.query.start, 'start');
    const to = requireDate(req.query.end, 'end');
    if (to <= from || to.getTime() - from.getTime() > MAX_RANGE_DAYS * 86_400_000) {
      throw new ApiError('Invalid date range', 400);
    }
    res.status(200).json(await withDav(box, (ctx) => listEvents(ctx, calendar, from, to)));
  },
  POST: async (req, res, session) => {
    const box = await openMailbox(session, req.body?.mailbox, req, res);
    const calendar = requireString(req.body?.calendar, 'calendar');
    await withDav(box, (ctx) => createEvent(ctx, calendar, req.body?.event || {}));
    res.status(200).json({ success: true });
  },
  PUT: async (req, res, session) => {
    const box = await openMailbox(session, req.body?.mailbox, req, res);
    const href = requireString(req.body?.href, 'href');
    await withDav(box, (ctx) => updateEvent(ctx, href, etagOf(req.body?.etag), req.body?.event || {}));
    res.status(200).json({ success: true });
  },
  DELETE: async (req, res, session) => {
    const box = await openMailbox(session, req.body?.mailbox, req, res);
    const href = requireString(req.body?.href, 'href');
    await withDav(box, (ctx) => deleteEvent(ctx, href, etagOf(req.body?.etag)));
    res.status(200).json({ success: true });
  },
});
