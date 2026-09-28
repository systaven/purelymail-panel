import { mailHandler, openMailbox } from '@/lib/mail/route';

export default mailHandler({
  // Makes sure webmail credentials exist before the page loads mail in parallel,
  // so concurrent requests don't each create an app password.
  POST: async (req, res, session) => {
    const box = await openMailbox(session, req.body?.mailbox, req, res);
    await box.credentials.get();
    res.status(200).json({ success: true });
  },
  // "Reset access": deletes the panel's app password for the mailbox (in
  // PurelyMail, and wherever it was kept). A new one is made on next use.
  DELETE: async (req, res, session) => {
    const box = await openMailbox(session, req.body?.mailbox, req, res);
    await box.credentials.revoke();
    res.status(200).json({ success: true });
  },
});
