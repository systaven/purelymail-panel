import { ArrowPathRoundedSquareIcon, MapPinIcon } from '@heroicons/react/24/outline';
import type { CalendarEvent } from '@/components/dav/api';
import { useLocale, useT } from '@/lib/i18n';
import { calendarMessages } from '@/lib/i18n/messages/calendar';
import { dayKey, eventTimeLabel, parseDay } from './dates';

// One event as a list row (agenda and a day's full list).
export function EventRow({
  event,
  day,
  color,
  onOpen,
}: {
  event: CalendarEvent;
  day: string;
  color: string | null;
  onOpen: (event: CalendarEvent) => void;
}) {
  const t = useT(calendarMessages);
  const { locale } = useLocale();
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className="flex w-full min-w-0 items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-gray-50"
    >
      <span
        className={`w-1 shrink-0 self-stretch rounded-full ${color ? '' : 'bg-primary-500'}`}
        style={color ? { backgroundColor: color } : undefined}
      />
      <span className="w-24 shrink-0 text-sm text-gray-500 sm:w-36">
        {eventTimeLabel(event, day, locale, t('allDay'))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-gray-900">{event.summary || t('untitled')}</span>
          {event.recurring && (
            <ArrowPathRoundedSquareIcon className="h-4 w-4 shrink-0 text-gray-400" title={t('repeats')} aria-label={t('repeats')} />
          )}
        </span>
        {event.location && (
          <span className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
            <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{event.location}</span>
          </span>
        )}
      </span>
    </button>
  );
}

export default function AgendaView({
  days,
  eventsByDay,
  color,
  emptyText,
  onOpen,
}: {
  days: string[];
  eventsByDay: Map<string, CalendarEvent[]>;
  color: string | null;
  emptyText: string;
  onOpen: (event: CalendarEvent) => void;
}) {
  const { locale } = useLocale();
  const today = dayKey(new Date());
  const withEvents = days.filter((d) => eventsByDay.get(d)?.length);

  if (!withEvents.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-surface p-8 text-center text-sm text-gray-500 shadow-sm">
        {emptyText}
      </div>
    );
  }

  return (
    <ol className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-surface shadow-sm">
      {withEvents.map((key) => {
        const date = parseDay(key);
        return (
          <li key={key} className="flex flex-col gap-1 p-2 sm:flex-row sm:gap-4 sm:p-3">
            <div className="flex shrink-0 items-baseline gap-2 px-3 pt-1 sm:w-32 sm:flex-col sm:gap-0 sm:px-0">
              <span
                className={`text-2xl font-semibold leading-none ${key === today ? 'text-primary-600' : 'text-gray-900'}`}
              >
                {date.getDate()}
              </span>
              <span className={`text-xs uppercase ${key === today ? 'text-primary-600' : 'text-gray-500'}`}>
                {date.toLocaleDateString(locale, { month: 'short', weekday: 'short' })}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              {eventsByDay.get(key)!.map((event) => (
                <EventRow key={event.id} event={event} day={key} color={color} onOpen={onOpen} />
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
