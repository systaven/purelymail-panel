import {
  ArchiveBoxIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  PaperClipIcon,
  StarIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { useLocale, useT } from '@/lib/i18n';
import { commonMessages } from '@/lib/i18n/messages/common';
import { mailMessages } from '@/lib/i18n/messages/mail';
import { displayName, formatDate, MessageAction, MessageList } from './api';
import { Avatar, Highlight } from './ui';

export default function MessageListPane({
  list,
  loading,
  error,
  search,
  isSentFolder,
  canArchive,
  selectedUid,
  checked,
  onOpen,
  onCheck,
  onCheckAll,
  onAction,
  onArchive,
  onPage,
}: {
  list: MessageList | null;
  loading: boolean;
  error: string | null;
  search: string;
  isSentFolder: boolean;
  canArchive: boolean;
  selectedUid: number | null;
  checked: Set<number>;
  onOpen: (uid: number) => void;
  onCheck: (uid: number, value: boolean) => void;
  onCheckAll: (value: boolean) => void;
  onAction: (uids: number[], action: MessageAction) => void;
  onArchive: (uids: number[]) => void;
  onPage: (page: number) => void;
}) {
  const t = useT(mailMessages);
  const tc = useT(commonMessages);
  const { locale } = useLocale();
  const messages = list?.messages || [];
  const allChecked = messages.length > 0 && messages.every((m) => checked.has(m.uid));
  const pageCount = list ? Math.max(1, Math.ceil(list.total / list.pageSize)) : 1;
  const selected = Array.from(checked);
  const bulkButton = 'rounded-full px-2.5 py-1 hover:bg-gray-100';

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-gray-200 px-3 text-sm">
        <input
          type="checkbox"
          className="rounded border-gray-300"
          checked={allChecked}
          onChange={(e) => onCheckAll(e.target.checked)}
          aria-label={t('selectAll')}
        />
        {checked.size > 0 ? (
          <div className="flex min-w-0 flex-wrap items-center gap-0.5">
            <span className="mr-1 text-gray-600">{t('selectedCount', { n: checked.size })}</span>
            <button className={bulkButton} onClick={() => onAction(selected, 'seen')}>{t('markRead')}</button>
            <button className={bulkButton} onClick={() => onAction(selected, 'unseen')}>{t('markUnread')}</button>
            <button className={bulkButton} onClick={() => onAction(selected, 'flag')}>{t('star')}</button>
            {canArchive && <button className={bulkButton} onClick={() => onArchive(selected)}>{t('archive')}</button>}
            <button className={`${bulkButton} text-red-600 hover:bg-red-50`} onClick={() => onAction(selected, 'delete')}>{tc('delete')}</button>
          </div>
        ) : (
          <span className="text-gray-500">{list ? t('messageCount', { n: list.total }) : ''}</span>
        )}
        {list && pageCount > 1 && (
          <div className="ml-auto flex shrink-0 items-center gap-0.5 text-gray-600">
            <button disabled={list.page === 0} onClick={() => onPage(list.page - 1)} className="btn-icon h-7 w-7" aria-label={t('newer')}>
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <span className="tabular-nums">{list.page + 1}/{pageCount}</span>
            <button disabled={list.page + 1 >= pageCount} onClick={() => onPage(list.page + 1)} className="btn-icon h-7 w-7" aria-label={t('older')}>
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && <div className="m-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {loading && !list && (
          <div className="space-y-4 p-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex animate-pulse gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3.5 w-1/2 rounded bg-gray-200" />
                  <div className="h-3 w-5/6 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        )}
        {list && messages.length === 0 && !error && (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-gray-500">
            <EnvelopeOpenIcon className="h-8 w-8 text-gray-300" />
            {t('noMessages')}
          </div>
        )}
        <ul>
          {messages.map((m) => {
            const people = isSentFolder ? m.to : m.from;
            const who = displayName(people) || t('unknown');
            const active = m.uid === selectedUid;
            const isChecked = checked.has(m.uid);
            const rowAction = (label: string, icon: JSX.Element, run: () => void, danger = false) => (
              <button
                title={label}
                aria-label={label}
                onClick={(e) => { e.stopPropagation(); run(); }}
                className={`btn-icon h-8 w-8 ${danger ? 'hover:text-red-600' : ''}`}
              >
                {icon}
              </button>
            );
            return (
              <li
                key={m.uid}
                onClick={() => onOpen(m.uid)}
                className={`group relative flex cursor-pointer gap-3 border-b border-gray-100 px-3 py-2.5 transition-colors ${
                  active ? 'bg-primary-50' : isChecked ? 'bg-gray-50' : 'hover:bg-gray-50'
                }`}
              >
                {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary-600" />}
                {/* The avatar turns into a checkbox on hover or once anything is
                    selected; tapping it selects the message on touch screens. */}
                <div
                  className="relative mt-0.5 h-10 w-10 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!(e.target instanceof HTMLInputElement)) onCheck(m.uid, !isChecked);
                  }}
                >
                  <div className={checked.size > 0 ? 'hidden' : '[@media(hover:hover)]:group-hover:hidden'}>
                    <Avatar name={who} seed={people[0]?.address} />
                  </div>
                  <div className={`absolute inset-0 items-center justify-center ${checked.size > 0 ? 'flex' : 'hidden [@media(hover:hover)]:group-hover:flex'}`}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={isChecked}
                      onChange={(e) => onCheck(m.uid, e.target.checked)}
                      aria-label={t('selectMessage')}
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!m.seen && <span className="h-2 w-2 shrink-0 rounded-full bg-primary-600" />}
                    <span className={`truncate text-sm ${m.seen ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                      {isSentFolder ? t('toName', { name: who }) : <Highlight text={who} query={search} />}
                    </span>
                    <span className="ml-auto shrink-0 text-xs tabular-nums text-gray-500 [@media(hover:hover)]:group-hover:invisible">
                      {formatDate(m.date, locale)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1">
                    <span className={`truncate text-sm ${m.seen ? 'text-gray-500' : 'font-medium text-gray-800'}`}>
                      <Highlight text={m.subject} query={search} />
                    </span>
                    <span className="ml-auto flex shrink-0 items-center gap-1">
                      {m.hasAttachments && <PaperClipIcon className="h-3.5 w-3.5 text-gray-400" />}
                      {m.flagged && <StarSolidIcon className="h-3.5 w-3.5 text-yellow-400" />}
                    </span>
                  </div>
                </div>
                {/* Quick actions on hover (devices with a mouse only). */}
                <div className="absolute right-2 top-1.5 hidden items-center rounded-full border border-gray-200 bg-surface shadow-sm [@media(hover:hover)]:group-hover:flex">
                  {canArchive && rowAction(t('archive'), <ArchiveBoxIcon className="h-4 w-4" />, () => onArchive([m.uid]))}
                  {rowAction(m.seen ? t('markAsUnread') : t('markRead'),
                    m.seen ? <EnvelopeIcon className="h-4 w-4" /> : <EnvelopeOpenIcon className="h-4 w-4" />,
                    () => onAction([m.uid], m.seen ? 'unseen' : 'seen'))}
                  {rowAction(m.flagged ? t('removeStar') : t('star'),
                    m.flagged ? <StarSolidIcon className="h-4 w-4 text-yellow-400" /> : <StarIcon className="h-4 w-4" />,
                    () => onAction([m.uid], m.flagged ? 'unflag' : 'flag'))}
                  {rowAction(tc('delete'), <TrashIcon className="h-4 w-4" />, () => onAction([m.uid], 'delete'), true)}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
