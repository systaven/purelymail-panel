import Layout from '@/components/Layout';
import GuestsAdmin from '@/components/GuestsAdmin';
import { useT } from '@/lib/i18n';
import { shellMessages } from '@/lib/i18n/messages/shell';

export default function GuestsPage() {
  const t = useT(shellMessages);
  return (
    <Layout title={t('pageTitle', { page: t('navGuests') })} adminOnly>
      <GuestsAdmin />
    </Layout>
  );
}
