import { apiFetch } from '@/lib/client-api';
import type { CalendarEvent, CalendarInfo, EventInput } from '@/lib/dav/calendar';
import type { AddressBookInfo, Contact, ContactInput } from '@/lib/dav/contacts';

export type { AddressBookInfo, CalendarEvent, CalendarInfo, Contact, ContactInput, EventInput };

const qs = (params: Record<string, string>) => new URLSearchParams(params).toString();

// Calendars and contacts of a mailbox, over the panel's CalDAV/CardDAV routes.
// Errors are ApiClientErrors, so callers can show them with useErrorText.
export const davApi = {
  calendars: (mailbox: string) => apiFetch<CalendarInfo[]>(`/api/dav/calendars?${qs({ mailbox })}`),
  events: (mailbox: string, calendar: string, start: Date, end: Date) =>
    apiFetch<CalendarEvent[]>(`/api/dav/events?${qs({ mailbox, calendar, start: start.toISOString(), end: end.toISOString() })}`),
  createEvent: (mailbox: string, calendar: string, event: EventInput) =>
    apiFetch('/api/dav/events', 'POST', { mailbox, calendar, event }),
  updateEvent: (mailbox: string, href: string, etag: string | null, event: EventInput) =>
    apiFetch('/api/dav/events', 'PUT', { mailbox, href, etag, event }),
  deleteEvent: (mailbox: string, href: string, etag: string | null) =>
    apiFetch('/api/dav/events', 'DELETE', { mailbox, href, etag }),

  addressBooks: (mailbox: string) => apiFetch<AddressBookInfo[]>(`/api/dav/addressbooks?${qs({ mailbox })}`),
  contacts: (mailbox: string, book: string) => apiFetch<Contact[]>(`/api/dav/contacts?${qs({ mailbox, book })}`),
  createContact: (mailbox: string, book: string, contact: ContactInput) =>
    apiFetch('/api/dav/contacts', 'POST', { mailbox, book, contact }),
  updateContact: (mailbox: string, href: string, etag: string | null, contact: ContactInput) =>
    apiFetch('/api/dav/contacts', 'PUT', { mailbox, href, etag, contact }),
  deleteContact: (mailbox: string, href: string, etag: string | null) =>
    apiFetch('/api/dav/contacts', 'DELETE', { mailbox, href, etag }),
};
