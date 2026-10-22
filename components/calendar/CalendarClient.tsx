import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { CalendarEvent, CalendarInfo, davApi, EventInput } from '@/components/dav/api';
import { useMailboxSelection } from '@/hooks/useMailboxSelection';
import { useLocale, useT } from '@/lib/i18n';
import { calendarMessages } from '@/lib/i18n/messages/calendar';
import { commonMessages } from '@/lib/i18n/messages/common';
import { useErrorText } from '@/lib/i18n/useErrorText';
import AgendaView from './AgendaView';
import { addDays, dayKey, GRID_DAYS, gridStart, groupByDay, weekStartFor } from './dates';
import DayModal from './DayModal';
import EventModal from './EventModal';
import MonthView from './MonthView';

type View = 'month' | 'agenda';

const lastCalendarKey = (mailbox: string) => `calendar:last:${mailbox}`;

function readLastCalendar(mailbox: string): string | null {
  try {
    return localStorage.getItem(lastCalendarKey(mailbox));
  } catch {
    return null;
  }
}

function writeLastCalendar(mailbox: string, href: string) {
  try {
    localStorage.setItem(lastCalendarKey(mailbox), href);
  } catch {
    // Not remembered; the first calendar opens next time.
  }
}

export default function CalendarClient() {
  const t = useT(calendarMessages);
  const tc = useT(commonMessages);
  const { locale } = useLocale();
  const errorText = useErrorText();
  const { mailboxes, mailbox, setMailbox, ready, error: setupError } = useMailboxSelection();

  const [calendars, setCalendars] = useState<CalendarInfo[] | null>(null);
  const [calendarHref, setCalendarHref] = useState('');
  const [calendarsError, setCalendarsError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [view, setView] = useState<View>('month');
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ event: CalendarEvent | null; day: string | null } | null>(null);
  const [dayList, setDayList] = useState<string | null>(null);

  // The month grid is too cramped on phones, so they start in the agenda.
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setView('agenda');
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setCalendars(null);
    setCalendarHref('');
    setEvents(null);
    setCalendarsError(null);
    davApi.calendars(mailbox)
      .then((list) => {
        if (cancelled) return;
        setCalendars(list);
        const last = readLastCalendar(mailbox);
        setCalendarHref(list.find((c) => c.href === last)?.href || list[0]?.href || '');
      })
      .catch((err) => { if (!cancelled) setCalendarsError(errorText(err)); });
    return () => { cancelled = true; };
  }, [mailbox, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const weekStart = weekStartFor(locale);
  const rangeStart = useMemo(() => gridStart(cursor.year, cursor.month, weekStart), [cursor, weekStart]);

  // Ignore responses that arrive after the user moved on.
  const eventsRequest = useRef(0);
  const loadEvents = useCallback(async () => {
    if (!ready || !calendarHref) return;
    const id = ++eventsRequest.current;
    setEventsLoading(true);
    setEventsError(null);
    try {
      const list = await davApi.events(mailbox, calendarHref, rangeStart, addDays(rangeStart, GRID_DAYS));
      if (id === eventsRequest.current) setEvents(list);
    } catch (err) {
      if (id === eventsRequest.current) setEventsError(errorText(err));
    } finally {
      if (id === eventsRequest.current) setEventsLoading(false);
    }
  }, [mailbox, ready, calendarHref, rangeStart, errorText]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const eventsByDay = useMemo(() => groupByDay(events || []), [events]);
  const calendar = calendars?.find((c) => c.href === calendarHref);
  const color = calendar?.color ?? null;

  const changeCalendar = (href: string) => {
    setCalendarHref(href);
    setEvents(null);
    writeLastCalendar(mailbox, href);
  };

  const moveMonth = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const goToday = () => {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
  };

  // The agenda lists the month's days, from today on in the current month.
  const today = new Date();
  const monthStart = new Date(cursor.year, cursor.month, 1);
  const monthEnd = new Date(cursor.year, cursor.month + 1, 1);
  const agendaFromToday = today >= monthStart && today < monthEnd;
  const agendaDays: string[] = [];
  for (
    let d = agendaFromToday ? new Date(today.getFullYear(), today.getMonth(), today.getDate()) : monthStart;
    d < monthEnd;
    d = addDays(d, 1)
  ) {
    agendaDays.push(dayKey(d));
  }

  const openEvent = (event: CalendarEvent) => {
    setDayList(null);
    setEditing({ event, day: null });
  };
  const createOn = (day: string | null) => {
    setDayList(null);
    setEditing({ event: null, day });
  };
  const closeDayList = useCallback(() => setDayList(null), []);

  const saveEvent = async (input: EventInput) => {
    const existing = editing?.event;
    if (existing) await davApi.updateEvent(mailbox, existing.href, existing.etag, input);
    else await davApi.createEvent(mailbox, calendarHref, input);
    toast.success(existing ? t('eventSaved') : t('eventCreated'));
    setEditing(null);
    loadEvents();
  };

  const deleteEvent = async () => {
    const existing = editing?.event;
    if (!existing) return;
    await davApi.deleteEvent(mailbox, existing.href, existing.etag);
    toast.success(t('eventDeleted'));
    setEditing(null);
    loadEvents();
  };

  if (setupError) {
    return <div className="rounded-md bg-red-50 p-4 text-red-700">{setupError}</div>;
  }

  const title = monthStart.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
  const hasCalendar = Boolean(calendarHref);
  const segment = (active: boolean) =>
    `px-3 py-1.5 text-sm font-medium transition-colors ${active ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {(mailboxes.length > 1 || (calendars?.length ?? 0) > 1) && (
        <div className="flex flex-wrap items-center gap-2">
          {mailboxes.length > 1 && (
            <select
              className="min-w-0 max-w-full rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm"
              value={mailbox}
              onChange={(e) => setMailbox(e.target.value)}
              aria-label={t('mailbox')}
            >
              {mailboxes.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          {calendars && calendars.length > 1 && (
            <select
              className="min-w-0 max-w-full rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm"
              value={calendarHref}
              onChange={(e) => changeCalendar(e.target.value)}
              aria-label={t('calendar')}
            >
              {calendars.map((c) => <option key={c.href} value={c.href}>{c.name}</option>)}
            </select>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <div className="flex items-center gap-1">
          <button onClick={goToday} className="btn-secondary px-3 py-1.5 text-sm">{t('today')}</button>
          <button onClick={() => moveMonth(-1)} className="btn-icon" aria-label={t('previousMonth')} title={t('previousMonth')}>
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button onClick={() => moveMonth(1)} className="btn-icon" aria-label={t('nextMonth')} title={t('nextMonth')}>
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
        <h1 className="min-w-0 truncate text-lg font-semibold text-gray-900 sm:text-2xl">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-surface shadow-sm" role="group" aria-label={t('view')}>
            <button onClick={() => setView('month')} className={segment(view === 'month')} aria-pressed={view === 'month'}>
              {t('month')}
            </button>
            <button onClick={() => setView('agenda')} className={`border-l border-gray-200 ${segment(view === 'agenda')}`} aria-pressed={view === 'agenda'}>
              {t('agenda')}
            </button>
          </div>
          <button onClick={loadEvents} className="btn-icon" disabled={!hasCalendar} aria-label={tc('refresh')} title={tc('refresh')}>
            <ArrowPathIcon className={`h-5 w-5 ${eventsLoading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => createOn(null)} className="btn-primary px-3 py-1.5 text-sm" disabled={!hasCalendar} aria-label={t('newEvent')}>
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('newEvent')}</span>
          </button>
        </div>
      </div>

      {calendarsError && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{calendarsError}</div>}
      {eventsError && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <span className="min-w-0">{eventsError}</span>
          <button onClick={loadEvents} className="shrink-0 font-medium hover:underline">{tc('retry')}</button>
        </div>
      )}

      {!calendars && !calendarsError ? (
        <div className="animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-surface p-3 shadow-sm">
          <div className="mb-3 h-4 w-full rounded bg-gray-100" />
          <div className="grid grid-cols-7 gap-1">
            {[...Array(35)].map((_, i) => <div key={i} className="h-14 rounded bg-gray-100 sm:h-20" />)}
          </div>
        </div>
      ) : calendars && !calendars.length ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-surface p-10 text-center shadow-sm">
          <CalendarDaysIcon className="h-10 w-10 text-gray-400" />
          <p className="text-sm text-gray-600">{t('noCalendars')}</p>
        </div>
      ) : calendars && view === 'month' ? (
        <div className={eventsLoading && !events ? 'opacity-60' : undefined}>
          <MonthView
            month={cursor.month}
            start={rangeStart}
            eventsByDay={eventsByDay}
            color={color}
            onCreate={createOn}
            onOpen={openEvent}
            onMore={setDayList}
          />
        </div>
      ) : calendars && events ? (
        <AgendaView
          days={agendaDays}
          eventsByDay={eventsByDay}
          color={color}
          emptyText={agendaFromToday ? t('noUpcomingEvents') : t('noEventsThisMonth')}
          onOpen={openEvent}
        />
      ) : calendars && !eventsError ? (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-surface p-4 shadow-sm">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-4 w-1/3 rounded bg-gray-200" />
              <div className="h-3 w-2/3 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : null}

      {dayList && (
        <DayModal
          day={dayList}
          events={eventsByDay.get(dayList) || []}
          color={color}
          onClose={closeDayList}
          onOpen={openEvent}
          onCreate={() => createOn(dayList)}
        />
      )}
      {editing && (
        <EventModal
          event={editing.event}
          day={editing.day}
          onClose={() => setEditing(null)}
          onSave={saveEvent}
          onDelete={deleteEvent}
        />
      )}
    </div>
  );
}
