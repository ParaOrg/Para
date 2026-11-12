-- Para — waitlist: the emails of people who asked to be told when the iPhone
-- app is out
--
-- /app/ has an Android download and nothing to install on an iPhone, so its
-- iPhone part takes an email. This table keeps them, one row an email, until
-- the app is out and the one message is sent.
--
-- An email is kept trimmed and in lower case, so the same address written two
-- ways is one row. The check below is the only rule on its shape: something,
-- an @, something, a dot, something, no spaces, at most 254 characters.
--
-- Who may do what:
--   anon, authenticated   nothing: no grant, and row security is on with no
--                         rule. A phone or a browser holding the publishable
--                         key cannot read, add or count the list.
--   service_role          selects and inserts. Only the waitlist Edge Function
--                         (supabase/functions/waitlist) holds it, and it adds
--                         a row only after Cloudflare's bot check passes.
--   the owner             reads the list in the dashboard to send the message,
--                         and deletes a row when someone asks to be taken off.
--
-- Written, not applied: the owner applies it, as postgres, from
-- supabase/apply/20261112120000_waitlist_apply.sql, then records the ledger
-- version. Undo: supabase/apply/20261112120000_waitlist_revert.sql.

create table public.waitlist (
  email text primary key
    check (
      email = lower(email)
      and length(email) <= 254
      and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    ),
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- service_role is named too: on the live project a new table in public is its to change and
-- empty by default (0017 left that default alone), and the function only ever adds and reads.
revoke all on public.waitlist from public, anon, authenticated, service_role;
grant select, insert on public.waitlist to service_role;
