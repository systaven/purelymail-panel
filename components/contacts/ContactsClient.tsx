import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowPathIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { AddressBookInfo, Contact, ContactInput, davApi } from '@/components/dav/api';
import { useMailboxSelection } from '@/hooks/useMailboxSelection';
import { useT } from '@/lib/i18n';
import { commonMessages } from '@/lib/i18n/messages/common';
import { contactsMessages } from '@/lib/i18n/messages/contacts';
import { useErrorText } from '@/lib/i18n/useErrorText';
import ContactDetail from './ContactDetail';
import ContactFormModal from './ContactFormModal';
import ContactListPane from './ContactListPane';
import { contactLabel, matchesQuery } from './utils';

type Pick = (contacts: Contact[]) => Contact | undefined;

export default function ContactsClient() {
  const t = useT(contactsMessages);
  const tc = useT(commonMessages);
  const errorText = useErrorText();
  const { mailboxes, mailbox, setMailbox, ready, error: setupError } = useMailboxSelection();

  const [books, setBooks] = useState<AddressBookInfo[] | null>(null);
  // Tagged with its mailbox so a switch never loads the old book from the new mailbox.
  const [bookSel, setBookSel] = useState<{ mailbox: string; href: string } | null>(null);
  const book = bookSel?.mailbox === mailbox ? bookSel.href : '';
  const setBook = (href: string) => setBookSel({ mailbox, href });
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedHref, setSelectedHref] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ contact: Contact | null } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const request = useRef(0);

  // Address books of the mailbox; the first one is opened.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setBooks(null);
    setContacts(null);
    setSelectedHref(null);
    setError(null);
    setLoading(true);
    davApi.addressBooks(mailbox)
      .then((list) => {
        if (cancelled) return;
        setBooks(list);
        setBook(list[0]?.href || '');
        if (!list.length) setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(errorText(err));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [mailbox, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Loads the book's contacts; `pick` chooses the contact to select afterwards.
  const loadContacts = useCallback(async (pick?: Pick) => {
    if (!ready || !book) return;
    const id = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const list = await davApi.contacts(mailbox, book);
      if (id !== request.current) return;
      setContacts(list);
      if (pick) setSelectedHref(pick(list)?.href ?? null);
    } catch (err) {
      if (id === request.current) setError(errorText(err));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [mailbox, book, ready, errorText]);

  useEffect(() => {
    setContacts(null);
    setSelectedHref(null);
    loadContacts();
  }, [loadContacts]);

  const filtered = useMemo(() => contacts?.filter((c) => matchesQuery(c, query)) ?? null, [contacts, query]);
  const selected = contacts?.find((c) => c.href === selectedHref) ?? null;

  const save = async (input: ContactInput) => {
    const target = editing?.contact;
    if (target) {
      await davApi.updateContact(mailbox, target.href, target.etag, input);
    } else {
      await davApi.createContact(mailbox, book, input);
    }
    setEditing(null);
    toast.success(t('saved'));
    // The server picks a new contact's href, so find it again by name and email.
    const email = input.emails?.[0]?.toLowerCase();
    await loadContacts(target
      ? (list) => list.find((c) => c.href === target.href)
      : (list) => list.find((c) => c.name === input.name && (!email || c.emails.some((e) => e.toLowerCase() === email))));
  };

  const remove = async () => {
    if (!selected || !confirm(t('deleteConfirm', { name: contactLabel(selected) || t('noName') }))) return;
    setDeleting(true);
    try {
      await davApi.deleteContact(mailbox, selected.href, selected.etag);
      toast.success(t('deleted'));
      await loadContacts(() => undefined);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setDeleting(false);
    }
  };

  if (setupError) {
    return <div className="rounded-md bg-red-50 p-4 text-red-700">{setupError}</div>;
  }

  const noBooks = books !== null && books.length === 0;
  // On phones only one pane shows at a time: the detail once a contact is picked.
  const detailOpen = selected !== null;

  return (
    <>
      <div className="flex h-[calc(100dvh-4.5rem)] flex-col gap-2 sm:h-[calc(100dvh-5.5rem)] sm:gap-3 lg:h-[calc(100dvh-3rem)]">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="hidden text-3xl font-bold text-gray-900 lg:mr-2 lg:block">{t('title')}</h1>
          {mailboxes.length > 1 && (
            <select
              className="min-w-0 flex-1 rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm lg:flex-none"
              value={mailbox}
              onChange={(e) => setMailbox(e.target.value)}
              aria-label={t('mailbox')}
            >
              {mailboxes.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          {books && books.length > 1 && (
            <select
              className="min-w-0 flex-1 rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm lg:flex-none"
              value={book}
              onChange={(e) => setBook(e.target.value)}
              aria-label={t('addressBook')}
            >
              {books.map((b) => <option key={b.href} value={b.href}>{b.name}</option>)}
            </select>
          )}
          <div className="relative order-last w-full sm:order-none sm:w-auto sm:min-w-[12rem] sm:flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="search"
              className="form-input pl-9 text-sm"
              placeholder={t('search')}
              aria-label={t('search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => loadContacts()}
            className="btn-secondary px-3 text-sm"
            disabled={!book}
            title={tc('refresh')}
            aria-label={tc('refresh')}
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setEditing({ contact: null })}
            className="btn-primary ml-auto text-sm sm:ml-0"
            disabled={!book}
            title={t('newContact')}
          >
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('newContact')}</span>
            <span className="sm:hidden">{t('newContactShort')}</span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-surface shadow-sm">
          <div className={`min-h-0 w-full border-gray-200 md:block md:w-80 md:shrink-0 md:border-r xl:w-96 ${detailOpen ? 'hidden' : 'block'}`}>
            <ContactListPane
              contacts={filtered}
              total={contacts?.length ?? 0}
              query={query}
              loading={loading || !ready}
              error={error}
              noBooks={noBooks}
              selectedHref={selectedHref}
              onSelect={setSelectedHref}
              onNew={() => setEditing({ contact: null })}
            />
          </div>
          <div className={`min-h-0 min-w-0 flex-1 md:block ${detailOpen ? 'block' : 'hidden'}`}>
            <ContactDetail
              mailbox={mailbox}
              contact={selected}
              deleting={deleting}
              onBack={() => setSelectedHref(null)}
              onEdit={() => selected && setEditing({ contact: selected })}
              onDelete={remove}
            />
          </div>
        </div>
      </div>

      {editing && (
        <ContactFormModal contact={editing.contact} onClose={() => setEditing(null)} onSave={save} />
      )}
    </>
  );
}
