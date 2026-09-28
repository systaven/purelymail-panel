import {
  ArrowLeftIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  EnvelopeIcon,
  PaperClipIcon,
  StarIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { useLocale, useT } from '@/lib/i18n';
import { commonMessages } from '@/lib/i18n/messages/common';
import { mailMessages } from '@/lib/i18n/messages/mail';
import { folderLabel, formatAddresses, formatDate, formatSize, mailApi, MailFolder, MessageDetail } from './api';

export type ReplyMode = 'reply' | 'replyAll' | 'forward';

// Builds the iframe document for an HTML message. The sandbox (no scripts,
// no same-origin) plus this CSP stop the message from running code or loading
// anything the sanitizer let through.
function buildSrcDoc(html: string, allowRemoteImages: boolean): string {
  const imgSrc = allowRemoteImages ? 'data: https: http:' : 'data:';
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${imgSrc}; style-src 'unsafe-inline'; font-src data:">
<base target="_blank">
<style>body{font-family:system-ui,sans-serif;font-size:14px;color:#111827;margin:0;padding:16px;word-wrap:break-word}img{max-width:100%;height:auto}</style>
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
  onBack,
  onShowImages,
  onReply,
  onToggleFlag,
  onMarkUnread,
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
  // Back to the list; shown on phones, where the reader replaces the list.
  onBack: () => void;
  onShowImages: () => void;
  onReply: (mode: ReplyMode) => void;
  onToggleFlag: () => void;
  onMarkUnread: () => void;
  onMove: (target: string) => void;
  onDelete: () => void;
}) {
  const t = useT(mailMessages);
  const tc = useT(commonMessages);
  const { locale } = useLocale();
  const backButton = (
    <button className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 md:hidden" onClick={onBack} title={tc('back')} aria-label={t('backToMessages')}>
      <ArrowLeftIcon className="h-5 w-5" />
    </button>
  );

  if (loading || error) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-gray-200 px-2 py-2 md:hidden">{backButton}</div>
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-gray-500">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary-600" />
          </div>
        ) : (
          <div className="m-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}
      </div>
    );
  }
  if (!message) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-gray-400">
        <EnvelopeIcon className="mb-2 h-10 w-10" />
        {t('selectMessageToRead')}
      </div>
    );
  }

  const iconButton = 'rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800';

  return (
    <div className="flex h-full flex-col">
      <div className="max-h-[45%] overflow-y-auto border-b border-gray-200 px-3 py-3 sm:px-5 sm:py-4">
        <div className="mb-3 flex flex-wrap items-center gap-1">
          {backButton}
          <button className={iconButton} onClick={() => onReply('reply')} title={t('reply')}>
            <ArrowUturnLeftIcon className="h-5 w-5" />
          </button>
          <button className={`${iconButton} text-sm font-medium`} onClick={() => onReply('replyAll')} title={t('replyAll')}>
            <span className="hidden sm:inline">{t('replyAll')}</span>
            <span className="sm:hidden">{t('replyAllShort')}</span>
          </button>
          <button className={iconButton} onClick={() => onReply('forward')} title={t('forward')}>
            <ArrowUturnRightIcon className="h-5 w-5" />
          </button>
          <span className="mx-2 h-5 w-px bg-gray-200" />
          <button className={iconButton} onClick={onToggleFlag} title={message.flagged ? t('removeStar') : t('star')}>
            {message.flagged ? <StarSolidIcon className="h-5 w-5 text-yellow-400" /> : <StarIcon className="h-5 w-5" />}
          </button>
          <button className={iconButton} onClick={onMarkUnread} title={t('markAsUnread')}>
            <EnvelopeIcon className="h-5 w-5" />
          </button>
          <select
            className="ml-1 w-28 rounded-md border border-gray-300 py-1 pl-2 pr-8 text-sm text-gray-700 sm:w-auto"
            value=""
            onChange={(e) => e.target.value && onMove(e.target.value)}
            title={t('moveToFolder')}
          >
            <option value="">{t('moveTo')}</option>
            {folders.filter((f) => f.path !== folder).map((f) => (
              <option key={f.path} value={f.path}>{folderLabel(f, t)}</option>
            ))}
          </select>
          <button className={`${iconButton} ml-auto hover:text-red-600`} onClick={onDelete} title={tc('delete')}>
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>

        <h2 className="break-words text-lg font-semibold text-gray-900 sm:text-xl">{message.subject}</h2>
        <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5 break-words text-sm [&_dd]:min-w-0">
          <dt className="text-gray-500">{t('headerFrom')}</dt>
          <dd className="text-gray-900">{formatAddresses(message.from)}</dd>
          <dt className="text-gray-500">{t('headerTo')}</dt>
          <dd className="text-gray-700">{formatAddresses(message.to)}</dd>
          {message.cc.length > 0 && (
            <>
              <dt className="text-gray-500">{t('headerCc')}</dt>
              <dd className="text-gray-700">{formatAddresses(message.cc)}</dd>
            </>
          )}
          <dt className="text-gray-500">{t('headerDate')}</dt>
          <dd className="text-gray-700">{formatDate(message.date, locale, true)}</dd>
        </dl>

        {message.attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.attachments.map((a) => (
              <a
                key={a.index}
                href={mailApi.attachmentUrl(mailbox, folder, message.uid, a.index)}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
              >
                <PaperClipIcon className="h-4 w-4" />
                {a.filename}
                <span className="text-gray-400">({formatSize(a.size, locale)})</span>
              </a>
            ))}
          </div>
        )}

        {message.blockedImages > 0 && !showImages && (
          <div className="mt-3 flex items-center justify-between rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
            {t('imagesBlocked')}
            <button onClick={onShowImages} className="font-medium underline">{t('showImages')}</button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {message.html ? (
          // Most HTML mail assumes a light background, so it stays white in dark mode.
          <iframe
            title={t('messageBody')}
            className="h-full w-full bg-white"
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            srcDoc={buildSrcDoc(message.html, showImages)}
          />
        ) : (
          <pre className="h-full overflow-auto whitespace-pre-wrap break-words p-4 font-sans text-sm text-gray-900 sm:p-5">
            {message.text}
          </pre>
        )}
      </div>
    </div>
  );
}
