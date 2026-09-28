import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { clerkConfigured } from '@/lib/clerk-client';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import { useT } from '@/lib/i18n';
import { useErrorText } from '@/lib/i18n/useErrorText';
import { loginMessages } from '@/lib/i18n/messages/login';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useT(loginMessages);
  const errorText = useErrorText();

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/verify');
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            router.push('/');
          }
        }
      } catch (error) {
        // User is not authenticated, stay on login page
      }
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiFetch('/api/auth/login', 'POST', { password });
      // Redirect to dashboard
      router.push('/');
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401 && !error.code) {
        setError(t('invalidPassword'));
      } else {
        setError(errorText(error) || t('loginFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <LanguageSwitcher className="absolute right-4 top-4 w-40" />
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <LockClosedIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t('title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {clerkConfigured ? t('subtitleClerk') : t('subtitlePassword')}
          </p>
        </div>

        {clerkConfigured && (
          <div className="space-y-3">
            <SignInButton mode="modal" forceRedirectUrl="/">
              <button type="button" className="btn-primary w-full">{t('signIn')}</button>
            </SignInButton>
            <SignUpButton mode="modal" forceRedirectUrl="/">
              <button type="button" className="btn-secondary w-full">{t('createAccount')}</button>
            </SignUpButton>
            <div className="flex items-center gap-3 pt-4 text-xs uppercase tracking-wide text-gray-400">
              <span className="h-px flex-1 bg-gray-200" />
              {t('adminDivider')}
              <span className="h-px flex-1 bg-gray-200" />
            </div>
          </div>
        )}

        <form className={clerkConfigured ? 'space-y-6' : 'mt-8 space-y-6'} onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="sr-only">
              {t('password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('signingIn')}
                </div>
              ) : (
                <>
                  <LockClosedIcon className="h-5 w-5 text-white/70 mr-2" />
                  {clerkConfigured ? t('signInAsAdmin') : t('signIn')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}