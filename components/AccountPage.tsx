import { useEffect, useRef, useState } from 'react';
import { SignInButton, SignUpButton, UserProfile, useClerk, useUser } from '@clerk/nextjs';
import { useAuth } from '@/hooks/useAuth';
import { clerkConfigured } from '@/lib/clerk-client';
import { apiFetch } from '@/lib/client-api';
import { useT } from '@/lib/i18n';
import { useErrorText } from '@/lib/i18n/useErrorText';
import { accountMessages } from '@/lib/i18n/messages/account';

// The password admin can link a Clerk account, which makes it an admin so
// they can sign in with Clerk later.
function LinkClerk() {
  const { clerk, refetch } = useAuth();
  const { signOut } = useClerk();
  const t = useT(accountMessages);
  const errorText = useErrorText();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refetch();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (!clerk) {
    return (
      <div className="card space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">{t('linkTitle')}</h2>
        <p className="text-sm text-gray-600">{t('linkDescription')}</p>
        <div className="flex flex-wrap gap-3">
          <SignInButton mode="modal" forceRedirectUrl="/account">
            <button className="btn-primary">{t('signInToClerk')}</button>
          </SignInButton>
          <SignUpButton mode="modal" forceRedirectUrl="/account">
            <button className="btn-secondary">{t('createClerkAccount')}</button>
          </SignUpButton>
        </div>
      </div>
    );
  }

  // Split the sentence around the email so it can be shown in bold.
  const [beforeEmail, afterEmail] = t(clerk.linkedAdmin ? 'signedInLinked' : 'signedInNotLinked').split('{email}');

  return (
    <div className="card space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">{t('clerkAccount')}</h2>
      <p className="text-sm text-gray-600">
        {beforeEmail}<span className="font-medium text-gray-900">{clerk.email || t('unknownEmail')}</span>{afterEmail}
      </p>
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="flex flex-wrap gap-3">
        {clerk.linkedAdmin ? (
          <button className="btn-danger" disabled={busy} onClick={() => {
            if (confirm(t('confirmUnlink'))) run(() => apiFetch('/api/admin/link-clerk', 'DELETE'));
          }}>
            {t('unlink')}
          </button>
        ) : (
          <button className="btn-primary" disabled={busy} onClick={() => run(() => apiFetch('/api/admin/link-clerk', 'POST'))}>
            {t('linkAsAdmin')}
          </button>
        )}
        <button className="btn-secondary" disabled={busy} onClick={() => run(() => signOut({ redirectUrl: '/account' }))}>
          {t('useDifferentAccount')}
        </button>
      </div>
    </div>
  );
}

function ClerkAccount() {
  const { via } = useAuth();
  const { refetch } = useAuth();
  const { user, isLoaded } = useUser();

  // A modal sign-in doesn't change the route, so refresh the server's view of it.
  const lastUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!isLoaded) return;
    const id = user?.id ?? null;
    if (lastUserId.current !== undefined && lastUserId.current !== id) refetch();
    lastUserId.current = id;
  }, [isLoaded, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {via === 'password' && <LinkClerk />}
      {user && (
        <div className="overflow-x-auto">
          <UserProfile routing="hash" />
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  const t = useT(accountMessages);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-2 text-gray-600">{t('subtitle')}</p>
      </div>
      {clerkConfigured ? (
        <ClerkAccount />
      ) : (
        <div className="card text-gray-600">
          {t('notConfigured')}
        </div>
      )}
    </div>
  );
}
