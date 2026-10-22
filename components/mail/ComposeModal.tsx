import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { PaperClipIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLocale, useT } from '@/lib/i18n';
import { commonMessages } from '@/lib/i18n/messages/common';
import { mailMessages } from '@/lib/i18n/messages/mail';
import { useErrorText } from '@/lib/i18n/useErrorText';
import { formatSize, OutgoingMessage } from './api';
import { modKey } from './ui';

// Kept well below the send route's 15mb body limit, since base64 adds a third.
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export interface ComposeDraft {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  text: string;
  inReplyTo?: string;
  references?: string[];
}

export const emptyDraft: ComposeDraft = { to: '', cc: '', bcc: '', subject: '', text: '' };

// An unsent new message is kept in this browser until it's sent or discarded,
// so a reload or a closed tab doesn't lose it. Attachments aren't kept.
const draftKey = (mailbox: string) => `mail-draft:${mailbox}`;

function loadDraft(mailbox: string): ComposeDraft | null {
  try {
    const saved = JSON.parse(localStorage.getItem(draftKey(mailbox)) || 'null');
    return saved && typeof saved.text === 'string' ? { ...emptyDraft, ...saved } : null;
  } catch {
    return null;
  }
}

function storeDraft(mailbox: string, draft: ComposeDraft | null) {
  try {
    if (draft) localStorage.setItem(draftKey(mailbox), JSON.stringify(draft));
    else localStorage.removeItem(draftKey(mailbox));
  } catch {
    // Storage may be full or blocked; the draft just isn't kept.
  }
}

const isBlank = (d: ComposeDraft) => !d.to.trim() && !d.cc.trim() && !d.bcc.trim() && !d.subject.trim() && !d.text.trim();

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function ComposeModal({
  title,
  mailbox,
  initial,
  autosave = false,
  onClose,
  onSend,
}: {
  title: string;
  mailbox: string;
  initial: ComposeDraft;
  // Keep and restore the draft in this browser (new messages only).
  autosave?: boolean;
  onClose: () => void;
  onSend: (message: OutgoingMessage) => Promise<void>;
}) {
  const t = useT(mailMessages);
  const tc = useT(commonMessages);
  const { locale } = useLocale();
  const errorText = useErrorText();
  const [draft, setDraft] = useState<ComposeDraft>(initial);
  const [files, setFiles] = useState<File[]>([]);
  const restored = useRef(false);

  useEffect(() => {
    if (!autosave) return;
    const saved = loadDraft(mailbox);
    if (saved && !isBlank(saved)) {
      restored.current = true;
      setDraft(saved);
      setShowCcBcc(Boolean(saved.cc || saved.bcc));
      toast(t('draftRestored'));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autosave) return;
    const timer = setTimeout(() => storeDraft(mailbox, isBlank(draft) ? null : draft), 400);
    return () => clearTimeout(timer);
  }, [autosave, mailbox, draft]);

  const dirty = files.length > 0 || (restored.current ? !isBlank(draft) : JSON.stringify(draft) !== JSON.stringify(initial));
  const close = () => {
    if (autosave || !dirty || confirm(t('discardDraftConfirm'))) onClose();
  };
  const discard = () => {
    if (dirty && !confirm(t('discardDraftConfirm'))) return;
    if (autosave) storeDraft(mailbox, null);
    onClose();
  };
  const [showCcBcc, setShowCcBcc] = useState(Boolean(initial.cc || initial.bcc));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const tooLarge = totalSize > MAX_ATTACHMENT_BYTES;

  const update = (field: keyof ComposeDraft) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft({ ...draft, [field]: e.target.value });

  const handleSend = async () => {
    if (!draft.to.trim()) {
      setError(t('recipientRequired'));
      return;
    }
    setSending(true);
    setError(null);
    try {
      const attachments = await Promise.all(
        files.map(async (file) => ({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          content: await readAsBase64(file),
        }))
      );
      await onSend({ ...draft, attachments });
      if (autosave) storeDraft(mailbox, null);
    } catch (err) {
      setError(errorText(err));
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          if (!sending && !tooLarge) handleSend();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          close();
        }
      }}
    >
      <div className="flex h-full w-full flex-col bg-surface shadow-xl sm:h-auto sm:max-h-full sm:max-w-3xl sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-2">
          <h2 className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <button onClick={close} className="btn-icon" aria-label={tc('close')}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="text-sm text-gray-500">
            {t('from')} <span className="font-medium text-gray-900">{mailbox}</span>
          </div>
          <div className="flex items-center gap-2">
            <input className="form-input" placeholder={t('toPlaceholder')} value={draft.to} onChange={update('to')} />
            {!showCcBcc && (
              <button type="button" onClick={() => setShowCcBcc(true)} className="whitespace-nowrap text-sm text-primary-600 hover:underline">
                {t('ccBcc')}
              </button>
            )}
          </div>
          {showCcBcc && (
            <>
              <input className="form-input" placeholder={t('cc')} value={draft.cc} onChange={update('cc')} />
              <input className="form-input" placeholder={t('bcc')} value={draft.bcc} onChange={update('bcc')} />
            </>
          )}
          <input className="form-input" placeholder={t('subject')} value={draft.subject} onChange={update('subject')} />
          <textarea
            className="form-input min-h-[12rem] flex-1 font-mono text-sm sm:min-h-[18rem]"
            value={draft.text}
            onChange={update('text')}
            autoFocus
          />

          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary-600 hover:underline">
              <PaperClipIcon className="h-4 w-4" />
              {t('attachFiles')}
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  setFiles([...files, ...Array.from(e.target.files || [])]);
                  e.target.value = '';
                }}
              />
            </label>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((file, i) => (
                  <li key={i} className="flex items-center justify-between rounded bg-gray-50 px-3 py-1 text-sm">
                    <span className="truncate">{file.name} <span className="text-gray-500">({formatSize(file.size, locale)})</span></span>
                    <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600" aria-label={t('removeAttachment')}>
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {tooLarge && (
              <p className="mt-2 text-sm text-red-600">
                {t('attachmentsTooLarge', { size: formatSize(totalSize, locale), limit: formatSize(MAX_ATTACHMENT_BYTES, locale) })}
              </p>
            )}
          </div>

          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-3">
          <span className="mr-auto hidden text-xs text-gray-400 sm:block">{t('sendHint', { key: modKey() })}</span>
          <button onClick={discard} className="btn-secondary" disabled={sending}>{t('discard')}</button>
          <button onClick={handleSend} className="btn-primary" disabled={sending || tooLarge}>
            {sending ? t('sending') : t('send')}
          </button>
        </div>
      </div>
    </div>
  );
}
