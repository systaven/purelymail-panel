import type { CSSProperties } from 'react';
import type { CalendarEvent } from '@/components/dav/api';

// Local-time date helpers. Days are keyed as YYYY-MM-DD in the viewer's zone,
// the same form the server uses for all-day events.

const pad = (n: number) => String(n).padStart(2, '0');

export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

// Sunday for English, Monday for the others.
export const weekStartFor = (locale: string) => (locale === 'en' ? 0 : 1);

export const GRID_DAYS = 42;

// First day of the 6×7 grid that shows the given month.
export function gridStart(year: number, month: number, weekStart: number): Date {
  const first = new Date(year, month, 1);
  return addDays(first, -((first.getDay() - weekStart + 7) % 7));
}

// ISO date-time → value for <input type="datetime-local"> in local time.
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// The local days an event covers. A timed event ending exactly at midnight
// doesn't spill into the next day.
export function eventDayKeys(event: CalendarEvent): string[] {
  let first: Date;
  let last: Date;
  if (event.allDay) {
    first = parseDay(event.start);
    last = parseDay(event.end || event.start);
  } else {
    const start = new Date(event.start);
    const end = new Date(event.end || event.start);
    first = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const lastMoment = end > start ? new Date(end.getTime() - 1) : start;
    last = new Date(lastMoment.getFullYear(), lastMoment.getMonth(), lastMoment.getDate());
  }
  const keys: string[] = [];
  // Capped so a malformed event can't stall rendering.
  for (let d = first; d <= last && keys.length < 400; d = addDays(d, 1)) keys.push(dayKey(d));
  return keys.length ? keys : [dayKey(first)];
}

export const isMultiDay = (event: CalendarEvent) => eventDayKeys(event).length > 1;

// All-day and multi-day events first, then timed ones by start time.
function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
  const rank = (e: CalendarEvent) => (e.allDay || isMultiDay(e) ? 0 : 1);
  return rank(a) - rank(b) || new Date(a.start).getTime() - new Date(b.start).getTime() || a.summary.localeCompare(b.summary);
}

export function groupByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const days = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    for (const key of eventDayKeys(event)) {
      const list = days.get(key);
      if (list) list.push(event);
      else days.set(key, [event]);
    }
  }
  days.forEach((list) => list.sort(compareEvents));
  return days;
}

export const formatTime = (iso: string, locale: string) =>
  new Date(iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });

// "9:00 AM – 10:00 AM", "All day", or for an event spanning days the part that
// applies to `day`.
export function eventTimeLabel(event: CalendarEvent, day: string, locale: string, allDayText: string): string {
  if (event.allDay) return allDayText;
  const startDay = dayKey(new Date(event.start));
  const days = eventDayKeys(event);
  const endDay = days[days.length - 1];
  const start = startDay === day ? formatTime(event.start, locale) : '';
  const end = endDay === day ? formatTime(event.end, locale) : '';
  if (!start && !end) return allDayText;
  return `${start || '…'} – ${end || '…'}`;
}

// Chip colours: the calendar's own colour when it has one.
export function chipStyle(color: string | null, filled: boolean): CSSProperties | undefined {
  if (!color) return undefined;
  return filled ? { backgroundColor: `${color}33`, borderLeftColor: color } : { backgroundColor: color };
}
