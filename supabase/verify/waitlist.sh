#!/usr/bin/env bash
# The waitlist migration on databases of its own. It leans on no other migration, so each starts
# from bootstrap.sql alone, whose default privileges hand a new table to anon and authenticated as a
# Supabase project from before 0017 did, plus the default the live project still has, everything on
# a new table to service_role: the migration's own revoke is what closes both. On the first:
# apply/…_waitlist_apply.sql twice (the second run must stop and change nothing), and the check: its
# rolled-back behaviour part raises nothing and leaves nothing behind, and its read-only rows are all
# true. On the second: apply, a revert refused while the list holds an email, then revert twice once
# it is empty, and the schema equals one the migration never touched; re-apply passes the check.
#   PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/waitlist.sh
set -euo pipefail
cd "$(dirname "$0")"
export PSQL=${PSQL:?set PSQL to a psql command for a disposable server}
PG_DUMP=${PG_DUMP:-${PSQL/psql/pg_dump}}
NAME=20261112120000_waitlist
apply() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -q "$@" 2>&1 | { grep -v '^NOTICE\|^WARNING' || true; }; }
fresh() {
  $PSQL -d postgres -qc "set client_min_messages = warning" -c "drop database if exists $DB" -c "create database $DB"
  sed '/^create role/d;/^grant anon, authenticated/d' bootstrap.sql | apply
  apply -c 'alter default privileges in schema public grant all on tables to service_role'
}
checked() {
  local out rows
  out=$($PSQL -d "$DB" -v ON_ERROR_STOP=1 -qAt -F ' | ' < ../apply/${NAME}_check.sql 2>&1) \
    || { echo "FAILED: ${NAME}_check.sql: $(echo "$out" | grep -E 'ERROR|FAILED' | head -3)"; exit 1; }
  rows=$(echo "$out" | grep -E '^[0-9]+ \| ')
  [ "$(echo "$rows" | wc -l)" = 4 ] || { echo "FAILED: ${NAME}_check.sql gave $(echo "$rows" | wc -l) rows"; exit 1; }
  ! echo "$rows" | grep -v ' | t$' || { echo "FAILED: ${NAME}_check.sql"; exit 1; }
}
ledger() { $PSQL -d "$DB" -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = 'waitlist'"; }
listed() { $PSQL -d "$DB" -qAt -c "select count(*) from public.waitlist"; }

sed -n "/^-- >>> supabase\/migrations\/${NAME}.sql/,/^-- <<< /p" ../apply/${NAME}_apply.sql | sed '1d;$d' \
  | diff -q - ../migrations/${NAME}.sql >/dev/null \
  || { echo "FAILED: apply/${NAME}_apply.sql does not carry the migration unchanged"; exit 1; }

export DB=verify_waitlist
fresh
out=$(apply < ../apply/${NAME}_apply.sql || true)
[ -z "$out" ] || { echo "FAILED: applying: $out"; exit 1; }
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'already applied. Nothing was changed' || { echo "FAILED: a second apply did not stop: $out"; exit 1; }
[ "$(ledger)" = 1 ] || { echo "FAILED: $(ledger) ledger rows for waitlist"; exit 1; }
checked
[ "$(listed)" = 0 ] || { echo "FAILED: the check left $(listed) emails behind"; exit 1; }
echo 'waitlist: applied (a second run stops whole), the check passed and left nothing behind'

DB=verify_waitlist_revert
fresh
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/waitlist-before.sql
apply < ../apply/${NAME}_apply.sql
$PSQL -d "$DB" -qc "insert into public.waitlist (email) values ('kept@waitlist-verify.invalid')"
out=$(apply < ../apply/${NAME}_revert.sql || true)
echo "$out" | grep -q 'the list holds emails. Nothing was changed' || { echo "FAILED: revert ran over a kept email: $out"; exit 1; }
[ "$(listed)/$(ledger)" = 1/1 ] || { echo 'FAILED: the refused revert changed something'; exit 1; }
$PSQL -d "$DB" -qc "delete from public.waitlist"
apply < ../apply/${NAME}_revert.sql
apply < ../apply/${NAME}_revert.sql
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/waitlist-after.sql
diff -q /tmp/waitlist-before.sql /tmp/waitlist-after.sql >/dev/null \
  || { echo 'FAILED: the schema after revert differs'; diff /tmp/waitlist-before.sql /tmp/waitlist-after.sql | head -20; exit 1; }
[ "$(ledger)" = 0 ] || { echo 'FAILED: revert left the ledger row'; exit 1; }
apply < ../apply/${NAME}_apply.sql
checked
echo 'waitlist revert: refused over a kept email, then schema as before (twice), ledger row gone, re-apply passes the check'
