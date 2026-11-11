#!/usr/bin/env bash
# The route_end_indexes migration on databases of its own. On the first: every numbered migration
# in ledger order, then apply/…_route_end_indexes_apply.sql twice (the second run must stop and
# change nothing), and the read-only check, every row true. The planner then finds a stop's routes
# through the new indexes. On the second: apply, revert twice, and the schema equals one the
# migration never touched; re-apply passes the check.
#   PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/route-end-indexes.sh
set -euo pipefail
cd "$(dirname "$0")"
export PSQL=${PSQL:?set PSQL to a psql command for a disposable server}
PG_DUMP=${PG_DUMP:-${PSQL/psql/pg_dump}}
NAME=20261112090000_route_end_indexes
apply() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -q "$@" 2>&1 | { grep -v '^NOTICE\|^WARNING' || true; }; }
fresh() {
  $PSQL -d postgres -qc "set client_min_messages = warning" -c "drop database if exists $DB" -c "create database $DB"
  sed '/^create role/d;/^grant anon, authenticated/d' bootstrap.sql | apply
  for n in 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0012 0015 0013 0014 0016 0017 0021; do
    apply < ../migrations/${n}_*.sql
  done
}
checked() {
  local out rows
  out=$($PSQL -d "$DB" -v ON_ERROR_STOP=1 -qAt -F ' | ' < ../apply/${NAME}_check.sql 2>&1) \
    || { echo "FAILED: ${NAME}_check.sql: $(echo "$out" | grep -E 'ERROR|FAILED' | head -3)"; exit 1; }
  rows=$(echo "$out" | grep -E '^[0-9]+ \| ')
  [ "$(echo "$rows" | wc -l)" = 3 ] || { echo "FAILED: ${NAME}_check.sql gave $(echo "$rows" | wc -l) rows"; exit 1; }
  ! echo "$rows" | grep -v ' | t$' || { echo "FAILED: ${NAME}_check.sql"; exit 1; }
}
ledger() { $PSQL -d "$DB" -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = 'route_end_indexes'"; }

sed -n "/^-- >>> supabase\/migrations\/${NAME}.sql/,/^-- <<< /p" ../apply/${NAME}_apply.sql | sed '1d;$d' \
  | diff -q - ../migrations/${NAME}.sql >/dev/null \
  || { echo "FAILED: apply/${NAME}_apply.sql does not carry the migration unchanged"; exit 1; }

export DB=verify_route_end_indexes
fresh
out=$(apply < ../apply/${NAME}_apply.sql || true)
[ -z "$out" ] || { echo "FAILED: applying: $out"; exit 1; }
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'already applied. Nothing was changed' || { echo "FAILED: a second apply did not stop: $out"; exit 1; }
[ "$(ledger)" = 1 ] || { echo "FAILED: $(ledger) ledger rows for route_end_indexes"; exit 1; }
checked
# With table scans off, a lookup by either end is planned through its index: each is usable.
for end in head tail; do
  plan=$($PSQL -d "$DB" -qAt -c "set enable_seqscan = off" \
    -c "explain select 1 from public.route where ${end}_stop_id = '00000000-0000-4000-8000-000000000000'")
  echo "$plan" | grep -q "route_${end}_stop_id_idx" \
    || { echo "FAILED: a lookup by ${end}_stop_id does not use route_${end}_stop_id_idx: $plan"; exit 1; }
done
echo 'route_end_indexes: applied (a second run stops whole), the check passed, a lookup by either end uses its index'

DB=verify_route_end_indexes_revert
fresh
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/route-end-indexes-before.sql
apply < ../apply/${NAME}_apply.sql
apply < ../apply/${NAME}_revert.sql
apply < ../apply/${NAME}_revert.sql
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/route-end-indexes-after.sql
diff -q /tmp/route-end-indexes-before.sql /tmp/route-end-indexes-after.sql >/dev/null \
  || { echo 'FAILED: the schema after revert differs'; diff /tmp/route-end-indexes-before.sql /tmp/route-end-indexes-after.sql | head -20; exit 1; }
[ "$(ledger)" = 0 ] || { echo 'FAILED: revert left the ledger row'; exit 1; }
apply < ../apply/${NAME}_apply.sql
checked
echo 'route_end_indexes revert: schema as before (twice), ledger row gone, re-apply passes the check'
