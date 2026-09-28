import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Lightweight i18n. Each part of the UI defines its strings in one file, with
// every language side by side (see lib/i18n/messages/*), and TypeScript checks
// that each language has exactly the keys of the English one.

export const LOCALES = ['en', 'zh-CN', 'zh-TW', 'ja'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  ja: '日本語',
};

export const LOCALE_STORAGE_KEY = 'lang';

type Strings = Record<string, string>;
export type Messages<T extends Strings> = { en: T } & { [L in Exclude<Locale, 'en'>]: { [K in keyof T]: string } };

// Declares a set of strings in all languages.
export function defineMessages<T extends Strings>(messages: Messages<T>): Messages<T> {
  return messages;
}

// Picks the best supported language from the browser's preferences.
export function detectLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const lower = tag.toLowerCase();
    if (lower.startsWith('zh')) {
      // Traditional for Taiwan, Hong Kong, Macau and explicit Hant.
      return /hant|-tw|-hk|-mo/.test(lower) ? 'zh-TW' : 'zh-CN';
    }
    if (lower.startsWith('ja')) return 'ja';
    if (lower.startsWith('en')) return 'en';
  }
  return 'en';
}

function readLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && (LOCALES as readonly string[]).includes(stored)) return stored as Locale;
  } catch {
    // Storage may be blocked; fall back to the browser language.
  }
  return detectLocale(navigator.languages?.length ? navigator.languages : [navigator.language]);
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue>({ locale: 'en', setLocale: () => {} });

export function I18nProvider({ children }: { children: ReactNode }) {
  // Pages are prerendered in English; the viewer's language applies on mount.
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    setLocaleState(readLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Not persisted; applies to this page view.
    }
    setLocaleState(next);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale() {
  return useContext(I18nContext);
}

// Replaces {name} placeholders.
export function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

// Returns t(key, vars) for one set of messages, in the current language.
export function useT<T extends Strings>(messages: Messages<T>) {
  const { locale } = useLocale();
  return useCallback(
    (key: keyof T & string, vars?: Record<string, string | number>) =>
      format((messages[locale] as T)[key] ?? messages.en[key], vars),
    [locale, messages]
  );
}
