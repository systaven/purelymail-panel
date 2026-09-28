import { apiHandler, requireString } from '@/lib/api';
import { getPurelyMail } from '@/lib/purelymail';

export default apiHandler('admin', {
  GET: async (req, res) => {
    res.status(200).json(await getPurelyMail().listDomains());
  },
  POST: async (req, res) => {
    await getPurelyMail().addDomain(requireString(req.body?.domainName, 'domain'));
    res.status(200).json({ success: true });
  },
  DELETE: async (req, res) => {
    await getPurelyMail().deleteDomain(requireString(req.body?.domainName, 'domain'));
    res.status(200).json({ success: true });
  },
});
