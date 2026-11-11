#!/usr/bin/env bash
# The route_report migration on databases of its own. On the first: every earlier migration in
# ledger order with the review flow's paste files (through lock_map_tables), then
# apply/…_route_report_apply.sql twice (the second run must stop and change nothing), and the
# check: its rolled-back behaviour part raises nothing and leaves nothing behind, and its read-only
# rows are all true. On the second: the apply refuses without lock_map_tables, changing nothing. On
# the third: apply, revert twice, and the schema equals one the migration never touched, the role
# report_sender gone; re-apply passes the check. report_sender is a role of the whole server, so
# each database is dropped before the next one's revert.
#   PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/route-report.sh
set -euo pipefail
cd "$(dirname "$0")"
export PSQL=${PSQL:?set PSQL to a psql command for a disposable server}
PG_DUMP=${PG_DUMP:-${PSQL/psql/pg_dump}}
NAME=20261111100000_route_report
apply() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -q "$@" 2>&1 | { grep -v '^NOTICE\|^WARNING' || true; }; }
drop() { $PSQL -d postgres -qc "set client_min_messages = warning" -c "drop database if exists $1"; }
fresh() {
  drop "$DB"
  $PSQL -d postgres -qc "create database $DB"
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
checked() {
  local out rows
  out=$($PSQL -d "$DB" -v ON_ERROR_STOP=1 -qAt -F ' | ' < ../apply/${NAME}_check.sql 2>&1) \
    || { echo "FAILED: ${NAME}_check.sql: $(echo "$out" | grep -E 'ERROR|FAILED' | head -3)"; exit 1; }
  rows=$(echo "$out" | grep -E '^[0-9]+ \| ')
  [ "$(echo "$rows" | wc -l)" = 6 ] || { echo "FAILED: ${NAME}_check.sql gave $(echo "$rows" | wc -l) rows"; exit 1; }
  ! echo "$rows" | grep -v ' | t$' || { echo "FAILED: ${NAME}_check.sql"; exit 1; }
}
ledger() { $PSQL -d "$DB" -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = 'route_report'"; }
role() { $PSQL -d postgres -qAt -c "select count(*) from pg_roles where rolname = 'report_sender'"; }
counts() { $PSQL -d "$DB" -qAt -c "select (select count(*) from public.route_report) || '/' || (select count(*) from public.route) || '/' || (select count(*) from auth.users)"; }

sed -n "/^-- >>> supabase\/migrations\/${NAME}.sql/,/^-- <<< /p" ../apply/${NAME}_apply.sql | sed '1d;$d' \
  | diff -q - ../migrations/${NAME}.sql >/dev/null \
  || { echo "FAILED: apply/${NAME}_apply.sql does not carry the migration unchanged"; exit 1; }

export DB=verify_route_report
fresh
apply < ../apply/20261105190000_lock_map_tables_apply.sql
out=$(apply < ../apply/${NAME}_apply.sql || true)
[ -z "$out" ] || { echo "FAILED: applying: $out"; exit 1; }
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'already applied. Nothing was changed' || { echo "FAILED: a second apply did not stop: $out"; exit 1; }
[ "$(ledger)" = 1 ] || { echo "FAILED: $(ledger) ledger rows for route_report"; exit 1; }
before=$(counts)
checked
[ "$before" = "$(counts)" ] || { echo "FAILED: the check left rows behind ($before, then $(counts))"; exit 1; }
echo 'route_report: applied (a second run stops whole), the check passed and left nothing behind'
drop $DB

DB=verify_route_report_order
fresh
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'lock_map_tables is not applied here. Nothing was changed' \
  || { echo "FAILED: the apply ran without lock_map_tables: $out"; exit 1; }
[ "$(ledger)" = 0 ] || { echo 'FAILED: the refused apply wrote the ledger row'; exit 1; }
echo 'route_report: refused without lock_map_tables, nothing changed'
drop $DB

DB=verify_route_report_revert
fresh
apply < ../apply/20261105190000_lock_map_tables_apply.sql
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/route-report-before.sql
apply < ../apply/${NAME}_apply.sql
apply < ../apply/${NAME}_revert.sql
apply < ../apply/${NAME}_revert.sql
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/route-report-after.sql
diff -q /tmp/route-report-before.sql /tmp/route-report-after.sql >/dev/null \
  || { echo 'FAILED: the schema after revert differs'; diff /tmp/route-report-before.sql /tmp/route-report-after.sql | head -20; exit 1; }
[ "$(ledger)" = 0 ] || { echo 'FAILED: revert left the ledger row'; exit 1; }
[ "$(role)" = 0 ] || { echo 'FAILED: revert left the role report_sender'; exit 1; }
apply < ../apply/${NAME}_apply.sql
checked
echo 'route_report revert: schema as before (twice), ledger row and role gone, re-apply passes the check'
drop $DB
