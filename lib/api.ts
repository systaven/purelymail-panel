import { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from './errors';
import { getSession, Session } from './session';

export { ApiError };

type Access = 'admin' | 'user';
type Handler = (req: NextApiRequest, res: NextApiResponse, session: Session) => Promise<void>;

// Wraps an API route: checks who is calling, restricts methods, and turns
// errors into JSON responses. `access: 'admin'` allows only admins; 'user'
// allows any signed-in, non-disabled user (admins included).
export function apiHandler(access: Access, methods: Record<string, Handler>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const handler = methods[req.method || ''];
    if (!handler) {
      res.setHeader('Allow', Object.keys(methods).join(', '));
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      const session = await getSession(req);
      if (!session) {
        throw new ApiError('Unauthorized', 401);
      }
      if (session.disabled) {
        throw new ApiError('Your account has been disabled', 403);
      }
      if (access === 'admin' && session.role !== 'admin') {
        throw new ApiError('Admins only', 403);
      }
      await handler(req, res, session);
    } catch (error: any) {
      const status = error instanceof ApiError ? error.status : 500;
      if (status === 500) {
        console.error(`API error on ${req.method} ${req.url}:`, error);
      }
      res.status(status).json({
        error: status === 500 ? 'Request failed' : error.message,
        details: status === 500 ? error.responseText || error.message : undefined,
      });
    }
  };
}

export function requireString(value: unknown, name: string): string {
  const str = Array.isArray(value) ? value[0] : value;
  if (typeof str !== 'string' || !str.trim()) {
    throw new ApiError(`Missing ${name}`, 400);
  }
  return str.trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireEmail(value: unknown, name = 'mailbox'): string {
  const email = requireString(value, name).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw new ApiError(`Invalid ${name}`, 400);
  }
  return email;
}

export function requireInt(value: unknown, name: string): number {
  const num = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isInteger(num) || num < 0) {
    throw new ApiError(`Invalid ${name}`, 400);
  }
  return num;
}
