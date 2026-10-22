import {
  ArchiveBoxIcon,
  ArrowLeftIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EnvelopeIcon,
  PaperClipIcon,
  StarIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { useLocale, useT } from '@/lib/i18n';
import { commonMessages } from '@/lib/i18n/messages/common';
import { mailMessages } from '@/lib/i18n/messages/mail';
import { displayName, folderLabel, formatAddresses, formatDate, formatSize, mailApi, MailFolder, MessageDetail } from './api';
import { Avatar } from './ui';

export type ReplyMode = 'reply' | 'replyAll' | 'forward';

// Builds the iframe document for an HTML message. The sandbox (no scripts,
// no same-origin) plus this CSP stop the message from running code or loading
// anything the sanitizer let through.
function buildSrcDoc(html: string, allowRemoteImages: boolean): string {
  const imgSrc = allowRemoteImages ? 'data: https: http:' : 'data:';
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${imgSrc}; style-src 'unsafe-inline'; font-src data:">
<base target="_blank">
<style>body{font-family:system-ui,sans-serif;font-size:14px;color:#111827;margin:0;padding:16px 20px;word-wrap:break-word}img{max-width:100%;height:auto}</style>
</head><body>${html}</body></html>`;
}

export default function MessageView({
  mailbox,
  folder,
  folders,
  message,
  loading,
  error,
  showImages,
  position,
  canArchive,
  onPrevious,
  onNext,
  onBack,
  onShowImages,
  onReply,
  onToggleFlag,
  onMarkUnread,
  onArchive,
  onMove,
  onDelete,
}: {
  mailbox: string;
  folder: string;
  folders: MailFolder[];
  message: MessageDetail | null;
  loading: boolean;
  error: string | null;
  showImages: boolean;
  // Where the open message sits in the folder, e.g. 3 of 120.
  position: { n: number; total: number } | null;
  canArchive: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  // Back to the list; shown on phones, where the reader replaces the list.
  onBack: () => void;
  onShowImages: () => void;
  onReply: (mode: ReplyMode) => void;
  onToggleFlag: () => void;
  onMarkUnread: () => void;
  onArchive: () => void;
  onMove: (target: string) => void;
  onDelete: () => void;
}) {
  const t = useT(mailMessages);
  const tc = useT(commonMessages);
  const { locale } = useLocale();
  const backButton = (
    <button className="btn-icon md:hidden" onClick={onBack} title={tc('back')} aria-label={t('backToMessages')}>
      <ArrowLeftIcon className="h-5 w-5" />
    </button>
  );

  if (loading && !message) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-12 items-center border-b border-gray-200 px-2 md:hidden">{backButton}</div>
        <div className="animate-pulse space-y-4 p-5">
          <div className="h-6 w-2/3 rounded bg-gray-200" />
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3.5 w-1/3 rounded bg-gray-200" />
              <div className="h-3 w-1/2 rounded bg-gray-100" />
            </div>
          </div>
          {[...Array(5)].map((_, i) => <div key={i} className="h-3 rounded bg-gray-100" style={{ width: `${90 - i * 9}%` }} />)}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-12 items-center border-b border-gray-200 px-2 md:hidden">{backButton}</div>
        <div className="m-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }
  if (!message) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-gray-400">
        <EnvelopeIcon className="h-10 w-10 text-gray-300" />
        {t('selectMessageToRead')}
        <span className="hidden text-xs lg:block">{t('shortcutsHint')}</span>
      </div>
    );
  }

  const sender = displayName(message.from) || t('unknown');

  return (
    <div className={`flex h-full flex-col ${loading ? 'opacity-60 transition-opacity' : ''}`}>
      <div className="flex h-12 shrink-0 items-center gap-0.5 border-b border-gray-200 px-2 sm:px-3">
        {backButton}
        {canArchive && (
          <button className="btn-icon" onClick={onArchive} title={t('archive')} aria-label={t('archive')}>
            <ArchiveBoxIcon className="h-5 w-5" />
          </button>
        )}
        <button className="btn-icon hover:text-red-600" onClick={onDelete} title={tc('delete')} aria-label={tc('delete')}>
          <TrashIcon className="h-5 w-5" />
        </button>
        <button className="btn-icon hidden sm:inline-flex" onClick={onMarkUnread} title={t('markAsUnread')} aria-label={t('markAsUnread')}>
          <EnvelopeIcon className="h-5 w-5" />
        </button>
        <button className="btn-icon" onClick={onToggleFlag} title={message.flagged ? t('removeStar') : t('star')} aria-label={message.flagged ? t('removeStar') : t('star')}>
          {message.flagged ? <StarSolidIcon className="h-5 w-5 text-yellow-400" /> : <StarIcon className="h-5 w-5" />}
        </button>
        <select
          className="ml-1 w-24 rounded-full border border-gray-300 py-1 pl-3 pr-7 text-sm text-gray-700 sm:w-auto"
          value=""
          onChange={(e) => e.target.value && onMove(e.target.value)}
          title={t('moveToFolder')}
          aria-label={t('moveToFolder')}
        >
          <option value="">{t('moveTo')}</option>
          {folders.filter((f) => f.path !== folder).map((f) => (
            <option key={f.path} value={f.path}>{folderLabel(f, t)}</option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-0.5 text-xs text-gray-500">
          {position && <span className="hidden tabular-nums sm:inline">{t('position', position)}</span>}
          <button className="btn-icon" onClick={onPrevious} disabled={!onPrevious} title={t('previousMessage')} aria-label={t('previousMessage')}>
            <ChevronUpIcon className="h-5 w-5" />
          </button>
          <button className="btn-icon" onClick={onNext} disabled={!onNext} title={t('nextMessage')} aria-label={t('nextMessage')}>
            <ChevronDownIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="max-h-[45%] shrink-0 overflow-y-auto">
        <div className="px-4 pb-3 pt-4 sm:px-6">
          <h2 className="break-words text-lg font-semibold text-gray-900 sm:text-xl">{message.subject}</h2>
          <div className="mt-4 flex items-start gap-3">
            <Avatar name={sender} seed={message.from[0]?.address} />
            <div className="min-w-0 flex-1 text-sm">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold text-gray-900">{sender}</span>
                {message.from[0]?.address && message.from[0].address !== sender && (
                  <span className="break-all text-gray-500">&lt;{message.from[0].address}&gt;</span>
                )}
                <span className="ml-auto whitespace-nowrap text-xs text-gray-500">{formatDate(message.date, locale, true)}</span>
              </div>
              <div className="mt-0.5 break-words text-gray-600">
                {t('headerTo')}: {formatAddresses(message.to)}
                {message.cc.length > 0 && <> · {t('headerCc')}: {formatAddresses(message.cc)}</>}
              </div>
            </div>
          </div>

          {message.attachments.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {message.attachments.map((a) => (
                <a
                  key={a.index}
                  href={mailApi.attachmentUrl(mailbox, folder, message.uid, a.index)}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <PaperClipIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{a.filename}</span>
                  <span className="shrink-0 text-gray-400">({formatSize(a.size, locale)})</span>
                </a>
              ))}
            </div>
          )}

          {message.blockedImages > 0 && !showImages && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              {t('imagesBlocked')}
              <button onClick={onShowImages} className="shrink-0 font-medium underline">{t('showImages')}</button>
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {message.html ? (
          // Most HTML mail assumes a light background, so it stays white in dark mode.
          <iframe
            title={t('messageBody')}
            className="h-full w-full border-t border-gray-100 bg-white"
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            srcDoc={buildSrcDoc(message.html, showImages)}
          />
        ) : (
          <pre className="h-full overflow-auto whitespace-pre-wrap break-words px-4 pb-6 font-sans text-sm leading-relaxed text-gray-900 sm:px-6">
            {message.text}
          </pre>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap gap-2 border-t border-gray-200 px-3 py-2 sm:px-6">
        <button className="btn-secondary rounded-full text-sm" onClick={() => onReply('reply')}>
          <ArrowUturnLeftIcon className="h-4 w-4" /> {t('reply')}
        </button>
        <button className="btn-secondary rounded-full text-sm" onClick={() => onReply('replyAll')}>
          <ArrowUturnLeftIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{t('replyAll')}</span>
          <span className="sm:hidden">{t('replyAllShort')}</span>
        </button>
        <button className="btn-secondary rounded-full text-sm" onClick={() => onReply('forward')}>
          <ArrowUturnRightIcon className="h-4 w-4" /> {t('forward')}
        </button>
      </div>
    </div>
  );
}
