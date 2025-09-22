import { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

interface StatsCardProps {
  title: string;
  value: string | number;
  loading?: boolean;
}

function StatsCard({ title, value, loading }: StatsCardProps) {
  return (
    <div className="card">
      <div className="flex items-center">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {loading ? (
            <div className="mt-1 h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

function QuickActionCard({ title, description, href, icon: Icon }: QuickAction) {
  return (
    <a
      href={href}
      className="card hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className="h-8 w-8 text-primary-600 group-hover:text-primary-700" />
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-medium text-gray-900 group-hover:text-primary-700">
            {title}
          </h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </a>
  );
}

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    domains: 0,
    users: 0,
    routingRules: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [domainsResponse, usersResponse, rulesResponse] = await Promise.all([
        fetch('/api/domains'),
        fetch('/api/users'),
        fetch('/api/routing-rules'),
      ]);

      const domains = await domainsResponse.json();
      const users = await usersResponse.json();
      const rules = await rulesResponse.json();

      setStats({
        domains: Array.isArray(domains) ? domains.length : 0,
        users: Array.isArray(users) ? users.length : 0,
        routingRules: Array.isArray(rules) ? rules.length : 0,
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const quickActions: QuickAction[] = [
    {
      title: 'Add Domain',
      description: 'Register a new domain for email hosting',
      href: '/domains',
      icon: PlusIcon,
    },
    {
      title: 'Create User',
      description: 'Add a new email user to your domain',
      href: '/users',
      icon: PlusIcon,
    },
    {
      title: 'Setup Routing',
      description: 'Configure email routing rules',
      href: '/routing-rules',
      icon: PlusIcon,
    },
  ];

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome to your PurelyMail management panel
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard title="Domains" value={stats.domains} loading={loading} />
        <StatsCard title="Users" value={stats.users} loading={loading} />
        <StatsCard title="Routing Rules" value={stats.routingRules} loading={loading} />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <QuickActionCard key={action.title} {...action} />
          ))}
        </div>
      </div>
    </div>
  );
}