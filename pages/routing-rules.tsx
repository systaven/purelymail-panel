import Layout from '@/components/Layout';
import RoutingRulesManagement from '@/components/RoutingRulesManagement';
import { useT } from '@/lib/i18n';
import { shellMessages } from '@/lib/i18n/messages/shell';

export default function RoutingRulesPage() {
  const t = useT(shellMessages);
  return (
    <Layout title={t('pageTitle', { page: t('navRoutingRules') })} adminOnly>
      <RoutingRulesManagement />
    </Layout>
  );
}