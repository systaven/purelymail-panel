import { ApiError, apiHandler, requireEmail } from '@/lib/api';
import { audit } from '@/lib/accounts';
import { requireMailbox } from '@/lib/mail/route';
import { getPurelyMail, RoutingRule } from '@/lib/purelymail';

// Forwarding for a single mailbox address, as one PurelyMail routing rule that
// matches exactly that address. Guests can't create prefix, catch-all or
// other-address rules, so they can't intercept anyone else's mail.

const MAX_TARGETS = 10;

function rulesFor(rules: RoutingRule[], mailbox: string): RoutingRule[] {
  const [local, domain] = mailbox.split('@');
  return rules.filter(
    (r) => !r.prefix && !r.catchall && r.matchUser.toLowerCase() === local && r.domainName.toLowerCase() === domain
  );
}

export default apiHandler('user', {
  GET: async (req, res, session) => {
    const mailbox = await requireMailbox(session, req.query.mailbox);
    const rule = rulesFor(await getPurelyMail().listRoutingRules(), mailbox)[0];
    const targets = rule?.targetAddresses.map((a) => a.toLowerCase()) ?? [];
    res.status(200).json({
      enabled: Boolean(rule),
      keepCopy: targets.includes(mailbox),
      targets: targets.filter((a) => a !== mailbox),
    });
  },

  // { mailbox, targets: string[], keepCopy: boolean } replaces the forwarding.
  PUT: async (req, res, session) => {
    const mailbox = await requireMailbox(session, req.body?.mailbox);
    const { targets, keepCopy } = req.body || {};
    if (!Array.isArray(targets) || targets.length === 0 || targets.length > MAX_TARGETS) {
      throw new ApiError(`Enter 1 to ${MAX_TARGETS} forwarding addresses`, 400);
    }
    const addresses = Array.from(new Set(targets.map((t: unknown) => requireEmail(t, 'forwarding address'))))
      .filter((a) => a !== mailbox);
    if (addresses.length === 0) {
      throw new ApiError('Forward to an address other than this mailbox', 400);
    }
    const api = getPurelyMail();
    // PurelyMail allows only one rule per address, so replace any existing one.
    for (const rule of rulesFor(await api.listRoutingRules(), mailbox)) {
      await api.deleteRoutingRule(rule.id);
    }
    const [local, domain] = mailbox.split('@');
    await api.addRoutingRule({
      domainName: domain,
      matchUser: local,
      prefix: false,
      catchall: false,
      targetAddresses: keepCopy ? [mailbox, ...addresses] : addresses,
    });
    // Where mail is forwarded stays private; the log only records that it changed.
    await audit(session.actor, 'forwarding.set', mailbox);
    res.status(200).json({ success: true });
  },

  DELETE: async (req, res, session) => {
    const mailbox = await requireMailbox(session, req.body?.mailbox);
    const api = getPurelyMail();
    for (const rule of rulesFor(await api.listRoutingRules(), mailbox)) {
      await api.deleteRoutingRule(rule.id);
    }
    await audit(session.actor, 'forwarding.clear', mailbox);
    res.status(200).json({ success: true });
  },
});
