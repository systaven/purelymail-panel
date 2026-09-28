import Layout from '@/components/Layout';
import AccountPage from '@/components/AccountPage';
import { useT } from '@/lib/i18n';
import { shellMessages } from '@/lib/i18n/messages/shell';

export default function Account() {
  const t = useT(shellMessages);
  return (
    <Layout title={t('pageTitle', { page: t('navMyAccount') })}>
      <AccountPage />
    </Layout>
  );
}
