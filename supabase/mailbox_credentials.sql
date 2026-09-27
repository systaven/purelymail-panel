-- Stores one encrypted PurelyMail app password per mailbox for the webmail feature.
-- Run this once in the Supabase SQL editor.

create table if not exists public.mailbox_credentials (
  mailbox text primary key,
  -- AES-256-GCM ciphertext, encrypted with MAIL_CREDENTIALS_KEY by the panel
  encrypted_password text not null,
  created_at timestamptz not null default now()
);

-- Row level security with no policies: only the service role key, used
-- server-side by the panel, can read or write this table.
alter table public.mailbox_credentials enable row level security;
revoke all on public.mailbox_credentials from anon, authenticated;
grant select, insert, update, delete on public.mailbox_credentials to service_role;

-- Make the new table visible to the Supabase API right away.
notify pgrst, 'reload schema';
