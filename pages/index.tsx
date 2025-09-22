import Layout from '@/components/Layout';
import DashboardOverview from '@/components/DashboardOverview';

export default function Home() {
  return (
    <Layout title="Dashboard - PurelyMail Management">
      <DashboardOverview />
    </Layout>
  );
}