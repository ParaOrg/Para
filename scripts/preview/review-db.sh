#!/usr/bin/env bash
# The isolated review preview's database (README.md, step 2): para_preview on
# the disposable server supabase/verify/run.sh has just checked, with every
# migration through 0022 in ledger order, the reviewed approval, the auth.uid()
# stand-in PostgREST needs, a login role for PostgREST and the fixture editor.
# Refuses anything but a local Docker container.
#   PSQL="docker exec -i para-review-db psql -U postgres" bash scripts/preview/review-db.sh
set -euo pipefail
cd "$(dirname "$0")/../../supabase/verify"
PSQL=${PSQL:?set PSQL to a psql command for the disposable preview container}
case "$PSQL" in docker\ exec*) ;; *) echo 'Refused: PSQL must be a local docker exec'; exit 1 ;; esac
apply() { $PSQL -d para_preview -v ON_ERROR_STOP=1 -q "$@" 2>&1 | { grep -v '^NOTICE\|^WARNING' || true; }; }
$PSQL -d postgres -qc "set client_min_messages = warning" -c "drop database if exists para_preview" -c "create database para_preview"
# run.sh made the roles on this server already; bootstrap.sql's other stand-ins are per database.
if $PSQL -d postgres -qAtc "select 1 from pg_roles where rolname = 'anon'" | grep -q 1; then
  sed '/^create role/d;/^grant anon, authenticated/d' bootstrap.sql | apply
else
  apply < bootstrap.sql
fi
for n in 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0012 0015 0013 0014 0016 0017 0021 0018 0022; do
  apply < ../migrations/${n}_*.sql
done
apply < ../migrations/20261018112757_reviewed_draft_approval.sql
apply <<'SQL'
-- PostgREST hands the claims over as one JSON setting; the verification
-- scripts set the subject alone. auth.uid() reads either.
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub'
  )::uuid
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator login password 'preview' noinherit;
  end if;
end $$;
grant anon, authenticated to authenticator;
-- The fixture's editor (review-fixture.mjs, PREVIEW_USER_ID).
insert into auth.users (id, is_anonymous) values ('00000000-0000-0000-0000-0000000000e1', false);
insert into private.editor (user_id) values ('00000000-0000-0000-0000-0000000000e1');
SQL
echo 'review preview database: para_preview through 0022 and the reviewed approval, editor e1'
