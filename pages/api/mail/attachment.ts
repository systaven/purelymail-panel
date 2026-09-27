import { getAttachment } from '@/lib/mail/operations';
import { mailHandler, requireMailbox, requireString, requireUid } from '@/lib/mail/route';

export const config = {
  api: { responseLimit: false },
};

export default mailHandler({
  GET: async (req, res) => {
    const attachment = await getAttachment(
      requireMailbox(req.query.mailbox),
      requireString(req.query.folder, 'folder'),
      requireUid(req.query.uid),
      requireUid(req.query.index, 'index')
    );
    // Always download rather than render, so attachments can't run in the panel's origin.
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(attachment.content);
  },
});
