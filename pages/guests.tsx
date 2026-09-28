import Layout from '@/components/Layout';
import GuestsAdmin from '@/components/GuestsAdmin';

export default function GuestsPage() {
  return (
    <Layout title="Guests - PurelyMail Management" adminOnly>
      <GuestsAdmin />
    </Layout>
  );
}
