import { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { ClerkProvider } from '@clerk/nextjs';
import '@/styles/globals.css';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AuthProvider } from '@/hooks/useAuth';
import { CLERK_PUBLISHABLE_KEY, clerkConfigured } from '@/lib/clerk-client';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

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
    <ClerkProvider {...pageProps} publishableKey={CLERK_PUBLISHABLE_KEY} signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/">
      {page}
    </ClerkProvider>
  );
}
