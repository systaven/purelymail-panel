import { ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  HomeIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  UsersIcon,
  CogIcon,
  EnvelopeIcon,
  ArrowRightOnRectangleIcon,
  UserGroupIcon,
  UserCircleIcon,
  InboxStackIcon,
} from '@heroicons/react/24/outline';
import { UserButton } from '@clerk/nextjs';
import { useAuth } from '@/hooks/useAuth';
import { clerkConfigured } from '@/lib/clerk-client';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  // Page is for admins only; guests see a notice instead of the content.
  adminOnly?: boolean;
}

const adminNavigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Domains', href: '/domains', icon: GlobeAltIcon },
  { name: 'Routing Rules', href: '/routing-rules', icon: ArrowPathIcon },
  { name: 'Users', href: '/users', icon: UsersIcon },
  { name: 'Guests', href: '/guests', icon: UserGroupIcon },
  { name: 'Mail', href: '/mail', icon: EnvelopeIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

const guestNavigation = [
  { name: 'My mailboxes', href: '/', icon: InboxStackIcon },
  { name: 'Mail', href: '/mail', icon: EnvelopeIcon },
];

const accountItem = { name: 'My account', href: '/account', icon: UserCircleIcon };

export default function Layout({ children, title = 'PurelyMail Management', adminOnly = false }: LayoutProps) {
  const router = useRouter();
  const { logout, user, isAdmin, disabled } = useAuth();
  const navigation = [...(isAdmin ? adminNavigation : guestNavigation), ...(clerkConfigured ? [accountItem] : [])];

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="PurelyMail Management Panel" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-200">
              <h1 className="text-xl font-bold text-gray-900">PurelyMail</h1>
            </div>

            {/* Navigation */}
            <nav className="flex flex-1 flex-col px-4 py-6 space-y-1">
              {navigation.map((item) => {
                const isActive = router.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 ${
                        isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* User info and logout */}
            <div className="px-4 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0 text-sm text-gray-600">
                  Signed in as <span className="font-medium text-gray-900 break-all">{user || 'admin'}</span>
                  <div className="text-xs text-gray-400">{isAdmin ? 'Administrator' : 'Guest'}</div>
                </div>
                {/* Renders nothing unless someone is signed in to Clerk. */}
                {clerkConfigured && <UserButton />}
              </div>
              <button
                onClick={logout}
                className="group flex w-full items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="pl-64">
          <main className="py-8 px-8">
            {disabled ? (
              <div className="rounded-md bg-red-50 p-4 text-red-700">
                Your account has been disabled. Contact the administrator if you think this is a mistake.
              </div>
            ) : adminOnly && !isAdmin ? (
              <div className="rounded-md bg-yellow-50 p-4 text-yellow-800">This page is only available to administrators.</div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </>
  );
}