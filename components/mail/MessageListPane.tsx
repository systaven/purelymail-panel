import { ChevronLeftIcon, ChevronRightIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { displayName, formatDate, MessageAction, MessageList } from './api';

export default function MessageListPane({
  list,
  loading,
  error,
  isSentFolder,
  selectedUid,
  checked,
  onOpen,
  onCheck,
  onCheckAll,
  onBulkAction,
  onPage,
}: {
  list: MessageList | null;
  loading: boolean;
  error: string | null;
  isSentFolder: boolean;
  selectedUid: number | null;
  checked: Set<number>;
  onOpen: (uid: number) => void;
  onCheck: (uid: number, value: boolean) => void;
  onCheckAll: (value: boolean) => void;
  onBulkAction: (action: MessageAction) => void;
  onPage: (page: number) => void;
}) {
  const messages = list?.messages || [];
  const allChecked = messages.length > 0 && messages.every((m) => checked.has(m.uid));
  const pageCount = list ? Math.max(1, Math.ceil(list.total / list.pageSize)) : 1;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2 text-sm">
        <input
          type="checkbox"
          className="rounded border-gray-300"
          checked={allChecked}
          onChange={(e) => onCheckAll(e.target.checked)}
          aria-label="Select all"
        />
        {checked.size > 0 ? (
          <div className="flex items-center gap-1">
            <span className="mr-1 text-gray-600">{checked.size} selected</span>
            <button className="rounded px-2 py-1 hover:bg-gray-100" onClick={() => onBulkAction('seen')}>Read</button>
            <button className="rounded px-2 py-1 hover:bg-gray-100" onClick={() => onBulkAction('unseen')}>Unread</button>
            <button className="rounded px-2 py-1 hover:bg-gray-100" onClick={() => onBulkAction('flag')}>Star</button>
            <button className="rounded px-2 py-1 text-red-600 hover:bg-red-50" onClick={() => onBulkAction('delete')}>Delete</button>
          </div>
        ) : (
          <span className="text-gray-500">{list ? `${list.total} messages` : ''}</span>
        )}
        {list && pageCount > 1 && (
          <div className="ml-auto flex items-center gap-1 text-gray-600">
            <button disabled={list.page === 0} onClick={() => onPage(list.page - 1)} className="rounded p-1 hover:bg-gray-100 disabled:opacity-30" aria-label="Newer">
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            {list.page + 1}/{pageCount}
            <button disabled={list.page + 1 >= pageCount} onClick={() => onPage(list.page + 1)} className="rounded p-1 hover:bg-gray-100 disabled:opacity-30" aria-label="Older">
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && <div className="m-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {loading && !list && (
          <div className="space-y-3 p-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 w-1/2 rounded bg-gray-200" />
                <div className="h-3 w-3/4 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        )}
        {list && messages.length === 0 && !error && (
          <div className="p-6 text-center text-sm text-gray-500">No messages</div>
        )}
        <ul>
          {messages.map((m) => {
            const who = displayName(isSentFolder ? m.to : m.from) || '(unknown)';
            const active = m.uid === selectedUid;
            return (
              <li
                key={m.uid}
                onClick={() => onOpen(m.uid)}
                className={`flex cursor-pointer gap-2 border-b border-gray-100 px-3 py-2 ${
                  active ? 'bg-primary-50' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 rounded border-gray-300"
                  checked={checked.has(m.uid)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onCheck(m.uid, e.target.checked)}
                  aria-label="Select message"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!m.seen && <span className="h-2 w-2 shrink-0 rounded-full bg-primary-600" />}
                    <span className={`truncate text-sm ${m.seen ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                      {isSentFolder ? `To: ${who}` : who}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-gray-500">{formatDate(m.date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`truncate text-sm ${m.seen ? 'text-gray-600' : 'font-medium text-gray-800'}`}>
                      {m.subject}
                    </span>
                    <span className="ml-auto flex shrink-0 items-center gap-1">
                      {m.hasAttachments && <PaperClipIcon className="h-3.5 w-3.5 text-gray-400" />}
                      {m.flagged && <StarSolidIcon className="h-3.5 w-3.5 text-yellow-400" />}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
