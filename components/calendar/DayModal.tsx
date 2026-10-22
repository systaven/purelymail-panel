import { useEffect } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { CalendarEvent } from '@/components/dav/api';
import { useLocale, useT } from '@/lib/i18n';
import { calendarMessages } from '@/lib/i18n/messages/calendar';
import { commonMessages } from '@/lib/i18n/messages/common';
import { EventRow } from './AgendaView';
import { parseDay } from './dates';

// All events of one day, opened from "+N more" in the month grid.
export default function DayModal({
  day,
  events,
  color,
  onClose,
  onOpen,
  onCreate,
}: {
  day: string;
  events: CalendarEvent[];
  color: string | null;
  onClose: () => void;
  onOpen: (event: CalendarEvent) => void;
  onCreate: () => void;
}) {
  const t = useT(calendarMessages);
  const tc = useT(commonMessages);
  const { locale } = useLocale();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="day-modal-title" className="flex h-full w-full flex-col bg-surface shadow-xl sm:h-auto sm:max-h-[80vh] sm:max-w-md sm:rounded-lg">
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-5 py-3">
          <h2 id="day-modal-title" className="truncate text-lg font-semibold text-gray-900">
            {parseDay(day).toLocaleDateString(locale, { dateStyle: 'full' })}
          </h2>
          <div className="flex shrink-0 items-center">
            <button onClick={onCreate} className="btn-icon" aria-label={t('newEvent')} title={t('newEvent')}>
              <PlusIcon className="h-5 w-5" />
            </button>
            <button onClick={onClose} className="btn-icon -mr-2" aria-label={tc('close')}>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {events.length ? (
            events.map((event) => <EventRow key={event.id} event={event} day={day} color={color} onOpen={onOpen} />)
          ) : (
            <p className="p-6 text-center text-sm text-gray-500">{t('noEventsThisDay')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
