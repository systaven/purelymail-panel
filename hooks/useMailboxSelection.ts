import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { mailApi } from '@/components/mail/api';
import { useT } from '@/lib/i18n';
import { mailMessages } from '@/lib/i18n/messages/mail';
import { useErrorText } from '@/lib/i18n/useErrorText';

// The mailboxes the viewer may open, and the one picked with ?mailbox= (the
// first one by default). `ready` turns true once the mailbox's credentials are
// set up, so the page can then load from it in parallel.
export function useMailboxSelection() {
  const router = useRouter();
  const t = useT(mailMessages);
  const errorText = useErrorText();
  const [mailboxes, setMailboxes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [readyMailbox, setReadyMailbox] = useState('');

  useEffect(() => {
    mailApi.mailboxes()
      .then((names) => {
        setMailboxes(names);
        if (!names.length) setError(t('noMailboxes'));
      })
      .catch((err) => setError(errorText(err)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fromQuery = typeof router.query.mailbox === 'string' ? router.query.mailbox.toLowerCase() : '';
  const mailbox = mailboxes?.length && router.isReady ? (mailboxes.includes(fromQuery) ? fromQuery : mailboxes[0]) : '';

  useEffect(() => {
    if (!mailbox) return;
    let cancelled = false;
    setReadyMailbox('');
    mailApi.prepare(mailbox)
      .catch(() => {}) // the page's own loads report the error
      .finally(() => { if (!cancelled) setReadyMailbox(mailbox); });
    return () => { cancelled = true; };
  }, [mailbox]);

  // Other query parameters (an open message, a folder...) belong to the old mailbox.
  const setMailbox = (next: string) => {
    router.replace({ pathname: router.pathname, query: { mailbox: next } }, undefined, { shallow: true });
  };

  return { mailboxes: mailboxes || [], mailbox, setMailbox, ready: Boolean(mailbox) && readyMailbox === mailbox, error };
}
