import { ComputerDesktopIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/hooks/useTheme';
import type { ThemePreference } from '@/lib/theme';

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
  { value: 'system', label: 'System', Icon: ComputerDesktopIcon },
];

export default function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="flex rounded-md bg-gray-100 p-0.5">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          title={label}
          onClick={() => setPreference(value)}
          className={`flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
            preference === value ? 'bg-surface text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Icon className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}
