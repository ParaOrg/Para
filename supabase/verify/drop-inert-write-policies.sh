#!/usr/bin/env bash
# The drop_inert_write_policies migration on databases of its own. On the first: every earlier
# migration in ledger order with the review flow's paste files, through draft_published,
# lock_map_tables and retire_review_steps as live has them. The publish's reads (publish-reads.sql,
# as anon) are taken, then apply/…_drop_inert_write_policies_apply.sql runs twice (the second run
# must stop and change nothing), and the same reads must give the same rows. The schema differs by
# the twelve policies alone. The check's rolled-back behaviour part raises nothing and leaves
# nothing behind, its read-only rows are all true, and draft-published-race.sh runs again over it.
# On the second: the apply refuses without lock_map_tables, and refuses again while an app role
# holds a write grant, changing nothing either time. On the third: apply, revert twice, and the
# schema equals one the migration never touched; re-apply passes the check.
#   PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/drop-inert-write-policies.sh
set -euo pipefail
cd "$(dirname "$0")"
export PSQL=${PSQL:?set PSQL to a psql command for a disposable server}
PG_DUMP=${PG_DUMP:-${PSQL/psql/pg_dump}}
NAME=20261112100000_drop_inert_write_policies
apply() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -q "$@" 2>&1 | { grep -v '^NOTICE\|^WARNING' || true; }; }
fresh() {
  $PSQL -d postgres -qc "set client_min_messages = warning" -c "drop database if exists $DB" -c "create database $DB"
  sed '/^create role/d;/^grant anon, authenticated/d' bootstrap.sql | apply
  for n in 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0012 0015 0013 0014 0016 0017 0021; do
    apply < ../migrations/${n}_*.sql
  done
  apply -o /dev/null < before-0018.sql
  for f in 0018 0022 20261018112757_reviewed_draft_approval 20261026090000_draft_update_own \
    20261105120000_review_rules 20261105130000_draft_update_makerless 20261105160000_draft_published; do
    apply < ../apply/${f}_apply.sql
  done
}
locked() {
  apply < ../apply/20261105190000_lock_map_tables_apply.sql
  apply < ../apply/20261110190000_retire_review_steps_apply.sql
}
checked() {
  local out rows
  out=$($PSQL -d "$DB" -v ON_ERROR_STOP=1 -qAt -F ' | ' < ../apply/${NAME}_check.sql 2>&1) \
    || { echo "FAILED: ${NAME}_check.sql: $(echo "$out" | grep -E 'ERROR|FAILED' | head -3)"; exit 1; }
  rows=$(echo "$out" | grep -E '^[0-9]+ \| ')
  [ "$(echo "$rows" | wc -l)" = 5 ] || { echo "FAILED: ${NAME}_check.sql gave $(echo "$rows" | wc -l) rows"; exit 1; }
  ! echo "$rows" | grep -v ' | t$' || { echo "FAILED: ${NAME}_check.sql"; exit 1; }
}
ledger() { $PSQL -d "$DB" -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = 'drop_inert_write_policies'"; }
counts() { $PSQL -d "$DB" -qAt -c "select (select count(*) from public.draft) || '/' || (select count(*) from public.stop) || '/' || (select count(*) from public.route) || '/' || (select count(*) from auth.users)"; }
reads() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -qAt < publish-reads.sql; }
schema() { $PG_DUMP -d "$DB" --schema-only | grep -Ev '^.(un)?restrict '; }
WRITE_POLICY='CREATE POLICY (route|route_variant|stop|route_stop)_(insert|update|delete) ON public\.'

sed -n "/^-- >>> supabase\/migrations\/${NAME}.sql/,/^-- <<< /p" ../apply/${NAME}_apply.sql | sed '1d;$d' \
  | diff -q - ../migrations/${NAME}.sql >/dev/null \
  || { echo "FAILED: apply/${NAME}_apply.sql does not carry the migration unchanged"; exit 1; }

export DB=verify_drop_inert_write_policies
fresh
locked
reads > /tmp/drop-inert-reads-before.txt
[ "$(grep -c . /tmp/drop-inert-reads-before.txt)" -ge 4 ] \
  || { echo 'FAILED: the publish reads gave too few rows to compare'; exit 1; }
