import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, apiHandler, requireEmail, requireString } from '@/lib/api';
import { getOwner } from '@/lib/accounts';
import type { Session } from '@/lib/session';
import { MailboxHandle, privateMailbox, sharedMailbox } from './handle';

export { requireString };

// Mail routes are open to any signed-in user; each one then checks the
// mailbox with requireMailbox.
export const mailHandler = (methods: Parameters<typeof apiHandler>[1]) => apiHandler('user', methods);

// Who may use a mailbox:
// - owned by a user: only that user. It's private; admins can delete it on the
//   Users page but can't read it or change its settings.
// - not owned: admins only.
async function checkAccess(session: Session, mailbox: string): Promise<string | null> {
  const owner = await getOwner(mailbox);
  if (owner) {
    if (owner !== session.clerkUserId) {
      throw new ApiError('This mailbox is private to its owner', 403, 'mailbox_private');
    }
  } else if (session.role !== 'admin') {
    throw new ApiError('You do not have access to this mailbox', 403, 'no_mailbox_access');
  }
  return owner;
}

// Returns the requested address if the caller may use it.
export async function requireMailbox(session: Session, value: unknown): Promise<string> {
  const mailbox = requireEmail(value);
  await checkAccess(session, mailbox);
  return mailbox;
}

// Like requireMailbox, plus the credentials to open the mailbox over IMAP/SMTP.
export async function openMailbox(
  session: Session,
  value: unknown,
  req: NextApiRequest,
  res: NextApiResponse
): Promise<MailboxHandle> {
  const mailbox = requireEmail(value);
  const owner = await checkAccess(session, mailbox);
  return owner ? privateMailbox(mailbox, owner, req, res) : sharedMailbox(mailbox);
}

export function requireUid(value: unknown, name = 'uid'): number {
  const uid = Number(requireString(String(value ?? ''), name));
  if (!Number.isInteger(uid) || uid < 0) {
    throw new ApiError(`Invalid ${name}`, 400);
  }
  return uid;
}
