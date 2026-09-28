import Layout from '@/components/Layout';
import DomainManagement from '@/components/DomainManagement';

export default function DomainsPage() {
  return (
    <Layout title="Domains - PurelyMail Management" adminOnly>
      <DomainManagement />
    </Layout>
  );
}