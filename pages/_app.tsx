import { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import '@/styles/globals.css';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AuthProvider } from '@/hooks/useAuth';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // Don't apply auth guard to login page
  if (router.pathname === '/login') {
    return <Component {...pageProps} />;
  }

  return (
    <AuthProvider>
      <AuthGuard>
        <Component {...pageProps} />
      </AuthGuard>
    </AuthProvider>
  );
}