schema > /tmp/drop-inert-before.sql
out=$(apply < ../apply/${NAME}_apply.sql || true)
[ -z "$out" ] || { echo "FAILED: applying: $out"; exit 1; }
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'already applied. Nothing was changed' || { echo "FAILED: a second apply did not stop: $out"; exit 1; }
[ "$(ledger)" = 1 ] || { echo "FAILED: $(ledger) ledger rows for drop_inert_write_policies"; exit 1; }
reads > /tmp/drop-inert-reads-after.txt
diff -q /tmp/drop-inert-reads-before.txt /tmp/drop-inert-reads-after.txt >/dev/null \
  || { echo 'FAILED: the publish reads differ after the migration'; diff /tmp/drop-inert-reads-before.txt /tmp/drop-inert-reads-after.txt | head -10; exit 1; }
schema > /tmp/drop-inert-applied.sql
changed=$(diff /tmp/drop-inert-before.sql /tmp/drop-inert-applied.sql | grep '^[<>]' || true)
[ "$(echo "$changed" | grep -c '^>' || true)" = 0 ] || { echo "FAILED: the migration added to the schema: $(echo "$changed" | grep '^>' | head -3)"; exit 1; }
[ "$(echo "$changed" | grep -Ec "^< $WRITE_POLICY" || true)" = 12 ] || { echo 'FAILED: the schema did not lose exactly the twelve write policies'; exit 1; }
other=$(echo "$changed" | grep '^<' | grep -Ev "^< $WRITE_POLICY|^< --|^< *$" || true)
[ -z "$other" ] || { echo "FAILED: the schema lost more than the twelve policies: $(echo "$other" | head -3)"; exit 1; }
before=$(counts)
checked
[ "$before" = "$(counts)" ] || { echo "FAILED: the check left rows behind ($before, then $(counts))"; exit 1; }
PSQL="$PSQL" DB=$DB bash draft-published-race.sh
echo "drop_inert_write_policies: applied (a second run stops whole), the publish reads the same $(grep -c . /tmp/drop-inert-reads-after.txt) rows, the schema lost the twelve policies alone, the check passed and left nothing behind"

DB=verify_drop_inert_write_policies_order
fresh
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'lock_map_tables is not applied here. Nothing was changed' \
  || { echo "FAILED: the apply ran without lock_map_tables: $out"; exit 1; }
locked
apply -c 'grant update on public.stop to authenticated'
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'so its write policies are in use. Nothing was changed' \
  || { echo "FAILED: the apply ran while an app role could write: $out"; exit 1; }
[ "$(ledger)" = 0 ] || { echo 'FAILED: a refused apply wrote the ledger row'; exit 1; }
[ "$($PSQL -d "$DB" -qAt -c "select count(*) from pg_policies where schemaname = 'public' and policyname = 'stop_update'")" = 1 ] \
  || { echo 'FAILED: a refused apply dropped a policy'; exit 1; }
echo 'drop_inert_write_policies: refused without lock_map_tables, and while a write grant stands; nothing changed'

DB=verify_drop_inert_write_policies_revert
fresh
locked
schema > /tmp/drop-inert-revert-before.sql
apply < ../apply/${NAME}_apply.sql
apply < ../apply/${NAME}_revert.sql
apply < ../apply/${NAME}_revert.sql
schema > /tmp/drop-inert-revert-after.sql
diff -q /tmp/drop-inert-revert-before.sql /tmp/drop-inert-revert-after.sql >/dev/null \
  || { echo 'FAILED: the schema after revert differs'; diff /tmp/drop-inert-revert-before.sql /tmp/drop-inert-revert-after.sql | head -20; exit 1; }
[ "$(ledger)" = 0 ] || { echo 'FAILED: revert left the ledger row'; exit 1; }
apply < ../apply/${NAME}_apply.sql
checked
echo 'drop_inert_write_policies revert: schema as before (twice), ledger row gone, re-apply passes the check'
