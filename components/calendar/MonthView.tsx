import type { CalendarEvent } from '@/components/dav/api';
import { useLocale, useT } from '@/lib/i18n';
import { calendarMessages } from '@/lib/i18n/messages/calendar';
import { addDays, dayKey, GRID_DAYS } from './dates';
import EventChip from './EventChip';

const MAX_CHIPS = 3;

export default function MonthView({
  month,
  start,
  eventsByDay,
  color,
  onCreate,
  onOpen,
  onMore,
}: {
  month: number;
  start: Date; // first day of the grid
  eventsByDay: Map<string, CalendarEvent[]>;
  color: string | null;
  onCreate: (day: string) => void;
  onOpen: (event: CalendarEvent) => void;
  onMore: (day: string) => void;
}) {
  const t = useT(calendarMessages);
  const { locale } = useLocale();
  const today = dayKey(new Date());
  const days = Array.from({ length: GRID_DAYS }, (_, i) => addDays(start, i));

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-surface shadow-sm">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {days.slice(0, 7).map((d) => (
          <div key={d.getDay()} className="truncate px-1 py-1.5 text-center text-xs font-medium text-gray-500 sm:px-2">
            <span className="sm:hidden">{d.toLocaleDateString(locale, { weekday: 'narrow' })}</span>
            <span className="hidden sm:inline">{d.toLocaleDateString(locale, { weekday: 'short' })}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((d, i) => {
          const key = dayKey(d);
          const events = eventsByDay.get(key) || [];
          const overflow = events.length > MAX_CHIPS;
          const shown = overflow ? events.slice(0, MAX_CHIPS - 1) : events;
          const inMonth = d.getMonth() === month;
          const isToday = key === today;
          return (
            <div
              key={key}
              onClick={() => onCreate(key)}
              className={`flex min-h-[4.5rem] min-w-0 cursor-pointer flex-col gap-0.5 p-0.5 hover:bg-gray-50 sm:min-h-[6.5rem] sm:p-1 ${
                i % 7 ? 'border-l border-gray-200' : ''
              } ${i >= 7 ? 'border-t border-gray-200' : ''} ${inMonth ? '' : 'bg-gray-50/60'}`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreate(key);
                }}
                aria-label={`${t('newEvent')}: ${d.toLocaleDateString(locale, { dateStyle: 'full' })}`}
                className={`mx-auto flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1 text-xs sm:ml-0 sm:mr-auto ${
                  isToday
                    ? 'bg-primary-600 font-semibold text-white'
                    : inMonth
                      ? 'text-gray-900 hover:bg-gray-200'
                      : 'text-gray-400 hover:bg-gray-200'
                }`}
              >
                {d.getDate()}
              </button>
              {shown.map((event) => (
                <EventChip key={event.id} event={event} day={key} color={color} onClick={onOpen} />
              ))}
              {overflow && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMore(key);
                  }}
                  className="truncate rounded px-1 text-left text-[11px] font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 sm:text-xs"
                >
                  {t('moreEvents', { n: events.length - shown.length })}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
