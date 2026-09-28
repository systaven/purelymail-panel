import Layout from '@/components/Layout';
import DashboardOverview from '@/components/DashboardOverview';
import MyMailboxes from '@/components/MyMailboxes';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const { isAdmin } = useAuth();
  return (
    <Layout title={isAdmin ? 'Dashboard - PurelyMail Management' : 'My mailboxes - PurelyMail Management'}>
      {isAdmin ? <DashboardOverview /> : <MyMailboxes />}
    </Layout>
  );
}
