#!/usr/bin/env bash
# The isolated contributions preview's database: every migration in ledger
# order on a disposable Postgres, the contributions migration through its
# paste file, then what PostgREST needs (a login role) and the preview editor.
# Refuses anything but a local Docker container.
#   PSQL="docker exec -i parapo-preview-db psql -U postgres" bash scripts/preview/contributions-db.sh
set -euo pipefail
cd "$(dirname "$0")/../../supabase/verify"
PSQL=${PSQL:?set PSQL to a psql command for the disposable preview container}
case "$PSQL" in docker\ exec*) ;; *) echo 'Refused: PSQL must be a local docker exec'; exit 1 ;; esac
apply() { $PSQL -d postgres -v ON_ERROR_STOP=1 -q "$@" 2>&1 | { grep -v '^NOTICE\|^WARNING' || true; }; }
apply < bootstrap.sql
for n in 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0012 0015 0013 0014 0016 0017 0021 0018 0022; do
  apply < ../migrations/${n}_*.sql
done
apply < ../migrations/20261018112757_reviewed_draft_approval.sql
apply < ../apply/20261019125900_contributions_apply.sql
apply <<'SQL'
-- PostgREST hands the claims over as one JSON setting; the verification
-- scripts set the subject alone. auth.uid() reads either.
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub'
  )::uuid
$$;
create role authenticator login password 'preview' noinherit;
grant anon, authenticated to authenticator;
insert into auth.users (id, is_anonymous) values ('00000000-0000-0000-0000-0000000000e1', false);
insert into private.editor (user_id) values ('00000000-0000-0000-0000-0000000000e1');
SQL
echo 'preview database: migrations applied, contributions on, editor e1'
