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
  XMarkIcon,
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
  const [foldersOpen, setFoldersOpen] = useState(false);

  // Ignore responses that arrive after the user switched mailbox/folder/page.
  const listRequest = useRef(0);
  const messageRequest = useRef(0);

  useEffect(() => {
    mailApi.mailboxes()
      .then((names) => {
        setMailboxes(names);
        if (!names.length) setSetupError("You don't have any mailboxes yet.");
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

  // Credentials are set up once per mailbox before mail loads in parallel.
  const [readyMailbox, setReadyMailbox] = useState('');
  useEffect(() => {
    if (!mailbox) return;
    let cancelled = false;
    setReadyMailbox('');
    mailApi.prepare(mailbox)
      .catch(() => {}) // the loads below report the error
      .finally(() => { if (!cancelled) setReadyMailbox(mailbox); });
    return () => { cancelled = true; };
  }, [mailbox]);
  const ready = Boolean(mailbox) && readyMailbox === mailbox;

  const loadFolders = useCallback(async () => {
    if (!ready) return;
    try {
      setFolders(await mailApi.folders(mailbox));
    } catch (err: any) {
      setListError(err.message);
    }
  }, [mailbox, ready]);

  const loadList = useCallback(async (silent = false) => {
    if (!ready) return;
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
  }, [mailbox, folder, page, search, ready]);

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
    setFoldersOpen(false);
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

  const folderList = (
    <div className="py-2">
      {folders.map((f) => {
        const Icon = (f.specialUse && FOLDER_ICONS[f.specialUse]) || FolderIcon;
        const depth = f.path.split(f.delimiter || '/').length - 1;
        return (
          <button
            key={f.path}
            onClick={() => selectFolder(f.path)}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm lg:py-1.5 ${
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
    </div>
  );

  // On phones only one pane shows at a time: the reader once a message is picked.
  const readerOpen = selectedUid !== null;
  const closeReader = () => {
    messageRequest.current++;
    setSelectedUid(null);
    setMessage(null);
    setMessageError(null);
    setMessageLoading(false);
  };

  return (
    <>
    <div className="flex h-[calc(100dvh-4.5rem)] flex-col gap-2 sm:h-[calc(100dvh-5.5rem)] sm:gap-3 lg:h-[calc(100dvh-3rem)]">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="hidden text-3xl font-bold text-gray-900 lg:block lg:mr-2">Mail</h1>
        <button
          onClick={() => setFoldersOpen(true)}
          className="btn-secondary flex min-w-0 items-center gap-2 text-sm lg:hidden"
          aria-label="Folders"
        >
          <FolderIcon className="h-4 w-4 shrink-0" />
          <span className="max-w-[7rem] truncate">{currentFolder?.name || 'Folders'}</span>
          {(currentFolder?.unseen ?? 0) > 0 && <span className="text-xs font-semibold">{currentFolder?.unseen}</span>}
        </button>
        <select
          className="min-w-0 flex-1 rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm lg:flex-none"
          value={mailbox}
          onChange={(e) => changeMailbox(e.target.value)}
          aria-label="Mailbox"
        >
          {mailboxes.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <form
          className="relative order-last w-full lg:order-none lg:w-auto lg:min-w-[14rem] lg:flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            setSearch(searchInput.trim());
            closeReader();
          }}
        >
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="search"
            className="form-input pl-9 text-sm"
            placeholder={`Search ${currentFolder?.name || 'folder'}`}
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
        <button onClick={refresh} className="btn-secondary flex items-center gap-2 px-3 text-sm" title="Refresh" aria-label="Refresh">
          <ArrowPathIcon className={`h-4 w-4 ${listLoading ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={revokeAccess} className="btn-secondary hidden items-center gap-2 px-3 text-sm sm:flex" title="Delete the panel's app password for this mailbox" aria-label="Reset access">
          <KeyIcon className="h-4 w-4" />
          <span className="hidden xl:inline">Reset access</span>
        </button>
        <button
          onClick={() => setCompose({ title: 'New message', draft: emptyDraft })}
          className="btn-primary flex items-center gap-2 text-sm"
          disabled={!mailbox}
        >
          <PencilSquareIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Compose</span>
        </button>
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-blue-50 px-4 py-2 text-sm text-blue-800">
          {notice}
          <button onClick={() => setNotice(null)} className="font-medium">Dismiss</button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-surface shadow-sm">
        <nav className="hidden w-48 shrink-0 overflow-y-auto border-r border-gray-200 lg:block" aria-label="Folders">
          {folderList}
        </nav>

        <div className={`min-h-0 w-full border-gray-200 md:block md:w-80 md:shrink-0 md:border-r xl:w-96 ${readerOpen ? 'hidden' : 'block'}`}>
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

        <div className={`min-h-0 min-w-0 flex-1 md:block ${readerOpen ? 'block' : 'hidden'}`}>
          <MessageView
            mailbox={mailbox}
            folder={folder}
            folders={folders}
            message={message}
            loading={messageLoading}
            error={messageError}
            showImages={showImages}
            onBack={closeReader}
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

      {foldersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Folders">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFoldersOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-surface shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4">
              <span className="font-semibold text-gray-900">Folders</span>
              <button onClick={() => setFoldersOpen(false)} className="rounded-md p-1 text-gray-500 hover:bg-gray-100" aria-label="Close folders">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            {folderList}
          </div>
        </div>
      )}

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
