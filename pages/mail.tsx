import Layout from '@/components/Layout';
import MailClient from '@/components/mail/MailClient';

export default function MailPage() {
  return (
    <Layout title="Mail - PurelyMail Management">
      <MailClient />
    </Layout>
  );
}
