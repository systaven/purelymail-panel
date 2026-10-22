import { randomUUID } from 'crypto';
import ICAL from 'ical.js';
import { ApiError } from '@/lib/errors';
import { DavContext, resourceTypes, text } from './client';

export interface AddressBookInfo {
  href: string;
  name: string;
}

export interface Contact {
  href: string;
  etag: string | null;
  name: string;
  emails: string[];
  phones: string[];
  org: string;
  note: string;
}

export interface ContactInput {
  name: string;
  emails?: string[];
  phones?: string[];
  org?: string;
  note?: string;
}

export async function listAddressBooks({ dav, homes }: DavContext): Promise<AddressBookInfo[]> {
  const entries = await dav.propfind(homes.contacts, 1, '<d:resourcetype/><d:displayname/>');
  return entries
    .filter((e) => resourceTypes(e.props).includes('addressbook'))
    .map((e) => {
      const path = e.href.endsWith('/') ? e.href : `${e.href}/`;
      return { href: path, name: text(e.props.displayname) || path.split('/').filter(Boolean).pop() || '' };
    });
}

// ical.js leaves "\;" escaped in single text values, which other clients write.
const clean = (v: unknown) => String(v ?? '').replace(/\\([;,])/g, '$1').trim();
const strings = (values: unknown[]) => values.map(clean).filter(Boolean);

function parseContact(vcf: string, href: string, etag: string | null): Contact | null {
  try {
    const card = new ICAL.Component(ICAL.parse(vcf));
    const org = card.getFirstPropertyValue('org');
    const n = card.getFirstPropertyValue('n');
    const fromN = Array.isArray(n) ? strings([n[1], n[0]]).join(' ') : '';
    return {
      href,
      etag,
      name: clean(card.getFirstPropertyValue('fn')) || fromN,
      emails: strings(card.getAllProperties('email').map((p) => p.getFirstValue())),
      phones: strings(card.getAllProperties('tel').map((p) => p.getFirstValue())),
      org: Array.isArray(org) ? strings(org).join(', ') : clean(org),
      note: clean(card.getFirstPropertyValue('note')),
    };
  } catch {
    return null;
  }
}

// Lists the contacts in an address book: their hrefs first, then the cards
// themselves in one multiget.
export async function listContacts(ctx: DavContext, bookHref: string): Promise<Contact[]> {
  const book = ctx.resolve(bookHref, 'contacts');
  const members = (await ctx.dav.propfind(book, 1, '<d:resourcetype/><d:getetag/>'))
    .filter((e) => e.href.replace(/\/?$/, '/') !== book && !resourceTypes(e.props).includes('collection'));
  if (!members.length) return [];
  const hrefs = members.map((m) => `<d:href>${ctx.dav.url(m.href).pathname.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</d:href>`).join('');
  const cards = await ctx.dav.multiStatus('REPORT', book, 1, `<?xml version="1.0" encoding="utf-8"?>
<card:addressbook-multiget xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
<d:prop><d:getetag/><card:address-data/></d:prop>${hrefs}
</card:addressbook-multiget>`);
  return cards
    .map((c) => parseContact(text(c.props['address-data']), c.href, text(c.props.getetag) || null))
    .filter((c): c is Contact => Boolean(c))
    .sort((a, b) => (a.name || a.emails[0] || '').localeCompare(b.name || b.emails[0] || ''));
}

function validate(input: ContactInput): Required<ContactInput> {
  const result = {
    name: String(input.name ?? '').trim(),
    emails: strings(input.emails || []),
    phones: strings(input.phones || []),
    org: String(input.org ?? '').trim(),
    note: String(input.note ?? '').trim(),
  };
  if (!result.name && !result.emails.length) {
    throw new ApiError('Enter a name or an email address', 400, 'contact_empty');
  }
  return result;
}

// vCard 3.0 is what most servers and clients expect. Semicolons separate the
// parts of structured values (N, ORG), so they're only escaped there.
const escapeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,');
const escapeStructured = (value: string) => escapeText(value).replace(/;/g, '\\;');

function buildCard(uid: string, input: Required<ContactInput>): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'PRODID:-//PurelyMail Panel//EN',
    `UID:${uid}`,
    `FN:${escapeText(input.name || input.emails[0])}`,
    `N:${escapeStructured(input.name || input.emails[0])};;;;`,
    ...input.emails.map((e) => `EMAIL;TYPE=INTERNET:${escapeText(e)}`),
    ...input.phones.map((p) => `TEL:${escapeText(p)}`),
    ...(input.org ? [`ORG:${escapeStructured(input.org)}`] : []),
    ...(input.note ? [`NOTE:${escapeText(input.note)}`] : []),
    `REV:${new Date().toISOString().replace(/\.\d{3}/, '')}`,
    'END:VCARD',
  ];
  return `${lines.join('\r\n')}\r\n`;
}

export async function createContact(ctx: DavContext, bookHref: string, raw: ContactInput): Promise<void> {
  const book = ctx.resolve(bookHref, 'contacts');
  const uid = randomUUID();
  await ctx.dav.put(`${book}${uid}.vcf`, buildCard(uid, validate(raw)), 'text/vcard');
}

// Rewrites the fields the panel edits and keeps everything else on the card
// (photos, addresses, ...).
export async function updateContact(ctx: DavContext, href: string, etag: string | undefined, raw: ContactInput): Promise<void> {
  const input = validate(raw);
  const path = ctx.resolve(href, 'contacts');
  const res = await ctx.dav.request('GET', path);
  if (res.status === 404) throw new ApiError('This contact no longer exists', 404, 'dav_not_found');
  if (!res.ok) throw new ApiError('The contacts server returned an error', 502, 'dav_failed');
  const card = new ICAL.Component(ICAL.parse(await res.text()));
  const uid = String(card.getFirstPropertyValue('uid') || randomUUID());

  // Rebuild the edited properties from a fresh card so the escaping is right
  // for the card's own vCard version.
  const fresh = new ICAL.Component(ICAL.parse(buildCard(uid, input)));
  for (const name of ['fn', 'n', 'email', 'tel', 'org', 'note', 'rev']) {
    card.removeAllProperties(name);
    for (const prop of fresh.getAllProperties(name)) card.addProperty(prop);
  }
  await ctx.dav.put(path, card.toString(), 'text/vcard', etag || res.headers.get('etag') || undefined);
}

export async function deleteContact(ctx: DavContext, href: string, etag?: string): Promise<void> {
  await ctx.dav.remove(ctx.resolve(href, 'contacts'), etag);
}
