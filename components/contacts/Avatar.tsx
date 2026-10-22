import { avatarColor, initials } from './utils';

export default function Avatar({ label, size = 'md' }: { label: string; size?: 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'h-16 w-16 text-xl' : 'h-9 w-9 text-sm';
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ${dims} ${avatarColor(label)}`}
      aria-hidden="true"
    >
      {initials(label)}
    </span>
  );
}
