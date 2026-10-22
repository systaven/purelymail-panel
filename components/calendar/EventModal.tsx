import { useEffect, useRef, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { CalendarEvent, EventInput } from '@/components/dav/api';
import { useT } from '@/lib/i18n';
import { calendarMessages } from '@/lib/i18n/messages/calendar';
import { commonMessages } from '@/lib/i18n/messages/common';
import { useErrorText } from '@/lib/i18n/useErrorText';
import { addDays, dayKey, parseDay, toLocalInput } from './dates';

interface FormState {
  summary: string;
  allDay: boolean;
  // YYYY-MM-DD when all-day, YYYY-MM-DDTHH:mm (local) otherwise.
  start: string;
  end: string;
  location: string;
  description: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

function initialForm(event: CalendarEvent | null, day: string | null): FormState {
  if (event) {
    return {
      summary: event.summary,
      allDay: event.allDay,
      start: event.allDay ? event.start : toLocalInput(event.start),
      end: event.allDay ? event.end || event.start : toLocalInput(event.end || event.start),
      location: event.location,
      description: event.description,
    };
  }
  // A picked day starts at 9:00; "New event" starts at the next full hour.
  const now = new Date();
  const start = day
    ? `${day}T09:00`
    : toLocalInput(new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1).toISOString());
  return { summary: '', allDay: false, start, end: plusHour(start), location: '', description: '' };
}

// datetime-local value one hour later.
function plusHour(local: string): string {
  const d = new Date(local);
  if (isNaN(d.getTime())) return local;
  d.setHours(d.getHours() + 1);
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventModal({
  event,
  day,
  onClose,
  onSave,
  onDelete,
}: {
  event: CalendarEvent | null; // null creates a new event
  day: string | null; // prefilled day for a new event
  onClose: () => void;
  onSave: (input: EventInput) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const t = useT(calendarMessages);
  const tc = useT(commonMessages);
  const errorText = useErrorText();
  const [form, setForm] = useState<FormState>(() => initialForm(event, day));
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recurring = Boolean(event?.recurring);

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) => setForm((f) => ({ ...f, [field]: value }));

  const toggleAllDay = (allDay: boolean) =>
    setForm((f) => {
      if (allDay) return { ...f, allDay, start: f.start.slice(0, 10), end: f.end.slice(0, 10) };
      const start = `${f.start.slice(0, 10)}T09:00`;
      const end = f.end.slice(0, 10) === f.start.slice(0, 10) ? plusHour(start) : `${f.end.slice(0, 10)}T10:00`;
      return { ...f, allDay, start, end };
    });

  // Moving the start keeps the event's length, as calendar apps do.
  const changeStart = (start: string) =>
    setForm((f) => {
      if (!start) return { ...f, start };
      if (f.allDay) {
        const length = Math.round((parseDay(f.end).getTime() - parseDay(f.start).getTime()) / 86400000);
        return { ...f, start, end: isNaN(length) ? start : dayKey(addDays(parseDay(start), Math.max(0, length))) };
      }
      const length = new Date(f.end).getTime() - new Date(f.start).getTime();
      const end = new Date(new Date(start).getTime() + (isNaN(length) ? 3600000 : Math.max(0, length)));
      return { ...f, start, end: isNaN(end.getTime()) ? f.end : toLocalInput(end.toISOString()) };
    });

  const save = async () => {
    if (busy) return;
    if (!form.summary.trim()) return setError(t('titleRequired'));
    let input: EventInput;
    if (recurring && event) {
      // The server keeps a series' times; send them back unchanged.
      input = { summary: form.summary.trim(), location: form.location, description: form.description, start: event.start, end: event.end, allDay: event.allDay };
    } else if (form.allDay) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.start) || !/^\d{4}-\d{2}-\d{2}$/.test(form.end)) return setError(t('invalidDate'));
      if (form.end < form.start) return setError(t('endBeforeStart'));
      input = { summary: form.summary.trim(), location: form.location, description: form.description, start: form.start, end: form.end, allDay: true };
    } else {
      const start = new Date(form.start);
      const end = new Date(form.end);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return setError(t('invalidDate'));
      if (end < start) return setError(t('endBeforeStart'));
      input = { summary: form.summary.trim(), location: form.location, description: form.description, start: start.toISOString(), end: end.toISOString(), allDay: false };
    }
    setBusy('save');
    setError(null);
    try {
      await onSave(input);
    } catch (err) {
      setError(errorText(err));
      setBusy(null);
    }
  };

  const remove = async () => {
    if (busy || !event) return;
    const title = event.summary || t('untitled');
    if (!confirm(t(recurring ? 'deleteSeriesConfirm' : 'deleteConfirm', { title }))) return;
    setBusy('delete');
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(errorText(err));
      setBusy(null);
    }
  };

  // Esc closes and Ctrl/⌘+Enter saves from anywhere in the dialog.
  const keys = useRef({ save, onClose });
  keys.current = { save, onClose };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') keys.current.onClose();
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        keys.current.save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const dateType = form.allDay ? 'date' : 'datetime-local';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="event-modal-title" className="flex h-full w-full flex-col bg-surface shadow-xl sm:h-auto sm:max-h-full sm:max-w-lg sm:rounded-lg">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 id="event-modal-title" className="text-lg font-semibold text-gray-900">
            {event ? t('editEvent') : t('newEvent')}
          </h2>
          <button onClick={onClose} className="btn-icon -mr-2" aria-label={tc('close')}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-5"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div>
            <label htmlFor="event-summary" className="form-label">{t('eventTitle')}</label>
            <input
              id="event-summary"
              className="form-input"
              placeholder={t('titlePlaceholder')}
              value={form.summary}
              onChange={(e) => set('summary', e.target.value)}
              autoFocus
            />
          </div>

          {recurring && (
            <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">{t('recurringNote')}</p>
          )}

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              checked={form.allDay}
              disabled={recurring}
              onChange={(e) => toggleAllDay(e.target.checked)}
            />
            {t('allDay')}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="event-start" className="form-label">{t('start')}</label>
              <input
                id="event-start"
                key={`start-${dateType}`}
                type={dateType}
                className="form-input disabled:opacity-60"
                value={form.start}
                disabled={recurring}
                onChange={(e) => changeStart(e.target.value)}
                required
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="event-end" className="form-label">{t('end')}</label>
              <input
                id="event-end"
                key={`end-${dateType}`}
                type={dateType}
                className="form-input disabled:opacity-60"
                value={form.end}
                min={form.start}
                disabled={recurring}
                onChange={(e) => set('end', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="event-location" className="form-label">{t('location')}</label>
            <input id="event-location" className="form-input" value={form.location} onChange={(e) => set('location', e.target.value)} />
          </div>

          <div className="flex flex-1 flex-col">
            <label htmlFor="event-description" className="form-label">{t('description')}</label>
            <textarea
              id="event-description"
              className="form-input min-h-[6rem] flex-1"
              rows={4}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {/* Lets Enter in a text field submit the form. */}
          <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
        </form>

        <div className="flex items-center gap-3 border-t border-gray-200 px-5 py-3">
          {event && (
            <button onClick={remove} className="btn-danger text-sm" disabled={Boolean(busy)}>
              {busy === 'delete' ? tc('deleting') : tc('delete')}
            </button>
          )}
          <span className="flex-1" />
          <span className="hidden text-xs text-gray-500 sm:inline">
            {t('saveShortcut', { key: isMac ? '⌘ Enter' : 'Ctrl Enter' })}
          </span>
          <button onClick={onClose} className="btn-secondary text-sm" disabled={Boolean(busy)}>
            {tc('cancel')}
          </button>
          <button onClick={save} className="btn-primary text-sm" disabled={Boolean(busy)}>
            {busy === 'save' ? tc('saving') : tc('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
