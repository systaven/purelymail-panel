import { ApiError, apiHandler, requireEmail, requireString } from '@/lib/api';
import { getOwner } from '@/lib/accounts';
import type { Session } from '@/lib/session';

export { requireString };

// Mail routes are open to any signed-in user; each one then checks the
// mailbox with requireMailbox.
export const mailHandler = (methods: Parameters<typeof apiHandler>[1]) => apiHandler('user', methods);

// Returns the requested mailbox if the caller may use it: admins may open any
// mailbox, guests only the ones they own.
export async function requireMailbox(session: Session, value: unknown): Promise<string> {
  const mailbox = requireEmail(value);
  if (session.role !== 'admin' && (await getOwner(mailbox)) !== session.clerkUserId) {
    throw new ApiError('You do not have access to this mailbox', 403);
  }
  return mailbox;
}

export function requireUid(value: unknown, name = 'uid'): number {
  const uid = Number(requireString(String(value ?? ''), name));
  if (!Number.isInteger(uid) || uid < 0) {
    throw new ApiError(`Invalid ${name}`, 400);
  }
  return uid;
}
