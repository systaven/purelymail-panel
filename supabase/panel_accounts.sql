-- Guest accounts (Clerk users), mailbox ownership, mailbox requests and an audit log.
-- Run this once in the Supabase SQL editor, after mailbox_credentials.sql. Safe to re-run.
-- Like mailbox_credentials, every table has RLS on and no policies: only the
-- service role key, used server-side by the panel, can access them.

-- Global defaults for guests. Always exactly one row (id = 1).
create table if not exists public.panel_settings (
  id smallint primary key default 1 check (id = 1),
  default_max_mailboxes integer not null default 1 check (default_max_mailboxes >= 0),
  default_requires_approval boolean not null default true,
  -- Domains every guest may create mailboxes on.
  open_domains text[] not null default '{}',
  updated_at timestamptz not null default now()
);
insert into public.panel_settings (id) values (1) on conflict (id) do nothing;

-- One row per Clerk user who has signed in to the panel.
create table if not exists public.panel_users (
  clerk_user_id text primary key,
  email text,
  name text,
  role text not null default 'guest' check (role in ('guest', 'admin')),
  -- Blocked users can sign in but can't do anything.
  disabled boolean not null default false,
  -- null means "use the default from panel_settings".
  max_mailboxes integer check (max_mailboxes >= 0),
  requires_approval boolean,
  -- Domains this user may use in addition to panel_settings.open_domains.
  extra_domains text[] not null default '{}',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- Which guest owns which mailbox. Mailboxes without a row belong to the admin.
create table if not exists public.mailbox_owners (
  mailbox text primary key,
  clerk_user_id text not null references public.panel_users (clerk_user_id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists mailbox_owners_user_idx on public.mailbox_owners (clerk_user_id);

-- Mailbox creation requests from guests who need approval.
create table if not exists public.mailbox_requests (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null references public.panel_users (clerk_user_id) on delete cascade,
  mailbox text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  decision_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists mailbox_requests_user_idx on public.mailbox_requests (clerk_user_id);
-- At most one pending request per address.
create unique index if not exists mailbox_requests_pending_mailbox_idx
  on public.mailbox_requests (mailbox) where status = 'pending';

-- Who did what, for the admin's Guests page.
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  -- 'admin' for the password login, otherwise a Clerk user ID.
  actor text not null,
  action text not null,
  target text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

do $$
declare t text;
begin
  foreach t in array array['panel_settings', 'panel_users', 'mailbox_owners', 'mailbox_requests', 'audit_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
