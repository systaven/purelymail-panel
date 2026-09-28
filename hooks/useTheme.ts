import { useCallback, useEffect, useState } from 'react';
import { applyTheme, readPreference, THEME_STORAGE_KEY, ThemePreference } from '@/lib/theme';

const THEME_EVENT = 'panel-theme-change';

// The viewer's theme choice (system / light / dark) and whether dark is active.
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const pref = readPreference();
    setPreferenceState(pref);
    setIsDark(applyTheme(pref));

    // Follow the OS setting live while on "system".
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (readPreference() === 'system') setIsDark(applyTheme('system'));
    };
    media.addEventListener('change', onChange);
    // Another tab changed the setting.
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) {
        const next = readPreference();
        setPreferenceState(next);
        setIsDark(applyTheme(next));
      }
    };
    window.addEventListener('storage', onStorage);
    // Another component in this tab changed it.
    const onLocal = () => {
      setPreferenceState(readPreference());
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener(THEME_EVENT, onLocal);
    return () => {
      media.removeEventListener('change', onChange);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(THEME_EVENT, onLocal);
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage may be blocked; the choice then lasts for this page view.
    }
    setPreferenceState(next);
    setIsDark(applyTheme(next));
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return { preference, isDark, setPreference };
}
