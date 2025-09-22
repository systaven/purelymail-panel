import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user?: string;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
  });
  const router = useRouter();

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/verify');
      const data = await response.json();

      if (response.ok && data.authenticated) {
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: data.user,
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
        });
        
        // Redirect to login if not on login page
        if (router.pathname !== '/login') {
          router.push('/login');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
      });
      
      if (router.pathname !== '/login') {
        router.push('/login');
      }
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
      });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [router.pathname]);

  return {
    ...authState,
    logout,
    refetch: checkAuth,
  };
};