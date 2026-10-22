import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
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
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { useMailboxSelection } from '@/hooks/useMailboxSelection';
import { Locale, useLocale, useT } from '@/lib/i18n';
import { commonMessages } from '@/lib/i18n/messages/common';
import { mailMessages } from '@/lib/i18n/messages/mail';
import { useErrorText } from '@/lib/i18n/useErrorText';
import {
  folderLabel,
  formatAddress,
  formatAddresses,
  formatDate,
  MailAddress,
  mailApi,
  MailFolder,
  MessageAction,
  MessageDetail,
  MessageList,
  MessageSummary,
} from './api';
import MessageListPane from './MessageListPane';
import MessageView, { ReplyMode } from './MessageView';
import ComposeModal, { ComposeDraft, emptyDraft } from './ComposeModal';
import ShortcutsDialog from './ShortcutsDialog';
import { isTypingTarget } from './ui';

const POLL_INTERVAL_MS = 30_000;

const FOLDER_ICONS: Record<string, typeof FolderIcon> = {
  '\\Inbox': InboxIcon,
  '\\Sent': PaperAirplaneIcon,
  '\\Drafts': DocumentIcon,
  '\\Trash': TrashIcon,
  '\\Junk': ExclamationTriangleIcon,
  '\\Archive': ArchiveBoxIcon,
};

type T = ReturnType<typeof useT<typeof mailMessages.en>>;

function withPrefix(prefix: string, subject: string, pattern: RegExp): string {
  return pattern.test(subject) ? subject : `${prefix} ${subject}`;
}

function quote(text: string): string {
  return text.split('\n').map((line) => `> ${line}`).join('\n');
}

