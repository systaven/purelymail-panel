import Layout from '@/components/Layout';
import DomainManagement from '@/components/DomainManagement';
import { useT } from '@/lib/i18n';
import { shellMessages } from '@/lib/i18n/messages/shell';

export default function DomainsPage() {
  const t = useT(shellMessages);
  return (
    <Layout title={t('pageTitle', { page: t('navDomains') })} adminOnly>
      <DomainManagement />
    </Layout>
  );
}