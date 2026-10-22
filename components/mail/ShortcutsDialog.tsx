import { XMarkIcon } from '@heroicons/react/24/outline';
import { useT } from '@/lib/i18n';
import { commonMessages } from '@/lib/i18n/messages/common';
import { mailMessages } from '@/lib/i18n/messages/mail';
import { modKey } from './ui';

type Key = keyof typeof mailMessages.en;

// Keep in sync with the handlers in MailClient. Keys are alternatives unless
// the row is a combination (third item).
const SHORTCUTS: [string[], Key, boolean?][] = [
  [['j', 'k'], 'kbNextPrev'],
  [['u', 'Esc'], 'kbClose'],
  [['r'], 'kbReply'],
  [['a'], 'kbReplyAll'],
  [['f'], 'kbForward'],
  [['s'], 'kbStar'],
  [['Shift', 'U'], 'kbUnread', true],
  [['e'], 'kbArchive'],
  [['#'], 'kbDelete'],
  [['x'], 'kbSelect'],
  [['c'], 'kbCompose'],
  [['/'], 'kbSearch'],
  [['?'], 'kbHelp'],
];

export default function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const t = useT(mailMessages);
  const tc = useT(commonMessages);
  const rows: [string[], Key, boolean?][] = [...SHORTCUTS, [[modKey(), 'Enter'], 'kbSend', true]];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={t('shortcuts')}>
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-xl bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="font-semibold text-gray-900">{t('shortcuts')}</h2>
          <button onClick={onClose} className="btn-icon" aria-label={tc('close')}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <dl className="grid grid-cols-[1fr,auto] gap-x-6 gap-y-2.5 px-5 py-4 text-sm">
          {rows.map(([keys, label, combo]) => (
            <div key={label} className="contents">
              <dt className="text-gray-700">{t(label)}</dt>
              <dd className="flex items-center justify-end gap-1">
                {keys.map((k, i) => (
                  <span key={k} className="flex items-center gap-1">
                    {i > 0 && <span className="text-xs text-gray-400">{combo ? '+' : '/'}</span>}
                    <kbd className="kbd">{k}</kbd>
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
