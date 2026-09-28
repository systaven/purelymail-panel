import { ImapFlow } from 'imapflow';
import nodemailer, { Transporter } from 'nodemailer';
import type { MailboxHandle } from './handle';

const IMAP_HOST = process.env.MAIL_IMAP_HOST || 'imap.purelymail.com';
const IMAP_PORT = Number(process.env.MAIL_IMAP_PORT || 993);
const SMTP_HOST = process.env.MAIL_SMTP_HOST || 'smtp.purelymail.com';
const SMTP_PORT = Number(process.env.MAIL_SMTP_PORT || 465);
// Implicit TLS unless told otherwise; ports 587 and 25 conventionally use STARTTLS.
const SMTP_SECURE = process.env.MAIL_SMTP_SECURE
  ? process.env.MAIL_SMTP_SECURE === 'true'
  : SMTP_PORT !== 587 && SMTP_PORT !== 25;

function isAuthError(error: any): boolean {
  return Boolean(error?.authenticationFailed || error?.responseCode === 535 || error?.code === 'EAUTH');
}

// Runs `fn` with a password for the mailbox. If login fails (e.g. the app
// password was deleted in PurelyMail), a fresh one is created and `fn` retried once.
async function withPassword<T>(box: MailboxHandle, fn: (password: string) => Promise<T>): Promise<T> {
  try {
    return await fn(await box.credentials.get());
  } catch (error) {
    if (!isAuthError(error)) {
      throw error;
    }
    await box.credentials.invalidate();
    return fn(await box.credentials.get());
  }
}

// Opens an IMAP connection for the duration of `fn`. Connections are
// per request because serverless hosts can't keep them open between requests.
export function withImap<T>(box: MailboxHandle, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  return withPassword(box, async (password) => {
    const client = new ImapFlow({
      host: IMAP_HOST,
      port: IMAP_PORT,
      secure: true,
      auth: { user: box.address, pass: password },
      logger: false,
      disableAutoIdle: true,
    });
    await client.connect();
    try {
      return await fn(client);
    } finally {
      await client.logout().catch(() => client.close());
    }
  });
}

export function withSmtp<T>(
  box: MailboxHandle,
  fn: (transport: Transporter) => Promise<T>
): Promise<T> {
  return withPassword(box, async (password) => {
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: box.address, pass: password },
    });
    try {
      return await fn(transport);
    } finally {
      transport.close();
    }
  });
}
