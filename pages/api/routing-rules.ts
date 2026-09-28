import { apiHandler, ApiError, requireInt, requireString } from '@/lib/api';
import { listAllOwners } from '@/lib/accounts';
import { getPurelyMail, RoutingRule } from '@/lib/purelymail';
import { exactRules, interceptingRules } from '@/lib/provisioning';

async function privateMailboxes(): Promise<string[]> {
  return (await listAllOwners().catch(() => [])).map((o) => o.mailbox);
}

export default apiHandler('admin', {
  // Forwarding that owners set for their private mailboxes is listed without
  // its destinations.
  GET: async (req, res) => {
    const [rules, owned] = await Promise.all([getPurelyMail().listRoutingRules(), privateMailboxes()]);
    const ownerRules = new Set(owned.flatMap((m) => exactRules(rules, m)).map((r) => r.id));
    res.status(200).json(rules.map((r): RoutingRule & { private?: boolean } =>
      ownerRules.has(r.id) ? { ...r, targetAddresses: [], private: true } : r
    ));
  },

  // PurelyMail has no "modify" endpoint; edit a rule by deleting and re-creating it.
  POST: async (req, res) => {
    const { domainName, matchUser, prefix, catchall, targetAddresses } = req.body || {};
    if (!Array.isArray(targetAddresses) || targetAddresses.length === 0) {
      throw new ApiError('At least one target address is required', 400, 'rule_needs_target');
    }
    const rule = {
      domainName: requireString(domainName, 'domain').toLowerCase(),
      matchUser: typeof matchUser === 'string' ? matchUser.trim().toLowerCase() : '',
      prefix: Boolean(prefix),
      catchall: Boolean(catchall),
      targetAddresses: targetAddresses.map((a: unknown) => requireString(a, 'target address')),
    };
    // Don't let a rule divert mail addressed to someone's private mailbox.
    const hit = (await privateMailboxes()).find((m) => interceptingRules([{ ...rule, id: 0 }], m).length > 0);
    if (hit) {
      throw new ApiError(`This rule would redirect mail for ${hit}, which is private to its owner`, 403, 'rule_intercepts_private', { address: hit });
    }
    await getPurelyMail().addRoutingRule(rule);
    res.status(200).json({ success: true });
  },

  DELETE: async (req, res) => {
    await getPurelyMail().deleteRoutingRule(requireInt(req.body?.id, 'rule id'));
    res.status(200).json({ success: true });
  },
});
