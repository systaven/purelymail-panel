import { apiFetch } from '@/lib/client-api';
import type { Locale } from '@/lib/i18n';
import type {
  MailAddress,
  MailFolder,
  MessageAction,
  MessageDetail,
  MessageList,
  OutgoingMessage,
} from '@/lib/mail/operations';

export type { MailAddress, MailFolder, MessageAction, MessageDetail, MessageList, MessageSummary, OutgoingMessage } from '@/lib/mail/operations';

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  return search.toString();
}

// Errors are ApiClientErrors, so callers can show them with useErrorText.
const request = <T>(url: string) => apiFetch<T>(url);
const post = <T>(url: string, body: unknown, method = 'POST') => apiFetch<T>(url, method, body);

export const mailApi = {
  mailboxes: () => request<string[]>('/api/mail/mailboxes'),
  folders: (mailbox: string) =>
    request<MailFolder[]>(`/api/mail/folders?${query({ mailbox })}`),
  messages: (mailbox: string, folder: string, page: number, q?: string) =>
    request<MessageList>(`/api/mail/messages?${query({ mailbox, folder, page, q })}`),
  message: (mailbox: string, folder: string, uid: number, images: boolean) =>
    request<MessageDetail>(`/api/mail/message?${query({ mailbox, folder, uid, images: images ? 1 : undefined })}`),
  attachmentUrl: (mailbox: string, folder: string, uid: number, index: number) =>
    `/api/mail/attachment?${query({ mailbox, folder, uid, index })}`,
  action: (mailbox: string, folder: string, uids: number[], action: MessageAction, target?: string) =>
    post('/api/mail/messages', { mailbox, folder, uids, action, target }),
  send: (mailbox: string, message: OutgoingMessage) =>
    post('/api/mail/send', { mailbox, ...message }),
  prepare: (mailbox: string) =>
    post('/api/mail/credentials', { mailbox }),
  revoke: (mailbox: string) =>
    post('/api/mail/credentials', { mailbox }, 'DELETE'),
};

export function formatAddress(a: MailAddress): string {
  if (a.name && a.address) return `${a.name} <${a.address}>`;
  return a.address || a.name || '';
}

export function formatAddresses(list: MailAddress[]): string {
  return list.map(formatAddress).join(', ');
}

export function displayName(list: MailAddress[]): string {
  const first = list[0];
  return first ? first.name || first.address || '' : '';
}

// Folders with a special use get a name in the viewer's language; others keep
// the name from the server.
const SPECIAL_FOLDER_KEYS = {
  '\\Inbox': 'folderInbox',
  '\\Sent': 'folderSent',
  '\\Drafts': 'folderDrafts',
  '\\Trash': 'folderTrash',
  '\\Junk': 'folderJunk',
  '\\Archive': 'folderArchive',
} as const;

type SpecialFolderKey = (typeof SPECIAL_FOLDER_KEYS)[keyof typeof SPECIAL_FOLDER_KEYS];

export function folderLabel(folder: MailFolder, t: (key: SpecialFolderKey) => string): string {
  const key = folder.specialUse ? SPECIAL_FOLDER_KEYS[folder.specialUse as keyof typeof SPECIAL_FOLDER_KEYS] : undefined;
  return key ? t(key) : folder.name;
}

export function formatDate(iso: string | null, locale: Locale, long = false): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (long) return date.toLocaleString(locale);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString(locale);
}

export function formatSize(bytes: number, locale: Locale): string {
  const number = (value: number, digits: number) =>
    value.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  if (bytes < 1024) return `${number(bytes, 0)} B`;
  if (bytes < 1024 * 1024) return `${number(bytes / 1024, 0)} KB`;
  return `${number(bytes / 1024 / 1024, 1)} MB`;
}
