import Layout from '@/components/Layout';
import UserManagement from '@/components/UserManagement';
import { useT } from '@/lib/i18n';
import { shellMessages } from '@/lib/i18n/messages/shell';

export default function UsersPage() {
  const t = useT(shellMessages);
  return (
    <Layout title={t('pageTitle', { page: t('navUsers') })} adminOnly>
      <UserManagement />
    </Layout>
  );
}