import type { CalendarEvent } from '@/components/dav/api';
import { useLocale, useT } from '@/lib/i18n';
import { calendarMessages } from '@/lib/i18n/messages/calendar';
import { chipStyle, dayKey, formatTime, isMultiDay } from './dates';

// One event in a month-grid day: all-day and multi-day events as a tinted bar,
// timed ones as a dot, start time and title.
export default function EventChip({
  event,
  day,
  color,
  onClick,
}: {
  event: CalendarEvent;
  day: string;
  color: string | null;
  onClick: (event: CalendarEvent) => void;
}) {
  const t = useT(calendarMessages);
  const { locale } = useLocale();
  const title = event.summary || t('untitled');
  const filled = event.allDay || isMultiDay(event);
  const showTime = !event.allDay && dayKey(new Date(event.start)) === day;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(event);
      }}
      title={title}
      className={`flex w-full min-w-0 items-center gap-1 rounded px-1 py-px text-left text-[11px] leading-4 sm:text-xs ${
        filled
          ? `border-l-2 font-medium text-gray-900 ${color ? '' : 'border-primary-500 bg-primary-100'}`
          : 'text-gray-700 hover:bg-gray-100'
      }`}
      style={filled ? chipStyle(color, true) : undefined}
    >
      {!filled && (
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${color ? '' : 'bg-primary-500'}`}
          style={chipStyle(color, false)}
        />
      )}
      {showTime && <span className="hidden shrink-0 text-gray-500 sm:inline">{formatTime(event.start, locale)}</span>}
      <span className="truncate">{title}</span>
    </button>
  );
}
