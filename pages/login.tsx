import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { clerkConfigured } from '@/lib/clerk-client';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to dashboard
        router.push('/');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <LockClosedIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            PurelyMail Panel Access
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {clerkConfigured ? 'Sign in or create an account to manage your mailboxes' : 'Enter your admin password to continue'}
          </p>
        </div>

        {clerkConfigured && (
          <div className="space-y-3">
            <SignInButton mode="modal" forceRedirectUrl="/">
              <button type="button" className="btn-primary w-full">Sign in</button>
            </SignInButton>
            <SignUpButton mode="modal" forceRedirectUrl="/">
              <button type="button" className="btn-secondary w-full">Create an account</button>
            </SignUpButton>
            <div className="flex items-center gap-3 pt-4 text-xs uppercase tracking-wide text-gray-400">
              <span className="h-px flex-1 bg-gray-200" />
              Administrator
              <span className="h-px flex-1 bg-gray-200" />
            </div>
          </div>
        )}

        <form className={clerkConfigured ? 'space-y-6' : 'mt-8 space-y-6'} onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Admin password"
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
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                <>
                  <LockClosedIcon className="h-5 w-5 text-blue-500 group-hover:text-blue-400 mr-2" />
                  {clerkConfigured ? 'Sign in as admin' : 'Sign in'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}