// The quoted text is written in the viewer's language; the Re:/Fwd: prefixes
// are email conventions and stay as they are.
function buildReply(message: MessageDetail, mode: ReplyMode, self: string, t: T, locale: Locale): ComposeDraft {
  const notSelf = (a: MailAddress) => a.address?.toLowerCase() !== self;
  const references = [...message.references, ...(message.messageId ? [message.messageId] : [])];

  if (mode === 'forward') {
    return {
      ...emptyDraft,
      subject: withPrefix('Fwd:', message.subject, /^fwd?:/i),
      text: [
        '',
        '',
        t('forwardedHeader'),
        `${t('headerFrom')}: ${formatAddresses(message.from)}`,
        `${t('headerDate')}: ${formatDate(message.date, locale, true)}`,
        `${t('headerSubject')}: ${message.subject}`,
        `${t('headerTo')}: ${formatAddresses(message.to)}`,
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
    text: `\n\n${t('quoteHeader', { date: formatDate(message.date, locale, true), sender: formatAddresses(message.from) })}\n${quote(message.text)}`,
    inReplyTo: message.messageId,
    references,
  };
}

const queryString = (value: unknown) => (typeof value === 'string' ? value : '');

// Applies an action's effect to a message's flags, for optimistic updates.
function applyFlags<M extends MessageSummary>(m: M, action: MessageAction): M {
  switch (action) {
    case 'seen': return { ...m, seen: true };
    case 'unseen': return { ...m, seen: false };
    case 'flag': return { ...m, flagged: true };
    case 'unflag': return { ...m, flagged: false };
    default: return m;
  }
}

export default function MailClient() {
  const router = useRouter();
  const t = useT(mailMessages);
  const tc = useT(commonMessages);
  const { locale } = useLocale();
  const errorText = useErrorText();
  const { mailboxes, mailbox, setMailbox, ready, error: setupError } = useMailboxSelection();

  // The folder and open message live in the URL (?folder=&uid=), so they
  // survive a reload and the back button closes the reader on phones.
  const folder = queryString(router.query.folder) || 'INBOX';
  const uidParam = Number(queryString(router.query.uid));
  const selectedUid = Number.isInteger(uidParam) && uidParam > 0 ? uidParam : null;

  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [list, setList] = useState<MessageList | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [showImages, setShowImages] = useState(false);
  const [compose, setCompose] = useState<{ title: string; draft: ComposeDraft; isNew: boolean } | null>(null);
  const [foldersOpen, setFoldersOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Ignore responses that arrive after the user switched mailbox/folder/page.
  const listRequest = useRef(0);
  const messageRequest = useRef(0);

  const navigate = useCallback(
    (next: { folder?: string; uid?: number | null }, push = false) => {
      const query: Record<string, string> = {};
      if (mailbox) query.mailbox = mailbox;
      const nextFolder = next.folder ?? folder;
      if (nextFolder !== 'INBOX') query.folder = nextFolder;
      const nextUid = next.uid === undefined ? selectedUid : next.uid;
      if (nextUid) query.uid = String(nextUid);
      router[push ? 'push' : 'replace']({ pathname: router.pathname, query }, undefined, { shallow: true });
    },
    [router, mailbox, folder, selectedUid]
  );

  // A new mailbox or folder starts from a clean slate.
  useEffect(() => {
    setPage(0);
    setSearch('');
    setSearchInput('');
    setList(null);
    setChecked(new Set());
  }, [mailbox, folder]);
  useEffect(() => {
    setFolders([]);
  }, [mailbox]);

  const loadFolders = useCallback(async () => {
    if (!ready) return;
    try {
      setFolders(await mailApi.folders(mailbox));
    } catch (err: any) {
      setListError(errorText(err));
    }
  }, [mailbox, ready, errorText]);

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
      if (id === listRequest.current && !silent) setListError(errorText(err));
    } finally {
      if (id === listRequest.current) setListLoading(false);
    }
  }, [mailbox, folder, page, search, ready, errorText]);

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
    loadList(true);
  };

  // Loads the message named in the URL.
  const loadMessage = useCallback(async (uid: number, images: boolean) => {
    const id = ++messageRequest.current;
    setShowImages(images);
    setMessageLoading(true);
    setMessageError(null);
    try {
      const detail = await mailApi.message(mailbox, folder, uid, images);
      if (id !== messageRequest.current) return;
      setMessage(detail);
      // Opening marks it read; reflect that without refetching the list.
      let wasUnseen = false;
      setList((prev) => prev && {
        ...prev,
        messages: prev.messages.map((m) => {
          if (m.uid !== uid) return m;
          wasUnseen = !m.seen;
          return { ...m, seen: true };
        }),
      });
      if (wasUnseen) loadFolders();
    } catch (err: any) {
      if (id === messageRequest.current) setMessageError(errorText(err));
    } finally {
      if (id === messageRequest.current) setMessageLoading(false);
    }
  }, [mailbox, folder, errorText, loadFolders]);

  useEffect(() => {
    if (!ready || selectedUid === null) {
      messageRequest.current++;
      setMessage(null);
      setMessageError(null);
      setMessageLoading(false);
      return;
    }
    loadMessage(selectedUid, false);
  }, [ready, selectedUid, loadMessage]);

  // ?compose=address (e.g. from Contacts) opens a new message to that address.
  useEffect(() => {
    const to = queryString(router.query.compose);
    if (!router.isReady || !to || !mailbox) return;
    setCompose({ title: t('newMessage'), draft: { ...emptyDraft, to }, isNew: false });
    const { compose: _drop, ...rest } = router.query;
    router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
  }, [router.isReady, router.query.compose, mailbox]); // eslint-disable-line react-hooks/exhaustive-deps

  const messages = list?.messages || [];
  const index = selectedUid === null ? -1 : messages.findIndex((m) => m.uid === selectedUid);
  const openMessage = (uid: number) => navigate({ uid }, selectedUid === null);
  const closeReader = () => navigate({ uid: null });

  const archiveFolder = folders.find((f) => f.specialUse === '\\Archive');
  const currentFolder = folders.find((f) => f.path === folder);
  const currentFolderName = currentFolder ? folderLabel(currentFolder, t) : '';
  const inTrash = currentFolder?.specialUse === '\\Trash';

  const runAction = async (uids: number[], action: MessageAction, target?: string) => {
    if (!uids.length) return;
    const removes = action === 'move' || action === 'delete';
    const previousList = list;
    const previousMessage = message;

    // Optimistic update: flags change at once, moved messages disappear.
    if (removes) {
      if (selectedUid !== null && uids.includes(selectedUid)) {
        // Continue with the next message, like most mail apps.
        const rest = messages.filter((m) => !uids.includes(m.uid));
        const next = messages.slice(index + 1).find((m) => !uids.includes(m.uid)) || rest[rest.length - 1];
        navigate({ uid: next ? next.uid : null });
      }
      setList((prev) => prev && {
        ...prev,
        total: Math.max(0, prev.total - uids.length),
        messages: prev.messages.filter((m) => !uids.includes(m.uid)),
      });
    } else {
      setList((prev) => prev && { ...prev, messages: prev.messages.map((m) => (uids.includes(m.uid) ? applyFlags(m, action) : m)) });
      if (message && uids.includes(message.uid)) setMessage(applyFlags(message, action));
    }
    setChecked(new Set());

    try {
      await mailApi.action(mailbox, folder, uids, action, target);
      if (removes) {
        const targetFolder = folders.find((f) => f.path === target);
        toast.success(
          action === 'delete'
            ? inTrash ? t('deletedForever') : uids.length > 1 ? t('nMovedToTrash', { n: uids.length }) : t('movedToTrash')
            : targetFolder?.specialUse === '\\Archive' ? t('archived') : t('movedTo', { folder: targetFolder ? folderLabel(targetFolder, t) : target || '' })
        );
      } else if (uids.length > 1 && (action === 'seen' || action === 'unseen')) {
        toast.success(action === 'seen' ? t('markedRead') : t('markedUnread'));
      }
      refresh();
    } catch (err: any) {
      setList(previousList);
      setMessage(previousMessage);
      toast.error(errorText(err));
    }
  };

  const archive = (uids: number[]) => archiveFolder && folder !== archiveFolder.path && runAction(uids, 'move', archiveFolder.path);

  const selectFolder = (path: string) => {
    setFoldersOpen(false);
    navigate({ folder: path, uid: null }, true);
  };

  const revokeAccess = async () => {
    if (!confirm(t('resetAccessConfirm', { mailbox }))) return;
    try {
      await mailApi.revoke(mailbox);
      toast.success(t('appPasswordDeleted'));
    } catch (err: any) {
      toast.error(errorText(err));
    }
  };

  const reply = (mode: ReplyMode) => message && setCompose({
    title: mode === 'forward' ? t('forward') : t('reply'),
    draft: buildReply(message, mode, mailbox, t, locale),
    isNew: false,
  });
  const newMessage = () => setCompose({ title: t('newMessage'), draft: emptyDraft, isNew: true });

  // Single-key shortcuts, as in Gmail. Off while typing or a dialog is open.
  const shortcuts = useRef<(e: KeyboardEvent) => void>(() => {});
  shortcuts.current = (e: KeyboardEvent) => {
    if (compose || foldersOpen || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
    if (helpOpen) {
      if (e.key === 'Escape' || e.key === '?') setHelpOpen(false);
      return;
    }
    const open = (i: number) => messages[i] && openMessage(messages[i].uid);
    const handlers: Record<string, () => void> = {
      j: () => open(index < 0 ? 0 : Math.min(index + 1, messages.length - 1)),
      ArrowDown: () => open(index < 0 ? 0 : Math.min(index + 1, messages.length - 1)),
      k: () => open(index < 0 ? 0 : Math.max(index - 1, 0)),
      ArrowUp: () => open(index < 0 ? 0 : Math.max(index - 1, 0)),
      u: closeReader,
      Escape: () => (checked.size ? setChecked(new Set()) : closeReader()),
      r: () => reply('reply'),
      a: () => reply('replyAll'),
      f: () => reply('forward'),
      s: () => message && runAction([message.uid], message.flagged ? 'unflag' : 'flag'),
      U: () => message && runAction([message.uid], 'unseen'),
      e: () => message && archive([message.uid]),
      '#': () => (checked.size ? runAction(Array.from(checked), 'delete') : message && runAction([message.uid], 'delete')),
      Delete: () => (checked.size ? runAction(Array.from(checked), 'delete') : message && runAction([message.uid], 'delete')),
      x: () => {
        if (selectedUid === null) return;
        const next = new Set(checked);
        if (next.has(selectedUid)) next.delete(selectedUid); else next.add(selectedUid);
        setChecked(next);
      },
      c: newMessage,
      '/': () => searchRef.current?.focus(),
      '?': () => setHelpOpen(true),
    };
    const handler = handlers[e.key];
    if (handler) {
      e.preventDefault();
      handler();
    }
  };
  useEffect(() => {
    const listener = (e: KeyboardEvent) => shortcuts.current(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const folderList = (
    <div className="space-y-0.5 p-2">
      {folders.map((f) => {
        const Icon = (f.specialUse && FOLDER_ICONS[f.specialUse]) || FolderIcon;
        const depth = f.path.split(f.delimiter || '/').length - 1;
        const active = f.path === folder;
        return (
          <button
            key={f.path}
            onClick={() => selectFolder(f.path)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors lg:py-1.5 ${
              active ? 'bg-primary-100 font-medium text-primary-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
            style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{folderLabel(f, t)}</span>
            {f.unseen > 0 && (
              <span className={`ml-auto rounded-full px-1.5 text-xs font-semibold ${active ? '' : 'text-gray-900'}`}>{f.unseen}</span>
            )}
          </button>
        );
      })}
    </div>
  );

  if (setupError) {
    return <div className="rounded-lg bg-red-50 p-4 text-red-700">{setupError}</div>;
  }

  const readerOpen = selectedUid !== null;

  return (
    <>
    <div className="flex h-[calc(100dvh-4.5rem)] flex-col gap-2 sm:h-[calc(100dvh-5.5rem)] sm:gap-3 lg:h-[calc(100dvh-3rem)]">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="hidden text-2xl font-bold text-gray-900 lg:mr-2 lg:block">{t('title')}</h1>
        <button
          onClick={() => setFoldersOpen(true)}
          className="btn-secondary min-w-0 px-3 text-sm lg:hidden"
          aria-label={t('folders')}
        >
          <FolderIcon className="h-4 w-4 shrink-0" />
          <span className="max-w-[7rem] truncate">{currentFolderName || t('folders')}</span>
          {(currentFolder?.unseen ?? 0) > 0 && <span className="text-xs font-semibold">{currentFolder?.unseen}</span>}
        </button>
        {mailboxes.length > 1 ? (
          <select
            className="min-w-0 flex-1 rounded-lg border border-gray-300 py-2 pl-3 pr-8 text-sm lg:flex-none"
            value={mailbox}
            onChange={(e) => setMailbox(e.target.value)}
            aria-label={t('mailbox')}
          >
            {mailboxes.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm text-gray-600 lg:flex-none">{mailbox}</span>
        )}
        <form
          className="relative order-last w-full lg:order-none lg:w-auto lg:min-w-[14rem] lg:flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            setSearch(searchInput.trim());
            closeReader();
            searchRef.current?.blur();
          }}
        >
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            ref={searchRef}
            type="search"
            className="form-input rounded-full bg-gray-50 pl-9 text-sm"
            placeholder={t('searchIn', { folder: currentFolderName || t('folder') })}
            value={searchInput}
            onKeyDown={(e) => e.key === 'Escape' && (e.target as HTMLInputElement).blur()}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (!e.target.value && search) {
                setPage(0);
                setSearch('');
              }
            }}
          />
        </form>
        <button onClick={refresh} className="btn-icon" title={tc('refresh')} aria-label={tc('refresh')}>
          <ArrowPathIcon className={`h-5 w-5 ${listLoading ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={revokeAccess} className="btn-icon hidden sm:inline-flex" title={t('resetAccessTitle')} aria-label={t('resetAccess')}>
          <KeyIcon className="h-5 w-5" />
        </button>
        <button onClick={() => setHelpOpen(true)} className="btn-icon hidden lg:inline-flex" title={t('shortcutsHint')} aria-label={t('shortcuts')}>
          <QuestionMarkCircleIcon className="h-5 w-5" />
        </button>
        <button onClick={newMessage} className="btn-primary text-sm" disabled={!mailbox}>
          <PencilSquareIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{t('compose')}</span>
        </button>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-surface shadow-sm">
        <nav className="hidden w-52 shrink-0 overflow-y-auto border-r border-gray-200 lg:block" aria-label={t('folders')}>
          {folderList}
        </nav>

        <div className={`min-h-0 w-full border-gray-200 md:block md:w-80 md:shrink-0 md:border-r xl:w-96 ${readerOpen ? 'hidden' : 'block'}`}>
          <MessageListPane
            list={list}
            loading={listLoading}
            error={listError}
            search={search}
            isSentFolder={currentFolder?.specialUse === '\\Sent'}
            canArchive={Boolean(archiveFolder && folder !== archiveFolder.path)}
            selectedUid={selectedUid}
            checked={checked}
            onOpen={openMessage}
            onCheck={(uid, value) => {
              const next = new Set(checked);
              if (value) next.add(uid); else next.delete(uid);
              setChecked(next);
            }}
            onCheckAll={(value) => setChecked(value ? new Set(messages.map((m) => m.uid)) : new Set())}
            onAction={runAction}
            onArchive={archive}
            onPage={(p) => { setPage(p); closeReader(); }}
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
            position={index >= 0 && list ? { n: list.page * list.pageSize + index + 1, total: list.total } : null}
            canArchive={Boolean(archiveFolder && folder !== archiveFolder.path)}
            onPrevious={index > 0 ? () => openMessage(messages[index - 1].uid) : undefined}
            onNext={index >= 0 && index < messages.length - 1 ? () => openMessage(messages[index + 1].uid) : undefined}
            onBack={closeReader}
            onShowImages={() => message && loadMessage(message.uid, true)}
            onReply={reply}
            onToggleFlag={() => message && runAction([message.uid], message.flagged ? 'unflag' : 'flag')}
            onMarkUnread={() => message && runAction([message.uid], 'unseen')}
            onArchive={() => message && archive([message.uid])}
            onMove={(target) => message && runAction([message.uid], 'move', target)}
            onDelete={() => message && runAction([message.uid], 'delete')}
          />
        </div>
      </div>
    </div>

      {foldersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t('folders')}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setFoldersOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-surface shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4">
              <span className="font-semibold text-gray-900">{t('folders')}</span>
              <button onClick={() => setFoldersOpen(false)} className="btn-icon" aria-label={t('closeFolders')}>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            {folderList}
          </div>
        </div>
      )}

      {helpOpen && <ShortcutsDialog onClose={() => setHelpOpen(false)} />}

      {compose && (
        <ComposeModal
          title={compose.title}
          mailbox={mailbox}
          initial={compose.draft}
          autosave={compose.isNew}
          onClose={() => setCompose(null)}
          onSend={async (outgoing) => {
            await mailApi.send(mailbox, outgoing);
            setCompose(null);
            toast.success(t('messageSent'));
            refresh();
          }}
        />
      )}
    </>
  );
}
