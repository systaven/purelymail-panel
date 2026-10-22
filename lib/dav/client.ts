import { XMLParser } from 'fast-xml-parser';
import { ApiError } from '@/lib/errors';
import { withPassword } from '@/lib/mail/connection';
import type { MailboxHandle } from '@/lib/mail/handle';

// PurelyMail serves WebDAV, CalDAV and CardDAV under one root, with the same
// credentials as IMAP (the panel's app password for the mailbox).
const DAV_BASE = new URL(process.env.DAV_BASE_URL || 'https://purelymail.com/webdav/');
const TIMEOUT_MS = 20_000;

// A failed WebDAV request. `davStatus` 401 makes withPassword retry with a new
// app password.
export class DavError extends Error {
  constructor(message: string, public davStatus: number) {
    super(message);
  }
}

export interface DavResponse {
  href: string;
  props: Record<string, any>;
}

const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: true,
  parseTagValue: false,
  isArray: (name) => ['response', 'propstat', 'href'].includes(name),
});

const asArray = <T>(value: T | T[] | undefined): T[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

// Text content of an element, whether the parser gave a string or an object.
export function text(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return text(value[0]);
  if (typeof value === 'object' && '#text' in (value as any)) return String((value as any)['#text']);
  return '';
}

// Parses a 207 Multi-Status body. Only properties with a 2xx status are kept,
// since servers report missing ones with an empty element and a 404.
function parseMultiStatus(xml: string): DavResponse[] {
  const doc = parser.parse(xml);
  return asArray(doc?.multistatus?.response).map((r: any) => {
    const props: Record<string, any> = {};
    for (const ps of asArray<any>(r.propstat)) {
      if (!/\s2\d\d\s/.test(` ${text(ps.status)} `)) continue;
      Object.assign(props, ps.prop || {});
    }
    return { href: decodeURIComponent(text(asArray(r.href)[0])), props };
  });
}

// One WebDAV session for a mailbox: the requests of one API call share the
// password, and a login failure is retried once with a fresh app password.
export class DavSession {
  constructor(private user: string, private password: string) {}

  url(href: string): URL {
    return new URL(href, DAV_BASE);
  }

  async request(method: string, href: string, init: { body?: string; headers?: Record<string, string> } = {}) {
    const url = this.url(href);
    if (url.origin !== DAV_BASE.origin) {
      throw new ApiError('Invalid DAV path', 400);
    }
    const res = await fetch(url, {
      method,
      body: init.body,
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.user}:${this.password}`).toString('base64')}`,
        ...(init.body ? { 'Content-Type': 'application/xml; charset=utf-8' } : {}),
        ...init.headers,
      },
    });
    if (res.status === 401) {
      throw new DavError('DAV login failed', 401);
    }
    return res;
  }

  async multiStatus(method: 'PROPFIND' | 'REPORT', href: string, depth: 0 | 1, body: string): Promise<DavResponse[]> {
    const res = await this.request(method, href, { body, headers: { Depth: String(depth) } });
    if (res.status !== 207) {
      throw new DavError(`${method} ${href} failed with ${res.status}`, res.status);
    }
    return parseMultiStatus(await res.text());
  }

  propfind(href: string, depth: 0 | 1, props: string): Promise<DavResponse[]> {
    return this.multiStatus('PROPFIND', href, depth, `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:card="urn:ietf:params:xml:ns:carddav" xmlns:cs="http://calendarserver.org/ns/" xmlns:a="http://apple.com/ns/ical/">
<d:prop>${props}</d:prop></d:propfind>`);
  }

  // Writes a resource. `etag` guards against overwriting someone else's change;
  // without it the resource must not exist yet.
  async put(href: string, body: string, contentType: string, etag?: string): Promise<string | null> {
    const res = await this.request('PUT', href, {
      body,
      headers: {
        'Content-Type': `${contentType}; charset=utf-8`,
        ...(etag ? { 'If-Match': etag } : { 'If-None-Match': '*' }),
      },
    });
    if (res.status === 412) throw new ApiError('This item was changed elsewhere. Reload and try again.', 409, 'dav_conflict');
    if (!res.ok) throw new DavError(`PUT failed with ${res.status}: ${await res.text().catch(() => '')}`, res.status);
    return res.headers.get('etag');
  }

  async remove(href: string, etag?: string): Promise<void> {
    const res = await this.request('DELETE', href, { headers: etag ? { 'If-Match': etag } : {} });
    if (res.status === 412) throw new ApiError('This item was changed elsewhere. Reload and try again.', 409, 'dav_conflict');
    if (!res.ok && res.status !== 404) throw new DavError(`DELETE failed with ${res.status}`, res.status);
  }
}

