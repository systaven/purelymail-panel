import { useState } from 'react';
import { PaperClipIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLocale, useT } from '@/lib/i18n';
import { commonMessages } from '@/lib/i18n/messages/common';
import { mailMessages } from '@/lib/i18n/messages/mail';
import { useErrorText } from '@/lib/i18n/useErrorText';
import { formatSize, OutgoingMessage } from './api';

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
  onClose,
  onSend,
}: {
  title: string;
  mailbox: string;
  initial: ComposeDraft;
  onClose: () => void;
  onSend: (message: OutgoingMessage) => Promise<void>;
}) {
  const t = useT(mailMessages);
  const tc = useT(commonMessages);
  const { locale } = useLocale();
  const errorText = useErrorText();
  const [draft, setDraft] = useState<ComposeDraft>(initial);
  const [showCcBcc, setShowCcBcc] = useState(Boolean(initial.cc || initial.bcc));
  const [files, setFiles] = useState<File[]>([]);
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
    } catch (err) {
      setError(errorText(err));
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 sm:p-4">
      <div className="flex h-full w-full flex-col bg-surface shadow-xl sm:h-auto sm:max-h-full sm:max-w-3xl sm:rounded-lg">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label={tc('close')}>
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

        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-3">
          <button onClick={onClose} className="btn-secondary" disabled={sending}>{t('discard')}</button>
          <button onClick={handleSend} className="btn-primary disabled:opacity-50" disabled={sending || tooLarge}>
            {sending ? t('sending') : t('send')}
          </button>
        </div>
      </div>
    </div>
  );
}
