import { ComputerDesktopIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/hooks/useTheme';
import type { ThemePreference } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { shellMessages } from '@/lib/i18n/messages/shell';

const OPTIONS: { value: ThemePreference; label: 'themeLight' | 'themeDark' | 'themeSystem'; Icon: typeof SunIcon }[] = [
  { value: 'light', label: 'themeLight', Icon: SunIcon },
  { value: 'dark', label: 'themeDark', Icon: MoonIcon },
  { value: 'system', label: 'themeSystem', Icon: ComputerDesktopIcon },
];

export default function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const t = useT(shellMessages);
  return (
    <div role="radiogroup" aria-label={t('theme')} className="flex rounded-md bg-gray-100 p-0.5">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          title={t(label)}
          onClick={() => setPreference(value)}
          className={`flex min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded px-1 py-1 text-xs font-medium transition-colors ${
            preference === value ? 'bg-surface text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Icon className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">{t(label)}</span>
        </button>
      ))}
    </div>
  );
}
