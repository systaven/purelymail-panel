import { ReactNode, useEffect, useState } from 'react';
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
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { UserButton } from '@clerk/nextjs';
import { useAuth } from '@/hooks/useAuth';
import { clerkConfigured } from '@/lib/clerk-client';
import ThemeToggle from './ThemeToggle';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  // Page is for admins only; guests see a notice instead of the content.
  adminOnly?: boolean;
  // Less padding, for full-height apps like Mail.
  wide?: boolean;
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

export default function Layout({ children, title = 'PurelyMail Management', adminOnly = false, wide = false }: LayoutProps) {
  const router = useRouter();
  const { logout, user, isAdmin, disabled } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigation = [...(isAdmin ? adminNavigation : guestNavigation), ...(clerkConfigured ? [accountItem] : [])];
  const current = navigation.find((item) => item.href === router.pathname);

  // Close the mobile drawer after navigating.
  useEffect(() => {
    setDrawerOpen(false);
  }, [router.pathname, router.query.mailbox]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-6">
        <span className="text-xl font-bold text-gray-900">PurelyMail</span>
        <button className="rounded-md p-1 text-gray-500 hover:bg-gray-100 lg:hidden" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col space-y-1 overflow-y-auto px-4 py-6">
        {navigation.map((item) => {
          const isActive = router.pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-gray-200 px-4 py-4">
        <ThemeToggle />
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 text-sm text-gray-600">
            Signed in as <span className="break-all font-medium text-gray-900">{user || 'admin'}</span>
            <div className="text-xs text-gray-400">{isAdmin ? 'Administrator' : 'Guest'}</div>
          </div>
          {/* Renders nothing unless someone is signed in to Clerk. */}
          {clerkConfigured && <UserButton />}
        </div>
        <button
          onClick={logout}
          className="group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="PurelyMail Management Panel" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Sidebar: fixed on large screens, a drawer below that. */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-gray-200 bg-surface lg:block">{sidebar}</aside>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface shadow-xl">{sidebar}</aside>
          </div>
        )}

        {/* Top bar on small screens */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-surface/95 px-4 backdrop-blur lg:hidden">
          <button className="-ml-1 rounded-md p-1.5 text-gray-600 hover:bg-gray-100" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <Bars3Icon className="h-6 w-6" />
          </button>
          <span className="truncate font-semibold text-gray-900">{current?.name || 'PurelyMail'}</span>
        </header>

        <div className="lg:pl-64">
          <main className={wide ? 'px-2 py-2 sm:px-4 sm:py-4 lg:px-6 lg:py-6' : 'px-4 py-6 sm:px-6 lg:px-8 lg:py-8'}>
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
