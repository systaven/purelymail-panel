import Layout from '@/components/Layout';
import CalendarClient from '@/components/calendar/CalendarClient';
import { useT } from '@/lib/i18n';
import { shellMessages } from '@/lib/i18n/messages/shell';

export default function CalendarPage() {
  const t = useT(shellMessages);
  return (
    <Layout title={t('pageTitle', { page: t('navCalendar') })} wide>
      <CalendarClient />
    </Layout>
  );
}
