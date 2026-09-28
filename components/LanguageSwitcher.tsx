import { LanguageIcon } from '@heroicons/react/24/outline';
import { Locale, LOCALE_NAMES, LOCALES, useLocale, useT } from '@/lib/i18n';
import { commonMessages } from '@/lib/i18n/messages/common';

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const t = useT(commonMessages);
  return (
    <label className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
      <LanguageIcon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
      <span className="sr-only">{t('language')}</span>
      <select
        className="w-full rounded-md border border-gray-300 py-1 pl-2 pr-8 text-sm"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t('language')}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>{LOCALE_NAMES[l]}</option>
        ))}
      </select>
    </label>
  );
}
