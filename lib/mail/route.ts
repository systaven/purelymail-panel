import { NextApiRequest, NextApiResponse } from 'next';
import { MailError } from './operations';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireString(value: unknown, name: string): string {
  const str = Array.isArray(value) ? value[0] : value;
  if (typeof str !== 'string' || !str) {
    throw new MailError(`Missing ${name}`, 400);
  }
  return str;
}

export function requireMailbox(value: unknown): string {
  const mailbox = requireString(value, 'mailbox').trim().toLowerCase();
  if (!EMAIL_RE.test(mailbox)) {
    throw new MailError('Invalid mailbox', 400);
  }
  return mailbox;
}

export function requireUid(value: unknown, name = 'uid'): number {
  const uid = Number(requireString(String(value ?? ''), name));
  if (!Number.isInteger(uid) || uid < 0) {
    throw new MailError(`Invalid ${name}`, 400);
  }
  return uid;
}

// Wraps a mail API handler: restricts methods and turns errors into JSON responses.
export function mailHandler(
  methods: Record<string, (req: NextApiRequest, res: NextApiResponse) => Promise<void>>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const handler = methods[req.method || ''];
    if (!handler) {
      res.setHeader('Allow', Object.keys(methods).join(', '));
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      await handler(req, res);
    } catch (error: any) {
      const status = error instanceof MailError ? error.status : 500;
      if (status === 500) {
        console.error('Mail API error:', error);
      }
      res.status(status).json({
        error: status === 500 ? 'Mail server request failed' : error.message,
        details: status === 500 ? error.responseText || error.message : undefined,
      });
    }
  };
}
