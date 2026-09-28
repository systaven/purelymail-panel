import { getSupabase } from '@/lib/supabase';
import { getPurelyMail } from '@/lib/purelymail';
import { encrypt, decrypt, getKey } from './crypto';

// Each mailbox gets one PurelyMail app password, created through the API key
// and stored encrypted in Supabase so it can be reused for IMAP/SMTP logins.

const TABLE = 'mailbox_credentials';
const APP_PASSWORD_NAME = 'PurelyMail Panel webmail';

async function readStored(mailbox: string): Promise<string | null> {
  // Fail on a missing key up front, so it isn't mistaken for a corrupt row below.
  getKey();
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('encrypted_password')
    .eq('mailbox', mailbox)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to read mailbox credentials: ${error.message}`);
  }
  if (!data) {
    return null;
  }
  try {
    return decrypt(data.encrypted_password);
  } catch {
    // Usually means MAIL_CREDENTIALS_KEY changed. Drop the row so a new app
    // password gets created; the old one can't be deleted in PurelyMail
    // because we can no longer read it.
    console.warn(`Stored app password for ${mailbox} could not be decrypted; replacing it`);
    await deleteStored(mailbox);
    return null;
  }
}

// Removes the stored app password without contacting PurelyMail, e.g. after
// the mailbox itself was deleted (which also deletes its app passwords).
export async function forgetAppPassword(mailbox: string): Promise<void> {
  await deleteStored(mailbox);
}

async function deleteStored(mailbox: string): Promise<void> {
  const { error } = await getSupabase().from(TABLE).delete().eq('mailbox', mailbox);
  if (error) {
    throw new Error(`Failed to delete mailbox credentials: ${error.message}`);
  }
}

// Returns the app password for a mailbox, creating one if none is stored.
export async function getAppPassword(mailbox: string): Promise<string> {
  const stored = await readStored(mailbox);
  if (stored) {
    return stored;
  }

  const api = getPurelyMail();
  const created = await api.createAppPassword(mailbox, APP_PASSWORD_NAME);

  // Insert only if no other request stored one in the meantime.
  const { error } = await getSupabase()
    .from(TABLE)
    .upsert(
      { mailbox, encrypted_password: encrypt(created) },
      { onConflict: 'mailbox', ignoreDuplicates: true }
    );
  if (error) {
    await api.deleteAppPassword(mailbox, created).catch(() => {});
    throw new Error(`Failed to store mailbox credentials: ${error.message}`);
  }

  const winner = await readStored(mailbox);
  if (winner !== created) {
    // A concurrent request won the race; drop the password we just made.
    await api.deleteAppPassword(mailbox, created).catch(() => {});
  }
  return winner ?? created;
}

// Deletes the stored app password from both Supabase and PurelyMail.
export async function revokeAppPassword(mailbox: string): Promise<void> {
  const stored = await readStored(mailbox);
  if (stored) {
    await getPurelyMail().deleteAppPassword(mailbox, stored).catch((err) => {
      // It may already have been removed in PurelyMail; still clear our copy.
      console.warn(`Could not delete app password for ${mailbox}:`, err.message);
    });
  }
  await deleteStored(mailbox);
}
