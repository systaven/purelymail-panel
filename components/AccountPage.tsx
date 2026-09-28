import { useEffect, useRef, useState } from 'react';
import { SignInButton, SignUpButton, UserProfile, useClerk, useUser } from '@clerk/nextjs';
import { useAuth } from '@/hooks/useAuth';
import { clerkConfigured } from '@/lib/clerk-client';

async function call(url: string, method: string) {
  const response = await fetch(url, { method });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

// The password admin can link a Clerk account, which makes it an admin so
// they can sign in with Clerk later.
function LinkClerk() {
  const { clerk, refetch } = useAuth();
  const { signOut } = useClerk();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refetch();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!clerk) {
    return (
      <div className="card space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Link a Clerk account</h2>
        <p className="text-sm text-gray-600">
          Sign in to (or create) the Clerk account you want to use. It becomes an administrator, so next
          time you can sign in with Clerk instead of the admin password. The password keeps working.
        </p>
        <div className="flex flex-wrap gap-3">
          <SignInButton mode="modal" forceRedirectUrl="/account">
            <button className="btn-primary">Sign in to Clerk</button>
          </SignInButton>
          <SignUpButton mode="modal" forceRedirectUrl="/account">
            <button className="btn-secondary">Create a Clerk account</button>
          </SignUpButton>
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Clerk account</h2>
      <p className="text-sm text-gray-600">
        Signed in to Clerk as <span className="font-medium text-gray-900">{clerk.email || 'unknown'}</span>
        {clerk.linkedAdmin ? ', which is linked as an administrator.' : ', which is not linked yet.'}
      </p>
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="flex flex-wrap gap-3">
        {clerk.linkedAdmin ? (
          <button className="btn-danger" disabled={busy} onClick={() => {
            if (confirm('Make this Clerk account a guest again?')) run(() => call('/api/admin/link-clerk', 'DELETE'));
          }}>
            Unlink
          </button>
        ) : (
          <button className="btn-primary" disabled={busy} onClick={() => run(() => call('/api/admin/link-clerk', 'POST'))}>
            Link as administrator
          </button>
        )}
        <button className="btn-secondary" disabled={busy} onClick={() => run(() => signOut({ redirectUrl: '/account' }))}>
          Use a different Clerk account
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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My account</h1>
        <p className="mt-2 text-gray-600">Profile, email addresses, password, two-factor authentication and connected accounts.</p>
      </div>
      {clerkConfigured ? (
        <ClerkAccount />
      ) : (
        <div className="card text-gray-600">
          Clerk isn't configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to enable accounts.
        </div>
      )}
    </div>
  );
}
