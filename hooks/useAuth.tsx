import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user?: string;
  role?: 'admin' | 'guest';
  // How this session signed in: the admin password or Clerk.
  via?: 'password' | 'clerk';
  disabled?: boolean;
  clerkEnabled?: boolean;
  // The Clerk account signed in alongside a password admin session, if any.
  clerk?: { email: string | null; linkedAdmin: boolean } | null;
}

interface AuthContextValue extends AuthState {
  isAdmin: boolean;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Runs the auth check once per navigation and shares the result, so
// AuthGuard and Layout don't each call /api/auth/verify.
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false, isLoading: true });
  const router = useRouter();

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/verify');
      const data = await response.json();
      if (response.ok && data.authenticated) {
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: data.user ?? undefined,
          role: data.role,
          via: data.via,
          disabled: data.disabled,
          clerkEnabled: data.clerkEnabled,
          clerk: data.clerk,
        });
        return;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
    setAuthState({ isAuthenticated: false, isLoading: false });
    if (router.pathname !== '/login') {
      router.push('/login');
    }
  };

  // Ends both kinds of session: the admin password cookie and Clerk.
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      const clerk = (window as any).Clerk;
      if (clerk?.user) {
        await clerk.signOut();
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
    setAuthState({ isAuthenticated: false, isLoading: false });
    router.push('/login');
  };

  useEffect(() => {
    checkAuth();
  }, [router.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ ...authState, isAdmin: authState.role === 'admin', logout, refetch: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
