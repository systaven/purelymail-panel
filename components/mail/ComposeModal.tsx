import { useState } from 'react';
import { PaperClipIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
      setError('Please enter at least one recipient');
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
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-full w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="text-sm text-gray-500">
            From <span className="font-medium text-gray-900">{mailbox}</span>
          </div>
          <div className="flex items-center gap-2">
            <input className="form-input" placeholder="To (separate addresses with commas)" value={draft.to} onChange={update('to')} />
            {!showCcBcc && (
              <button type="button" onClick={() => setShowCcBcc(true)} className="whitespace-nowrap text-sm text-primary-600 hover:underline">
                Cc / Bcc
              </button>
            )}
          </div>
          {showCcBcc && (
            <>
              <input className="form-input" placeholder="Cc" value={draft.cc} onChange={update('cc')} />
              <input className="form-input" placeholder="Bcc" value={draft.bcc} onChange={update('bcc')} />
            </>
          )}
          <input className="form-input" placeholder="Subject" value={draft.subject} onChange={update('subject')} />
          <textarea
            className="form-input min-h-[18rem] font-mono text-sm"
            value={draft.text}
            onChange={update('text')}
            autoFocus
          />

          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary-600 hover:underline">
              <PaperClipIcon className="h-4 w-4" />
              Attach files
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
                    <span className="truncate">{file.name} <span className="text-gray-500">({formatSize(file.size)})</span></span>
                    <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600" aria-label="Remove attachment">
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {tooLarge && (
              <p className="mt-2 text-sm text-red-600">
                Attachments total {formatSize(totalSize)}; the limit is {formatSize(MAX_ATTACHMENT_BYTES)}.
              </p>
            )}
          </div>

          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-3">
          <button onClick={onClose} className="btn-secondary" disabled={sending}>Discard</button>
          <button onClick={handleSend} className="btn-primary disabled:opacity-50" disabled={sending || tooLarge}>
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
