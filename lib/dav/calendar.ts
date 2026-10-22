import { randomUUID } from 'crypto';
import ICAL from 'ical.js';
import { ApiError } from '@/lib/errors';
import { DavContext, resourceTypes, text } from './client';

export interface CalendarInfo {
  href: string;
  name: string;
  color: string | null;
}

export interface CalendarEvent {
  // Unique per occurrence: recurring events appear once per instance.
  id: string;
  href: string;
  etag: string | null;
  calendar: string;
  uid: string;
  summary: string;
  location: string;
  description: string;
  start: string; // ISO date-time, or YYYY-MM-DD for all-day events
  end: string;
  allDay: boolean;
  recurring: boolean;
}

export interface EventInput {
  summary: string;
  location?: string;
  description?: string;
  start: string;
  end: string;
  allDay: boolean;
}

const MAX_OCCURRENCES = 500;

// All-day events are given to the client with an inclusive last day (DTEND is
// exclusive); applyInput turns it back.
function lastDay(start: ICAL.Time, end: ICAL.Time): string {
  const last = end.clone();
  last.adjust(-1, 0, 0, 0);
  return last.compare(start) < 0 ? start.toString() : last.toString();
}

export async function listCalendars({ dav, homes }: DavContext): Promise<CalendarInfo[]> {
  // Calendars are recognised by resourcetype alone: PurelyMail doesn't report
  // supported-calendar-component-set (purelymail-issues#421), which makes
  // stricter CalDAV libraries find no calendars at all.
  const entries = await dav.propfind(
    homes.calendars,
    1,
    '<d:resourcetype/><d:displayname/><a:calendar-color/>'
  );
  return entries
    .filter((e) => resourceTypes(e.props).includes('calendar'))
    .map((e) => {
      const path = e.href.endsWith('/') ? e.href : `${e.href}/`;
      const segment = path.split('/').filter(Boolean).pop() || '';
      const color = text(e.props['calendar-color']);
      return {
        href: path,
        name: text(e.props.displayname) || segment,
        color: /^#[0-9a-f]{6}/i.test(color) ? color.slice(0, 7) : null,
      };
    });
}

function toIso(time: ICAL.Time): string {
  return time.isDate ? time.toString() : time.toJSDate().toISOString();
}

// Expands one calendar object (a master VEVENT plus any overridden instances)
// into the occurrences that overlap [from, to).
function occurrences(ics: string, href: string, etag: string | null, calendar: string, from: Date, to: Date): CalendarEvent[] {
  let vcalendar: ICAL.Component;
  try {
    vcalendar = new ICAL.Component(ICAL.parse(ics));
  } catch {
    return [];
  }
  const vevents = vcalendar.getAllSubcomponents('vevent');
  const master = vevents.find((v) => !v.hasProperty('recurrence-id')) || vevents[0];
  if (!master) return [];
  const event = new ICAL.Event(master);
  for (const v of vevents) {
    if (v !== master) event.relateException(v);
  }

  const base = {
    href,
    etag,
    calendar,
    uid: event.uid || href,
  };
  const describe = (details: { item: ICAL.Event; startDate: ICAL.Time; endDate: ICAL.Time }, recurring: boolean, id: string): CalendarEvent => ({
    ...base,
    id,
    summary: details.item.summary || '',
    location: details.item.location || '',
    description: details.item.description || '',
    start: toIso(details.startDate),
    end: details.startDate.isDate ? lastDay(details.startDate, details.endDate) : toIso(details.endDate),
    allDay: details.startDate.isDate,
    recurring,
  });
  const overlaps = (start: ICAL.Time, end: ICAL.Time) => start.toJSDate() < to && end.toJSDate() > from;

  if (!event.isRecurring()) {
    const endDate = event.endDate || event.startDate;
    return overlaps(event.startDate, endDate)
      ? [describe({ item: event, startDate: event.startDate, endDate }, false, href)]
      : [];
  }

  const result: CalendarEvent[] = [];
  const iterator = event.iterator();
  for (let next = iterator.next(), count = 0; next && count < MAX_OCCURRENCES; next = iterator.next(), count++) {
    if (next.toJSDate() >= to) break;
    const details = event.getOccurrenceDetails(next);
    if (overlaps(details.startDate, details.endDate)) {
      result.push(describe(details, true, `${href}#${details.recurrenceId.toString()}`));
    }
  }
  return result;
}

// DTSTAMP and friends must be UTC; ICAL.Time.now() is floating local time.
const utcNow = () => ICAL.Time.fromJSDate(new Date(), true);

