#!/usr/bin/env bash
# The signup_hook migration on databases of its own. On the first: every earlier
# migration in ledger order, then apply/…_signup_hook_apply.sql twice (the
# second run must stop and change nothing), the read-only check all true, and
# the hook called as the auth service role with an anonymous and an email event.
# On the second: apply, revert twice, and the schema equals one the migration
# never touched; re-apply passes the check.
#   PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/signup-hook.sh
set -euo pipefail
cd "$(dirname "$0")"
export PSQL=${PSQL:?set PSQL to a psql command for a disposable server}
PG_DUMP=${PG_DUMP:-${PSQL/psql/pg_dump}}
NAME=20261023090000_signup_hook
apply() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -q "$@" 2>&1 | { grep -v '^NOTICE\|^WARNING' || true; }; }
fresh() {
  $PSQL -d postgres -qc "set client_min_messages = warning" -c "drop database if exists $DB" -c "create database $DB"
  $PSQL -d postgres -qAtc "select 1 from pg_roles where rolname = 'supabase_auth_admin'" | grep -q 1 \
    || $PSQL -d postgres -qc "create role supabase_auth_admin nologin"
  sed '/^create role/d;/^grant anon, authenticated/d' bootstrap.sql | apply
  for n in 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0012 0015 0013 0014 0016 0017 0021 0018 0022; do
    apply < ../migrations/${n}_*.sql
  done
  apply < ../migrations/20261018112757_reviewed_draft_approval.sql
  apply -o /dev/null < before-0018.sql
}
checked() {
  local bad
  bad=$($PSQL -d "$DB" -qAt -F ' | ' < ../apply/${NAME}_check.sql | grep -v ' | t$' || true)
  [ -z "$bad" ] || { echo "FAILED: ${NAME}_check.sql: $bad"; exit 1; }
}

sed -n "/^-- >>> supabase\/migrations\/${NAME}.sql/,/^-- <<< /p" ../apply/${NAME}_apply.sql | sed '1d;$d' \
  | diff -q - ../migrations/${NAME}.sql >/dev/null \
  || { echo "FAILED: apply/${NAME}_apply.sql does not carry the migration unchanged"; exit 1; }

export DB=verify_signup_hook
fresh
out=$(apply < ../apply/${NAME}_apply.sql || true)
[ -z "$out" ] || { echo "FAILED: applying: $out"; exit 1; }
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'already applied. Nothing was changed' || { echo "FAILED: a second apply did not stop: $out"; exit 1; }
rows=$($PSQL -d $DB -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = 'signup_hook'")
[ "$rows" = 1 ] || { echo "FAILED: $rows ledger rows for signup_hook"; exit 1; }
checked

# The auth service's own role runs it; the API roles are refused.
as_role() { $PSQL -d $DB -qAt -c "set role $1" -c "select private.before_user_created('$2'::jsonb)"; }
[ "$(as_role supabase_auth_admin '{"user": {"is_anonymous": true}}')" = '{}' ] \
  || { echo 'FAILED: an anonymous event was not allowed'; exit 1; }
as_role supabase_auth_admin '{"user": {"is_anonymous": false, "email": "a@b.co"}}' | grep -q '"http_code": 403' \
  || { echo 'FAILED: an email event was not refused with 403'; exit 1; }
as_role supabase_auth_admin '{"user": {"phone": "+630000000000"}}' | grep -q '"error"' \
  || { echo 'FAILED: an event with no anonymous flag was not refused'; exit 1; }
for role in anon authenticated; do
  { as_role $role '{"user": {"is_anonymous": true}}' 2>&1 || true; } | grep -q 'permission denied' \
    || { echo "FAILED: $role could run the hook"; exit 1; }
done
echo 'signup_hook: applied (a second run stops whole), check all true, anonymous allowed, email and unflagged refused, API roles denied'

DB=verify_signup_hook_revert
fresh
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/signup-hook-before.sql
apply < ../apply/${NAME}_apply.sql
apply < ../apply/${NAME}_revert.sql
apply < ../apply/${NAME}_revert.sql
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/signup-hook-after.sql
diff -q /tmp/signup-hook-before.sql /tmp/signup-hook-after.sql >/dev/null \
  || { echo 'FAILED: the schema after revert differs'; diff /tmp/signup-hook-before.sql /tmp/signup-hook-after.sql | head; exit 1; }
[ "$($PSQL -d $DB -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = 'signup_hook'")" = 0 ] \
  || { echo 'FAILED: revert left the ledger row'; exit 1; }
apply < ../apply/${NAME}_apply.sql
checked
echo 'signup_hook revert: schema as before (twice), ledger row gone, re-apply passes the check'
