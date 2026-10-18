-- ParaPo — undo 0022_draft_ops.sql on the live project, in one run.
--
-- Paste the whole file into the SQL editor (role: postgres). One transaction:
-- it removes the seven review functions, the four private helpers and the
-- link trigger, and the ledger row; then regenerate the types. Data is not
-- touched: drafts, takedowns and revisions are 0018's and stay as they are.
-- Undo this before ever undoing 0018. Safe to run twice.

begin;

drop function if exists public.claim_draft(text, uuid, boolean, bigint, jsonb, text);
drop function if exists public.submit_draft(uuid, integer);
drop function if exists public.send_back_draft(uuid, integer, text);
drop function if exists public.discard_draft(uuid, integer);
drop function if exists public.approve_draft(uuid);
drop function if exists public.take_down(text, uuid);
drop function if exists public.put_back(text, uuid);

drop trigger if exists route_stop_bumps_subjects on public.route_stop;
drop function if exists private.link_bumps_subjects();
drop function if exists private.refusal(text);
drop function if exists private.text_list(jsonb);
drop function if exists private.require_editor();

delete from supabase_migrations.schema_migrations where name = '0022_draft_ops';

commit;
