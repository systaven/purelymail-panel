import Layout from '@/components/Layout';
import ContactsClient from '@/components/contacts/ContactsClient';
import { useT } from '@/lib/i18n';
import { shellMessages } from '@/lib/i18n/messages/shell';

export default function ContactsPage() {
  const t = useT(shellMessages);
  return (
    <Layout title={t('pageTitle', { page: t('navContacts') })} wide>
      <ContactsClient />
    </Layout>
  );
}
