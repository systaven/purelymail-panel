import { apiHandler } from '@/lib/api';
import { getPurelyMail } from '@/lib/purelymail';

export default apiHandler('admin', {
  GET: async (req, res) => {
    res.status(200).json(await getPurelyMail().checkAccountCredit());
  },
});
