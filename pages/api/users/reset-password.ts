import { apiHandler, requireEmail } from '@/lib/api';
import { getPurelyMail } from '@/lib/purelymail';

export default apiHandler('admin', {
  POST: async (req, res) => {
    const { userName, method } = req.body || {};
    await getPurelyMail().upsertPasswordReset(requireEmail(userName), method);
    res.status(200).json({ success: true, message: 'Password reset method configured' });
  },
});
