import { ImapFlow, FetchMessageObject, MessageStructureObject } from 'imapflow';
import { simpleParser, AddressObject } from 'mailparser';
import MailComposer from 'nodemailer/lib/mail-composer';
import { withImap, withSmtp } from './connection';
import { sanitizeEmailHtml } from './sanitize';

export interface MailFolder {
  path: string;
  name: string;
  delimiter: string;
  specialUse?: string;
  total: number;
  unseen: number;
}

export interface MailAddress {
  name?: string;
  address?: string;
}

export interface MessageSummary {
  uid: number;
  subject: string;
  from: MailAddress[];
  to: MailAddress[];
  date: string | null;
  seen: boolean;
  flagged: boolean;
  answered: boolean;
  hasAttachments: boolean;
  size: number;
}

export interface MessageList {
  messages: MessageSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AttachmentInfo {
  index: number;
  filename: string;
  contentType: string;
  size: number;
}

export interface MessageDetail extends MessageSummary {
  cc: MailAddress[];
  replyTo: MailAddress[];
  messageId?: string;
  references: string[];
  text: string;
  html: string | null;
  blockedImages: number;
  attachments: AttachmentInfo[];
}

export type MessageAction = 'seen' | 'unseen' | 'flag' | 'unflag' | 'move' | 'delete';

export interface OutgoingAttachment {
  filename: string;
  contentType: string;
  content: string; // base64
}

export interface OutgoingMessage {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: OutgoingAttachment[];
}

const SPECIAL_USE_ORDER = ['\\Inbox', '\\Drafts', '\\Sent', '\\Junk', '\\Trash', '\\Archive'];

function hasAttachment(node?: MessageStructureObject): boolean {
  if (!node) return false;
  if (node.disposition === 'attachment') return true;
  return (node.childNodes || []).some(hasAttachment);
}

function toSummary(msg: FetchMessageObject): MessageSummary {
  const flags = msg.flags || new Set<string>();
  const envelope = msg.envelope;
  const date = new Date(envelope?.date || msg.internalDate || NaN);
  return {
    uid: msg.uid,
    subject: envelope?.subject || '(no subject)',
    from: envelope?.from || [],
    to: envelope?.to || [],
    date: isNaN(date.getTime()) ? null : date.toISOString(),
    seen: flags.has('\\Seen'),
    flagged: flags.has('\\Flagged'),
    answered: flags.has('\\Answered'),
    hasAttachments: hasAttachment(msg.bodyStructure),
    size: msg.size || 0,
  };
}

function addresses(value?: AddressObject | AddressObject[]): MailAddress[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((a) => a.value.map((v) => ({ name: v.name, address: v.address })));
}

async function findSpecialFolder(client: ImapFlow, specialUse: string): Promise<string | null> {
  const folders = await client.list();
  return folders.find((f) => f.specialUse === specialUse)?.path ?? null;
}

async function downloadSource(client: ImapFlow, uid: number): Promise<Buffer> {
  const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
  if (!msg || !msg.source) {
    throw new MailError('Message not found', 404);
  }
  return msg.source;
}

export class MailError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function listFolders(mailbox: string): Promise<MailFolder[]> {
  return withImap(mailbox, async (client) => {
    const folders = await client.list({ statusQuery: { messages: true, unseen: true } });
    return folders
      .filter((f) => !f.flags.has('\\Noselect'))
      .map((f) => ({
        path: f.path,
        name: f.path.toUpperCase() === 'INBOX' ? 'Inbox' : f.name,
        delimiter: f.delimiter,
        specialUse: f.path.toUpperCase() === 'INBOX' ? '\\Inbox' : f.specialUse,
        total: f.status?.messages ?? 0,
        unseen: f.status?.unseen ?? 0,
      }))
      .sort((a, b) => {
        const ai = a.specialUse ? SPECIAL_USE_ORDER.indexOf(a.specialUse) : -1;
        const bi = b.specialUse ? SPECIAL_USE_ORDER.indexOf(b.specialUse) : -1;
        if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        return a.path.localeCompare(b.path);
      });
  });
}

export function listMessages(
  mailbox: string,
  folder: string,
  { page, pageSize, query }: { page: number; pageSize: number; query?: string }
): Promise<MessageList> {
  return withImap(mailbox, async (client) => {
    const lock = await client.getMailboxLock(folder, { readOnly: true });
    try {
      const exists = client.mailbox ? client.mailbox.exists : 0;
      const fetchQuery = { uid: true, envelope: true, flags: true, internalDate: true, size: true, bodyStructure: true };
      const messages: MessageSummary[] = [];
      let total: number;

      if (query) {
        const found = await client.search(
          { or: [{ subject: query }, { from: query }, { to: query }, { body: query }] },
          { uid: true }
        );
        const uids = (found || []).sort((a, b) => b - a);
        total = uids.length;
        const pageUids = uids.slice(page * pageSize, (page + 1) * pageSize);
        if (pageUids.length) {
          for await (const msg of client.fetch(pageUids.join(','), fetchQuery, { uid: true })) {
            messages.push(toSummary(msg));
          }
        }
      } else {
        // Newest messages have the highest sequence numbers.
        total = exists;
        const end = exists - page * pageSize;
        const start = Math.max(1, end - pageSize + 1);
        if (end >= 1) {
          for await (const msg of client.fetch(`${start}:${end}`, fetchQuery)) {
            messages.push(toSummary(msg));
          }
        }
      }

      messages.sort((a, b) => b.uid - a.uid);
      return { messages, total, page, pageSize };
    } finally {
      lock.release();
    }
  });
}

export function getMessage(
  mailbox: string,
  folder: string,
  uid: number,
  { allowRemoteImages }: { allowRemoteImages: boolean }
): Promise<MessageDetail> {
  return withImap(mailbox, async (client) => {
    const lock = await client.getMailboxLock(folder);
    try {
      const meta = await client.fetchOne(
        String(uid),
        { uid: true, envelope: true, flags: true, internalDate: true, size: true, bodyStructure: true },
        { uid: true }
      );
      if (!meta) {
        throw new MailError('Message not found', 404);
      }
      const parsed = await simpleParser(await downloadSource(client, uid));
      await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });

      const inlineImages = parsed.attachments
        .filter((a) => a.cid && a.contentType.startsWith('image/') && a.size < 2 * 1024 * 1024)
        .map((a) => ({ cid: a.cid!, dataUrl: `data:${a.contentType};base64,${a.content.toString('base64')}` }));
      const sanitized = parsed.html
        ? sanitizeEmailHtml(parsed.html, { allowRemoteImages, inlineImages })
        : null;

      const summary = toSummary(meta);
      const references = parsed.references
        ? Array.isArray(parsed.references) ? parsed.references : [parsed.references]
        : [];

      return {
        ...summary,
        seen: true,
        subject: parsed.subject || summary.subject,
        cc: addresses(parsed.cc),
        replyTo: addresses(parsed.replyTo),
        messageId: parsed.messageId,
        references,
        text: parsed.text || '',
        html: sanitized?.html ?? null,
        blockedImages: sanitized?.blockedImages ?? 0,
        // Inline images shown in the body aren't listed as attachments.
        attachments: parsed.attachments
          .map((a, index) => ({ a, index }))
          .filter(({ a }) => !(a.related && a.cid))
          .map(({ a, index }) => ({
            index,
            filename: a.filename || `attachment-${index + 1}`,
            contentType: a.contentType,
            size: a.size,
          })),
      };
    } finally {
      lock.release();
    }
  });
}

