import Layout from '@/components/Layout';
import UserManagement from '@/components/UserManagement';

export default function UsersPage() {
  return (
    <Layout title="Users - PurelyMail Management">
      <UserManagement />
    </Layout>
  );
}