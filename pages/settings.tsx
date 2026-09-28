import Layout from '@/components/Layout';
import AccountSettings from '@/components/AccountSettings';
import { useT } from '@/lib/i18n';
import { shellMessages } from '@/lib/i18n/messages/shell';

export default function SettingsPage() {
  const t = useT(shellMessages);
  return (
    <Layout title={t('pageTitle', { page: t('navSettings') })} adminOnly>
      <AccountSettings />
    </Layout>
  );
}