import Layout from '@/components/Layout';
import DashboardOverview from '@/components/DashboardOverview';
import MyMailboxes from '@/components/MyMailboxes';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';
import { shellMessages } from '@/lib/i18n/messages/shell';

export default function Home() {
  const { isAdmin } = useAuth();
  const t = useT(shellMessages);
  return (
    <Layout title={t('pageTitle', { page: t(isAdmin ? 'navDashboard' : 'navMyMailboxes') })}>
      {isAdmin ? <DashboardOverview /> : <MyMailboxes />}
    </Layout>
  );
}
