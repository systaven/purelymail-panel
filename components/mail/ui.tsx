import { Fragment, ReactNode } from 'react';

const AVATAR_COLORS = [
  'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-600', 'bg-emerald-500',
  'bg-teal-500', 'bg-sky-500', 'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500',
];

function initials(name: string): string {
  const words = name.replace(/[<>"@].*$/, '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return (name.trim()[0] || '?').toUpperCase();
  // CJK names don't have spaces; one character reads better than two.
  if (/[぀-ヿ㐀-鿿가-힯]/.test(words[0])) return words[0][0];
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
}

// A coloured circle with the sender's initials; the colour is stable per sender.
export function Avatar({ name, seed, size = 'md' }: { name: string; seed?: string; size?: 'sm' | 'md' }) {
  const key = (seed || name).toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const color = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  const dims = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  return (
    <span aria-hidden className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${color} ${dims}`}>
      {initials(name)}
    </span>
  );
}

// Marks occurrences of the search terms in `text`.
export function Highlight({ text, query }: { text: string; query: string }): ReactNode {
  const terms = query.trim().split(/\s+/).filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!terms.length || !text) return text;
  const parts = text.split(new RegExp(`(${terms.join('|')})`, 'gi'));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-yellow-200 px-0.5 text-gray-900 dark:bg-yellow-500/40">{part}</mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

// True when focus is somewhere typing should go, so single-key shortcuts stay off.
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

export const modKey = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl';