const icalUtc = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export async function listEvents(ctx: DavContext, calendarHref: string, from: Date, to: Date): Promise<CalendarEvent[]> {
  const calendar = ctx.resolve(calendarHref, 'calendars');
  const entries = await ctx.dav.multiStatus('REPORT', calendar, 1, `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
<d:prop><d:getetag/><c:calendar-data/></d:prop>
<c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT">
<c:time-range start="${icalUtc(from)}" end="${icalUtc(to)}"/>
</c:comp-filter></c:comp-filter></c:filter>
</c:calendar-query>`);
  return entries
    .flatMap((e) => {
      const ics = text(e.props['calendar-data']);
      return ics ? occurrences(ics, e.href, text(e.props.getetag) || null, calendar, from, to) : [];
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}

function setTime(vevent: ICAL.Component, name: 'dtstart' | 'dtend', value: string, allDay: boolean) {
  vevent.removeAllProperties(name);
  const time = allDay
    ? ICAL.Time.fromDateString(value.slice(0, 10))
    : ICAL.Time.fromJSDate(new Date(value), true);
  vevent.addPropertyWithValue(name, time);
}

function validate(input: EventInput) {
  const summary = String(input.summary ?? '').trim();
  if (!summary) throw new ApiError('Missing title', 400, 'missing_field', { name: 'summary' });
  const start = new Date(input.start);
  const end = new Date(input.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new ApiError('Invalid date', 400, 'invalid_date');
  if (input.allDay ? end < start : end <= start) throw new ApiError('The event must end after it starts', 400, 'end_before_start');
  return { ...input, summary };
}

function applyInput(vevent: ICAL.Component, input: EventInput) {
  vevent.updatePropertyWithValue('summary', input.summary);
  for (const [name, value] of [['location', input.location], ['description', input.description]] as const) {
    vevent.removeAllProperties(name);
    if (value?.trim()) vevent.addPropertyWithValue(name, value.trim());
  }
  setTime(vevent, 'dtstart', input.start, input.allDay);
  // All-day events end on the following day (DTEND is exclusive).
  if (input.allDay) {
    const end = new Date(`${input.end.slice(0, 10)}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    setTime(vevent, 'dtend', end.toISOString(), true);
  } else {
    setTime(vevent, 'dtend', input.end, false);
  }
  vevent.updatePropertyWithValue('dtstamp', utcNow());
  vevent.updatePropertyWithValue('last-modified', utcNow());
  const sequence = Number(vevent.getFirstPropertyValue('sequence') || 0);
  vevent.updatePropertyWithValue('sequence', sequence + 1);
}

export async function createEvent(ctx: DavContext, calendarHref: string, raw: EventInput): Promise<void> {
  const input = validate(raw);
  const calendar = ctx.resolve(calendarHref, 'calendars');
  const uid = randomUUID();
  const vcalendar = new ICAL.Component('vcalendar');
  vcalendar.updatePropertyWithValue('prodid', '-//PurelyMail Panel//EN');
  vcalendar.updatePropertyWithValue('version', '2.0');
  const vevent = new ICAL.Component('vevent');
  vevent.updatePropertyWithValue('uid', uid);
  vevent.updatePropertyWithValue('created', utcNow());
  applyInput(vevent, input);
  vevent.updatePropertyWithValue('sequence', 0);
  vcalendar.addSubcomponent(vevent);
  await ctx.dav.put(`${calendar}${uid}.ics`, vcalendar.toString(), 'text/calendar');
}

async function fetchObject(ctx: DavContext, path: string): Promise<{ ics: string; etag: string | null }> {
  const res = await ctx.dav.request('GET', path);
  if (res.status === 404) throw new ApiError('This event no longer exists', 404, 'dav_not_found');
  if (!res.ok) throw new ApiError('The calendar server returned an error', 502, 'dav_failed');
  return { ics: await res.text(), etag: res.headers.get('etag') };
}

// Edits an event. For a recurring event this changes the whole series, keeping
// its recurrence rule and moving it by the same amount as the edited occurrence.
export async function updateEvent(ctx: DavContext, href: string, etag: string | undefined, raw: EventInput): Promise<void> {
  const input = validate(raw);
  const path = ctx.resolve(href, 'calendars');
  const current = await fetchObject(ctx, path);
  const vcalendar = new ICAL.Component(ICAL.parse(current.ics));
  const master = vcalendar.getAllSubcomponents('vevent').find((v) => !v.hasProperty('recurrence-id'));
  if (!master) throw new ApiError('This event no longer exists', 404, 'dav_not_found');
  if (master.hasProperty('rrule')) {
    // Keep the series' own dates; only the text fields change.
    master.updatePropertyWithValue('summary', input.summary);
    for (const [name, value] of [['location', input.location], ['description', input.description]] as const) {
      master.removeAllProperties(name);
      if (value?.trim()) master.addPropertyWithValue(name, value.trim());
    }
    master.updatePropertyWithValue('dtstamp', utcNow());
  } else {
    applyInput(master, input);
  }
  await ctx.dav.put(path, vcalendar.toString(), 'text/calendar', etag || current.etag || undefined);
}

export async function deleteEvent(ctx: DavContext, href: string, etag?: string): Promise<void> {
  await ctx.dav.remove(ctx.resolve(href, 'calendars'), etag);
}
