import { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { jaJP, zhCN, zhTW } from '@clerk/localizations';
import '@/styles/globals.css';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AuthProvider } from '@/hooks/useAuth';
import { CLERK_PUBLISHABLE_KEY, clerkConfigured } from '@/lib/clerk-client';
import { useTheme } from '@/hooks/useTheme';
import { I18nProvider, Locale, useLocale } from '@/lib/i18n';

const CLERK_LOCALIZATIONS: Partial<Record<Locale, typeof zhCN>> = { 'zh-CN': zhCN, 'zh-TW': zhTW, ja: jaJP };

export default function App(props: AppProps) {
  return (
    <I18nProvider>
      <Shell {...props} />
    </I18nProvider>
  );
}

function Shell({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { isDark } = useTheme();
  const { locale } = useLocale();

  // Don't apply the auth guard to the login page.
  const page = router.pathname === '/login' ? (
    <Component {...pageProps} />
  ) : (
    <AuthProvider>
      <AuthGuard>
        <Component {...pageProps} />
      </AuthGuard>
    </AuthProvider>
  );

  if (!clerkConfigured) {
    return page;
  }
  return (
    <ClerkProvider
      {...pageProps}
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      appearance={{ baseTheme: isDark ? dark : undefined, variables: { colorPrimary: '#2563eb' } }}
      localization={CLERK_LOCALIZATIONS[locale]}
    >
      {page}
    </ClerkProvider>
  );
}
