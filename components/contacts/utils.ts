import type { Contact, ContactInput } from '@/components/dav/api';

// The name shown for a contact; contacts may have only an email address.
export const contactLabel = (c: Contact) => c.name || c.emails[0] || '';

// Built with RegExp: the tsconfig targets ES5, which rejects the u flag in literals.
const LETTER = new RegExp('\\p{L}', 'u');
const LATIN = new RegExp('^\\p{Script=Latin}', 'u');
const MARKS = new RegExp('\\p{M}', 'gu');

// The list section a contact goes under: its first letter without accents for
// Latin names, the first character for other scripts, or '#'.
export function groupKey(label: string, locale: string): string {
  const first = Array.from(label.trim())[0] || '';
  if (!LETTER.test(first)) return '#';
  const upper = first.toLocaleUpperCase(locale);
  return LATIN.test(upper) ? upper.normalize('NFD').replace(MARKS, '') : upper;
}

export interface ContactGroup {
  key: string;
  contacts: Contact[];
}

export function groupContacts(contacts: Contact[], locale: string): ContactGroup[] {
  const sorted = [...contacts].sort((a, b) =>
    contactLabel(a).localeCompare(contactLabel(b), locale, { sensitivity: 'base' })
  );
  const groups = new Map<string, Contact[]>();
  for (const c of sorted) {
    const key = groupKey(contactLabel(c), locale);
    groups.set(key, [...(groups.get(key) || []), c]);
  }
  return Array.from(groups, ([key, list]) => ({ key, contacts: list })).sort((a, b) =>
    a.key === '#' ? 1 : b.key === '#' ? -1 : a.key.localeCompare(b.key, locale)
  );
}

// Case-insensitive match on name, emails, phones and organization. Phones
// also match by digits alone, so "5551234" finds "+1 (555) 123-4".
export function matchesQuery(c: Contact, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, '');
  return (
    [c.name, c.org, ...c.emails, ...c.phones].some((v) => v.toLowerCase().includes(q)) ||
    (digits.length >= 3 && digits.length === q.replace(/[\s()+.-]/g, '').length &&
      c.phones.some((p) => p.replace(/\D/g, '').includes(digits)))
  );
}

// Up to two letters: initials of the first two words for space-separated
// names, otherwise the first character (e.g. CJK names).
export function initials(label: string): string {
  const words = label.trim().split(/[\s@._-]+/).filter(Boolean);
  if (!words.length) return '?';
  const first = (w: string) => Array.from(w)[0] || '';
  const spaced = /\s/.test(label.trim()) && words.length > 1 && LATIN.test(words[0]);
  return (spaced ? first(words[0]) + first(words[1]) : first(words[0])).toLocaleUpperCase();
}

// Full class strings so Tailwind keeps them; these shades swap in dark mode.
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-yellow-100 text-yellow-800',
  'bg-red-100 text-red-700',
  'bg-indigo-100 text-indigo-700',
];

export function avatarColor(label: string): string {
  let hash = 0;
  for (const ch of label) hash = (hash * 31 + ch.codePointAt(0)!) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Trims the fields and drops empty rows before sending.
export function cleanInput(input: ContactInput): ContactInput {
  const list = (values?: string[]) => (values || []).map((v) => v.trim()).filter(Boolean);
  return {
    name: input.name.trim(),
    org: input.org?.trim() || '',
    emails: list(input.emails),
    phones: list(input.phones),
    note: input.note?.trim() || '',
  };
}
