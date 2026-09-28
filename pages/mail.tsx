import Layout from '@/components/Layout';
import MailClient from '@/components/mail/MailClient';
import { useT } from '@/lib/i18n';
import { shellMessages } from '@/lib/i18n/messages/shell';

export default function MailPage() {
  const t = useT(shellMessages);
  return (
    <Layout title={t('pageTitle', { page: t('navMail') })} wide>
      <MailClient />
    </Layout>
  );
}
