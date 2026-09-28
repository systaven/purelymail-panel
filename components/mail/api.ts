import type {
  MailAddress,
  MailFolder,
  MessageAction,
  MessageDetail,
  MessageList,
  OutgoingMessage,
} from '@/lib/mail/operations';

export type { MailAddress, MailFolder, MessageAction, MessageDetail, MessageList, MessageSummary, OutgoingMessage } from '@/lib/mail/operations';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details ? `${data.error}: ${data.details}` : data.error || `Request failed (${response.status})`);
  }
  return data as T;
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  return search.toString();
}

function post<T>(url: string, body: unknown, method = 'POST'): Promise<T> {
  return request<T>(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

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

export function formatDate(iso: string | null, long = false): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (long) return date.toLocaleString();
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString();
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