// Where a mailbox's calendars and address books live.
export interface DavHomes {
  calendars: string;
  contacts: string;
}

// Discovery results don't change, so they're kept for the life of the process.
const homeCache = new Map<string, DavHomes>();

const withSlash = (path: string) => (path.endsWith('/') ? path : `${path}/`);

// Paths are compared decoded: servers differ in what they percent-encode
// (e.g. "@" in /webdav/user%40example.com/).
const decodedPath = (url: URL) => {
  try {
    return decodeURIComponent(url.pathname);
  } catch {
    return url.pathname;
  }
};

async function discoverHomes(dav: DavSession): Promise<DavHomes> {
  const root = decodedPath(DAV_BASE);
  // RFC 5397/4791/6352 discovery: principal, then its home sets.
  try {
    const [rootProps] = await dav.propfind(root, 0, '<d:current-user-principal/>');
    const principal = text(rootProps?.props['current-user-principal']?.href);
    if (principal) {
      const [p] = await dav.propfind(principal, 0, '<c:calendar-home-set/><card:addressbook-home-set/>');
      const calendars = text(p?.props['calendar-home-set']?.href);
      const contacts = text(p?.props['addressbook-home-set']?.href);
      if (calendars && contacts) {
        return { calendars: withSlash(decodedPath(dav.url(calendars))), contacts: withSlash(decodedPath(dav.url(contacts))) };
      }
    }
  } catch (error) {
    if (error instanceof DavError && error.davStatus === 401) throw error;
  }
  // PurelyMail's layout: /webdav/<account>/caldav/ and /webdav/<account>/carddav/.
  const children = await dav.propfind(root, 1, '<d:resourcetype/>');
  const account = children
    .map((c) => withSlash(decodedPath(dav.url(c.href))))
    .find((path) => path !== withSlash(root) && path.startsWith(root));
  if (!account) {
    throw new ApiError('Could not find calendars for this mailbox', 502, 'dav_unavailable');
  }
  return { calendars: `${account}caldav/`, contacts: `${account}carddav/` };
}

export interface DavContext {
  dav: DavSession;
  homes: DavHomes;
  // Resolves a client-supplied href and checks it is inside one of the homes.
  resolve(href: string, kind: keyof DavHomes): string;
}

// Runs `fn` with a WebDAV session for the mailbox.
export function withDav<T>(box: MailboxHandle, fn: (ctx: DavContext) => Promise<T>): Promise<T> {
  return withPassword(box, async (password) => {
    const dav = new DavSession(box.address, password);
    let homes = homeCache.get(box.address);
    if (!homes) {
      homes = await discoverHomes(dav);
      homeCache.set(box.address, homes);
    }
    const resolved = homes;
    const resolve = (href: string, kind: keyof DavHomes) => {
      const url = dav.url(href);
      const path = decodedPath(url);
      if (url.origin !== DAV_BASE.origin || !path.startsWith(resolved[kind]) || path.includes('/../')) {
        throw new ApiError('Invalid DAV path', 400);
      }
      return path;
    };
    return fn({ dav, homes: resolved, resolve });
  }).catch((error) => {
    if (error instanceof DavError) {
      console.error('DAV error:', error.message);
      throw new ApiError('The calendar server returned an error', 502, 'dav_failed');
    }
    throw error;
  });
}

export const resourceTypes = (props: Record<string, any>): string[] =>
  Object.keys(props.resourcetype && typeof props.resourcetype === 'object' ? props.resourcetype : {});
