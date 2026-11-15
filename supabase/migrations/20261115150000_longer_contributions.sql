-- Para lets a contribution last up to 24 hours, up from 6.
--
-- A community walk runs from morning to night, and a phone that recorded the
-- whole day held a ride the database refused. That ride stayed on the phone
-- with no way up. With 24 hours, one recording is still one contribution. The
-- other caps stay as they are. A ride holds at most 14,400 points (the phone
-- thins a longer ride to fit), 500 events and 500 gaps, a line of 200,000
-- bytes, and hintos of at most 21,600 seconds (the phone already clamps a
-- longer stop to that).
--
-- Only the length check on public.contribution changes. Every row there now
-- is 6 hours or less, so the new check passes on all of them. Adding it reads
-- the table once under a short lock. The public map reads published files, so
-- commuters see nothing, and a phone saving at that moment waits for it.
--
-- It runs after 20261019125900_contributions, and its apply refuses without
-- it. The session that wrote it did not apply it. The owner applies it as
-- postgres from supabase/apply/20261115150000_longer_contributions_apply.sql
-- and then records the ledger version. It is safe to run twice. The undo is
-- supabase/apply/20261115150000_longer_contributions_revert.sql.

alter table public.contribution drop constraint if exists contribution_check;
alter table public.contribution add constraint contribution_check
  check (ended_at > started_at and ended_at <= started_at + interval '24 hours');
