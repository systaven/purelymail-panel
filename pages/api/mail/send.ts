import { MailError, OutgoingMessage, sendMessage } from '@/lib/mail/operations';
import { mailHandler, openMailbox, requireString } from '@/lib/mail/route';

// Attachments arrive base64-encoded in the JSON body (about 4/3 of their size).
export const config = {
  api: { bodyParser: { sizeLimit: '15mb' } },
};

export default mailHandler({
  POST: async (req, res, session) => {
    const { mailbox, to, cc, bcc, subject, text, inReplyTo, references, attachments } = req.body || {};
    if (attachments !== undefined && !Array.isArray(attachments)) {
      throw new MailError('Invalid attachments', 400);
    }
    const message: OutgoingMessage = {
      to: requireString(to, 'recipient'),
      cc: typeof cc === 'string' ? cc : undefined,
      bcc: typeof bcc === 'string' ? bcc : undefined,
      subject: typeof subject === 'string' ? subject : '',
      text: typeof text === 'string' ? text : '',
      inReplyTo: typeof inReplyTo === 'string' ? inReplyTo : undefined,
      references: Array.isArray(references) ? references.filter((r) => typeof r === 'string') : undefined,
      attachments: (attachments || []).map((a: any) => ({
        filename: requireString(a?.filename, 'attachment filename'),
        contentType: typeof a?.contentType === 'string' && a.contentType ? a.contentType : 'application/octet-stream',
        content: requireString(a?.content, 'attachment content'),
      })),
    };
    await sendMessage(await openMailbox(session, mailbox, req, res), message);
    res.status(200).json({ success: true });
  },
});