export function getAttachment(
  mailbox: string,
  folder: string,
  uid: number,
  index: number
): Promise<{ filename: string; contentType: string; content: Buffer }> {
  return withImap(mailbox, async (client) => {
    const lock = await client.getMailboxLock(folder, { readOnly: true });
    try {
      const parsed = await simpleParser(await downloadSource(client, uid));
      const attachment = parsed.attachments[index];
      if (!attachment) {
        throw new MailError('Attachment not found', 404);
      }
      return {
        filename: attachment.filename || `attachment-${index + 1}`,
        contentType: attachment.contentType,
        content: attachment.content,
      };
    } finally {
      lock.release();
    }
  });
}

export function applyAction(
  mailbox: string,
  folder: string,
  uids: number[],
  action: MessageAction,
  target?: string
): Promise<void> {
  return withImap(mailbox, async (client) => {
    const lock = await client.getMailboxLock(folder);
    try {
      const range = uids.join(',');
      switch (action) {
        case 'seen':
          await client.messageFlagsAdd(range, ['\\Seen'], { uid: true });
          break;
        case 'unseen':
          await client.messageFlagsRemove(range, ['\\Seen'], { uid: true });
          break;
        case 'flag':
          await client.messageFlagsAdd(range, ['\\Flagged'], { uid: true });
          break;
        case 'unflag':
          await client.messageFlagsRemove(range, ['\\Flagged'], { uid: true });
          break;
        case 'move':
          if (!target) throw new MailError('Target folder is required', 400);
          await client.messageMove(range, target, { uid: true });
          break;
        case 'delete': {
          // Move to Trash first; delete permanently only when already in Trash.
          const trash = await findSpecialFolder(client, '\\Trash');
          if (trash && trash !== folder) {
            await client.messageMove(range, trash, { uid: true });
          } else {
            await client.messageDelete(range, { uid: true });
          }
          break;
        }
        default:
          throw new MailError('Unknown action', 400);
      }
    } finally {
      lock.release();
    }
  });
}

export async function sendMessage(mailbox: string, message: OutgoingMessage): Promise<void> {
  const mail = {
    from: mailbox,
    to: message.to,
    cc: message.cc || undefined,
    bcc: message.bcc || undefined,
    subject: message.subject,
    text: message.text,
    inReplyTo: message.inReplyTo,
    references: message.references,
    attachments: (message.attachments || []).map((a) => ({
      filename: a.filename,
      contentType: a.contentType,
      content: Buffer.from(a.content, 'base64'),
    })),
  };

  await withSmtp(mailbox, (transport) => transport.sendMail(mail));

  // SMTP doesn't store a copy, so save one to the Sent folder (without Bcc headers).
  const raw = await new MailComposer({ ...mail, bcc: undefined }).compile().build();
  await withImap(mailbox, async (client) => {
    const sent = await findSpecialFolder(client, '\\Sent');
    if (sent) {
      await client.append(sent, raw, ['\\Seen']);
    }
    if (message.inReplyTo) {
      // Mark the original as answered if it's in the inbox.
      const lock = await client.getMailboxLock('INBOX');
      try {
        const found = await client.search({ header: { 'message-id': message.inReplyTo } }, { uid: true });
        if (found && found.length) {
          await client.messageFlagsAdd(found.join(','), ['\\Answered'], { uid: true });
        }
      } finally {
        lock.release();
      }
    }
  }).catch((error) => {
    // The message was already sent; don't report failure because of the copy.
    console.warn('Sent message could not be saved to the Sent folder:', error.message);
  });
}
