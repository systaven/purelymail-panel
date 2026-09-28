import { apiHandler, ApiError, requireInt, requireString } from '@/lib/api';
import { getPurelyMail } from '@/lib/purelymail';

export default apiHandler('admin', {
  GET: async (req, res) => {
    res.status(200).json(await getPurelyMail().listRoutingRules());
  },
  // PurelyMail has no "modify" endpoint; edit a rule by deleting and re-creating it.
  POST: async (req, res) => {
    const { domainName, matchUser, prefix, catchall, targetAddresses } = req.body || {};
    if (!Array.isArray(targetAddresses) || targetAddresses.length === 0) {
      throw new ApiError('At least one target address is required', 400);
    }
    await getPurelyMail().addRoutingRule({
      domainName: requireString(domainName, 'domain'),
      matchUser: typeof matchUser === 'string' ? matchUser.trim() : '',
      prefix: Boolean(prefix),
      catchall: Boolean(catchall),
      targetAddresses: targetAddresses.map((a: unknown) => requireString(a, 'target address')),
    });
    res.status(200).json({ success: true });
  },
  DELETE: async (req, res) => {
    await getPurelyMail().deleteRoutingRule(requireInt(req.body?.id, 'rule id'));
    res.status(200).json({ success: true });
  },
});
