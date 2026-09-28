import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useT } from '@/lib/i18n';
import { commonMessages } from '@/lib/i18n/messages/common';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const t = useT(commonMessages);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-700">{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // The useAuth hook will handle redirecting to login
    return null;
  }

  return <>{children}</>;
};