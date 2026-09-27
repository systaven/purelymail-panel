import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import {
  ArrowPathIcon,
  FolderIcon,
  InboxIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  TrashIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';
import {
  formatAddress,
  formatAddresses,
  formatDate,
  MailAddress,
  mailApi,
  MailFolder,
  MessageAction,
  MessageDetail,
  MessageList,
} from './api';
import MessageListPane from './MessageListPane';
import MessageView, { ReplyMode } from './MessageView';
import ComposeModal, { ComposeDraft, emptyDraft } from './ComposeModal';

const POLL_INTERVAL_MS = 30_000;

const FOLDER_ICONS: Record<string, typeof FolderIcon> = {
  '\\Inbox': InboxIcon,
  '\\Sent': PaperAirplaneIcon,
  '\\Drafts': DocumentIcon,
  '\\Trash': TrashIcon,
  '\\Junk': ExclamationTriangleIcon,
  '\\Archive': ArchiveBoxIcon,
};

function withPrefix(prefix: string, subject: string, pattern: RegExp): string {
  return pattern.test(subject) ? subject : `${prefix} ${subject}`;
}

function quote(text: string): string {
  return text.split('\n').map((line) => `> ${line}`).join('\n');
}

function buildReply(message: MessageDetail, mode: ReplyMode, self: string): ComposeDraft {
  const notSelf = (a: MailAddress) => a.address?.toLowerCase() !== self;
  const references = [...message.references, ...(message.messageId ? [message.messageId] : [])];

  if (mode === 'forward') {
    return {
      ...emptyDraft,
      subject: withPrefix('Fwd:', message.subject, /^fwd?:/i),
      text: [
        '',
        '',
        '---------- Forwarded message ----------',
        `From: ${formatAddresses(message.from)}`,
        `Date: ${formatDate(message.date, true)}`,
        `Subject: ${message.subject}`,
        `To: ${formatAddresses(message.to)}`,
        '',
        message.text,
      ].join('\n'),
    };
  }

  const replyTo = message.replyTo.length ? message.replyTo : message.from;
  const to = mode === 'replyAll' ? [...replyTo, ...message.to.filter(notSelf)] : replyTo;
  const cc = mode === 'replyAll' ? message.cc.filter(notSelf) : [];
  const unique = (list: MailAddress[]) =>
    list.filter((a, i) => list.findIndex((b) => b.address === a.address) === i).map(formatAddress).join(', ');

  return {
    ...emptyDraft,
    to: unique(to),
    cc: unique(cc),
    subject: withPrefix('Re:', message.subject, /^re:/i),
    text: `\n\nOn ${formatDate(message.date, true)}, ${formatAddresses(message.from)} wrote:\n${quote(message.text)}`,
    inReplyTo: message.messageId,
    references,
  };
}

export default function MailClient() {
  const router = useRouter();
  const [mailboxes, setMailboxes] = useState<string[]>([]);
  const [mailbox, setMailbox] = useState<string>('');
  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [folder, setFolder] = useState('INBOX');
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [list, setList] = useState<MessageList | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [showImages, setShowImages] = useState(false);
  const [compose, setCompose] = useState<{ title: string; draft: ComposeDraft } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Ignore responses that arrive after the user switched mailbox/folder/page.
  const listRequest = useRef(0);
  const messageRequest = useRef(0);

  useEffect(() => {
    mailApi.mailboxes()
      .then((names) => {
        setMailboxes(names);
        if (!names.length) setSetupError('No mailboxes found. Create a user first.');
      })
      .catch((err) => setSetupError(err.message));
  }, []);

  // Pick the mailbox from ?mailbox=, falling back to the first one.
  useEffect(() => {
    if (!router.isReady || !mailboxes.length) return;
    const fromQuery = typeof router.query.mailbox === 'string' ? router.query.mailbox.toLowerCase() : '';
    const next = mailboxes.includes(fromQuery) ? fromQuery : mailboxes[0];
    if (next !== mailbox) {
      setMailbox(next);
      setFolder('INBOX');
      setPage(0);
      setSearch('');
      setSearchInput('');
      setList(null);
      setFolders([]);
      setSelectedUid(null);
      setMessage(null);
      setChecked(new Set());
    }
  }, [router.isReady, router.query.mailbox, mailboxes]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFolders = useCallback(async () => {
    if (!mailbox) return;
    try {
      setFolders(await mailApi.folders(mailbox));
    } catch (err: any) {
      setListError(err.message);
    }
  }, [mailbox]);

  const loadList = useCallback(async (silent = false) => {
    if (!mailbox) return;
    const id = ++listRequest.current;
    if (!silent) {
      setListLoading(true);
      setListError(null);
    }
    try {
      const result = await mailApi.messages(mailbox, folder, page, search);
      if (id === listRequest.current) setList(result);
    } catch (err: any) {
      if (id === listRequest.current && !silent) setListError(err.message);
    } finally {
      if (id === listRequest.current) setListLoading(false);
    }
  }, [mailbox, folder, page, search]);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { loadList(); }, [loadList]);

  // Poll for new mail while the tab is visible.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadFolders();
        loadList(true);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadFolders, loadList]);

  const refresh = () => {
    loadFolders();
    loadList();
  };

  const openMessage = async (uid: number, images = false) => {
    const id = ++messageRequest.current;
    setSelectedUid(uid);
    setShowImages(images);
    setMessageLoading(true);
    setMessageError(null);
    try {
      const detail = await mailApi.message(mailbox, folder, uid, images);
      if (id !== messageRequest.current) return;
      setMessage(detail);
      // Reflect the read state locally without refetching the list.
      setList((prev) => prev && {
        ...prev,
        messages: prev.messages.map((m) => (m.uid === uid ? { ...m, seen: true } : m)),
      });
      if (list?.messages.find((m) => m.uid === uid && !m.seen)) loadFolders();
    } catch (err: any) {
      if (id === messageRequest.current) setMessageError(err.message);
    } finally {
      if (id === messageRequest.current) setMessageLoading(false);
    }
  };

  const runAction = async (uids: number[], action: MessageAction, target?: string) => {
    try {
      await mailApi.action(mailbox, folder, uids, action, target);
      if ((action === 'move' || action === 'delete') && selectedUid !== null && uids.includes(selectedUid)) {
        setSelectedUid(null);
        setMessage(null);
      } else if (message && uids.includes(message.uid)) {
        setMessage({
          ...message,
          flagged: action === 'flag' ? true : action === 'unflag' ? false : message.flagged,
          seen: action === 'seen' ? true : action === 'unseen' ? false : message.seen,
        });
      }
      setChecked(new Set());
      refresh();
    } catch (err: any) {
      setNotice(err.message);
    }
  };

  const selectFolder = (path: string) => {
    setFolder(path);
    setPage(0);
    setSearch('');
    setSearchInput('');
    setList(null);
    setSelectedUid(null);
    setMessage(null);
    setChecked(new Set());
  };

  const changeMailbox = (next: string) => {
    router.replace({ pathname: router.pathname, query: { mailbox: next } }, undefined, { shallow: true });
  };

  const revokeAccess = async () => {
    if (!confirm(`Delete the panel's app password for ${mailbox}? A new one is created the next time you open this mailbox.`)) {
      return;
    }
    try {
      await mailApi.revoke(mailbox);
      setNotice('App password deleted.');
    } catch (err: any) {
      setNotice(err.message);
    }
  };

  if (setupError) {
    return <div className="rounded-md bg-red-50 p-4 text-red-700">{setupError}</div>;
  }

  const currentFolder = folders.find((f) => f.path === folder);

  return (
    <>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold text-gray-900">Mail</h1>
        <select
          className="rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm"
          value={mailbox}
          onChange={(e) => changeMailbox(e.target.value)}
          aria-label="Mailbox"
        >
          {mailboxes.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <form
          className="relative min-w-[14rem] flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            setSearch(searchInput.trim());
          }}
        >
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            className="form-input pl-9 text-sm"
            placeholder={`Search ${currentFolder?.name || 'folder'} (subject, sender, body)`}
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (!e.target.value && search) {
                setPage(0);
                setSearch('');
              }
            }}
          />
        </form>
        <button onClick={refresh} className="btn-secondary flex items-center gap-2 text-sm" title="Refresh">
          <ArrowPathIcon className={`h-4 w-4 ${listLoading ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={revokeAccess} className="btn-secondary flex items-center gap-2 text-sm" title="Delete the panel's app password for this mailbox">
          <KeyIcon className="h-4 w-4" />
          Reset access
        </button>
        <button
          onClick={() => setCompose({ title: 'New message', draft: emptyDraft })}
          className="btn-primary flex items-center gap-2 text-sm"
          disabled={!mailbox}
        >
          <PencilSquareIcon className="h-4 w-4" />
          Compose
        </button>
      </div>

      {notice && (
        <div className="flex items-center justify-between rounded-md bg-blue-50 px-4 py-2 text-sm text-blue-800">
          {notice}
          <button onClick={() => setNotice(null)} className="font-medium">Dismiss</button>
        </div>
      )}

      <div className="grid h-[calc(100vh-12rem)] min-h-[28rem] grid-cols-[12rem,22rem,1fr] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
        <nav className="overflow-y-auto border-r border-gray-200 py-2">
          {folders.map((f) => {
            const Icon = (f.specialUse && FOLDER_ICONS[f.specialUse]) || FolderIcon;
            const depth = f.path.split(f.delimiter || '/').length - 1;
            return (
              <button
                key={f.path}
                onClick={() => selectFolder(f.path)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
                  f.path === folder ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
                style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{f.name}</span>
                {f.unseen > 0 && <span className="ml-auto text-xs font-semibold">{f.unseen}</span>}
              </button>
            );
          })}
        </nav>

        <div className="min-h-0 border-r border-gray-200">
          <MessageListPane
            list={list}
            loading={listLoading}
            error={listError}
            isSentFolder={currentFolder?.specialUse === '\\Sent'}
            selectedUid={selectedUid}
            checked={checked}
            onOpen={(uid) => openMessage(uid)}
            onCheck={(uid, value) => {
              const next = new Set(checked);
              if (value) next.add(uid); else next.delete(uid);
              setChecked(next);
            }}
            onCheckAll={(value) => setChecked(value ? new Set(list?.messages.map((m) => m.uid)) : new Set())}
            onBulkAction={(action) => runAction(Array.from(checked), action)}
            onPage={setPage}
          />
        </div>

        <div className="min-h-0">
          <MessageView
            mailbox={mailbox}
            folder={folder}
            folders={folders}
            message={message}
            loading={messageLoading}
            error={messageError}
            showImages={showImages}
            onShowImages={() => message && openMessage(message.uid, true)}
            onReply={(mode) => message && setCompose({
              title: mode === 'forward' ? 'Forward' : 'Reply',
              draft: buildReply(message, mode, mailbox),
            })}
            onToggleFlag={() => message && runAction([message.uid], message.flagged ? 'unflag' : 'flag')}
            onMarkUnread={() => message && runAction([message.uid], 'unseen')}
            onMove={(target) => message && runAction([message.uid], 'move', target)}
            onDelete={() => message && runAction([message.uid], 'delete')}
          />
        </div>
      </div>
    </div>

      {compose && (
        <ComposeModal
          title={compose.title}
          mailbox={mailbox}
          initial={compose.draft}
          onClose={() => setCompose(null)}
          onSend={async (outgoing) => {
            await mailApi.send(mailbox, outgoing);
            setCompose(null);
            setNotice('Message sent.');
            refresh();
          }}
        />
      )}
    </>
  );
}
