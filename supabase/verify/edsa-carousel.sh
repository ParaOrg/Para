#!/usr/bin/env bash
# The edsa_carousel migration on databases of its own. On the first: every earlier migration in
# ledger order with the review flow's paste files, as live has them. Before it, a route of mode
# busway and an EDSA-C station are refused; apply/…_edsa_carousel_apply.sql runs twice (the second
# must stop and change nothing), then both are let in, a station of no line still is not, and the
# check's rolled-back part raises nothing and its read-only rows are all true. On the second:
# apply, then revert refuses while an EDSA-C station or a busway route stands, changing nothing;
# with them gone it runs twice, and the schema equals one the migration never touched, but for the
# enum value Postgres cannot drop; re-apply passes the check.
#   PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/edsa-carousel.sh
set -euo pipefail
cd "$(dirname "$0")"
export PSQL=${PSQL:?set PSQL to a psql command for a disposable server}
PG_DUMP=${PG_DUMP:-${PSQL/psql/pg_dump}}
NAME=20261125090000_edsa_carousel
apply() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -q "$@" 2>&1 | { grep -v '^NOTICE\|^WARNING' || true; }; }
fresh() {
  $PSQL -d postgres -qc "set client_min_messages = warning" -c "drop database if exists $DB" -c "create database $DB"
  sed '/^create role/d;/^grant anon, authenticated/d' bootstrap.sql | apply
  for n in 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0012 0015 0013 0014 0016 0017 0021; do
    apply < ../migrations/${n}_*.sql
  done
  apply -o /dev/null < before-0018.sql
  for f in 0018 0022 20261018112757_reviewed_draft_approval 20261026090000_draft_update_own \
    20261105120000_review_rules 20261105130000_draft_update_makerless 20261105160000_draft_published \
    20261105190000_lock_map_tables 20261110190000_retire_review_steps \
    20261112100000_drop_inert_write_policies; do
    apply < ../apply/${f}_apply.sql
  done
}
# The check: part one rolled back with no error, part two 4 rows, every one t.
checked() {
  local out rows
  out=$($PSQL -d "$DB" -v ON_ERROR_STOP=1 -qAt -F ' | ' < ../apply/${NAME}_check.sql 2>&1) \
    || { echo "FAILED: the check: $(echo "$out" | grep -E 'ERROR' | head -3)"; exit 1; }
  rows=$(echo "$out" | grep -E '^[0-9]+ \| ')
  [ "$(echo "$rows" | wc -l)" = 4 ] || { echo "FAILED: the check gave $(echo "$rows" | wc -l) rows"; exit 1; }
  ! echo "$rows" | grep -v ' | t$' || { echo 'FAILED: the check'; exit 1; }
}
ledger() { $PSQL -d "$DB" -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = 'edsa_carousel'"; }
# One statement in its own transaction, as postgres: prints ok, or the error's first line.
try() { $PSQL -d "$DB" -qAt -c "$1" >/dev/null 2>/tmp/edsa-carousel-err && echo ok || head -1 /tmp/edsa-carousel-err; }
STATION="update public.stop set line = 'EDSA-C' where id = (select id from public.stop where kind = 'hintuan' and line is null order by id limit 1)"
ROUTE="update public.route set mode = 'busway' where id = (select id from public.route where mode::text <> 'busway' order by id limit 1)"
schema() { $PG_DUMP -d "$DB" --schema-only | grep -Ev '^.(un)?restrict ' | grep -v "'busway'" | sed 's/,$//'; }

sed -n "/^-- >>> supabase\/migrations\/${NAME}.sql/,/^-- <<< /p" ../apply/${NAME}_apply.sql | sed '1d;$d' \
  | diff -q - ../migrations/${NAME}.sql >/dev/null \
  || { echo "FAILED: apply/${NAME}_apply.sql does not carry the migration unchanged"; exit 1; }

export DB=verify_edsa_carousel
fresh
[ "$($PSQL -d "$DB" -qAt -c "select count(*) from public.stop where kind = 'hintuan' and line is null")" -gt 0 ] \
  || { echo 'FAILED: no plain hintuan to make a station of'; exit 1; }
try "$STATION" | grep -q 'stop_line_named' || { echo 'FAILED: an EDSA-C station was let in before the migration'; exit 1; }
try "$ROUTE" | grep -q 'invalid input value for enum' || { echo 'FAILED: a busway route was let in before the migration'; exit 1; }
out=$(apply < ../apply/${NAME}_apply.sql || true)
[ -z "$out" ] || { echo "FAILED: applying: $out"; exit 1; }
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'already applied. Nothing was changed' || { echo "FAILED: a second apply did not stop: $out"; exit 1; }
[ "$(ledger)" = 1 ] || { echo "FAILED: $(ledger) ledger rows for edsa_carousel"; exit 1; }
checked
[ "$(try "$STATION")" = ok ] || { echo 'FAILED: an EDSA-C station was refused after the migration'; exit 1; }
[ "$(try "$ROUTE")" = ok ] || { echo 'FAILED: a busway route was refused after the migration'; exit 1; }
try "update public.stop set line = 'EDSA-X' where line = 'EDSA-C'" | grep -q 'stop_line_named' \
  || { echo 'FAILED: a station of no line was let in'; exit 1; }
checked
echo 'edsa_carousel: refused before, applied (a second run stops whole), a busway route and an EDSA-C station let in and EDSA-X not, the check passed'

DB=verify_edsa_carousel_revert
fresh
schema > /tmp/edsa-carousel-before.sql
apply < ../apply/${NAME}_apply.sql
[ "$(try "$STATION")" = ok ] && [ "$(try "$ROUTE")" = ok ] || { echo 'FAILED: the revert setup'; exit 1; }
out=$(apply < ../apply/${NAME}_revert.sql || true)
echo "$out" | grep -q 'still an EDSA-C station. Nothing was changed' || { echo "FAILED: revert ran over a station: $out"; exit 1; }
apply -c "update public.stop set line = null where line = 'EDSA-C'"
out=$(apply < ../apply/${NAME}_revert.sql || true)
echo "$out" | grep -q 'still an EDSA Carousel (busway). Nothing was changed' || { echo "FAILED: revert ran over a route: $out"; exit 1; }
[ "$(ledger)" = 1 ] || { echo 'FAILED: a refused revert removed the ledger row'; exit 1; }
apply -c "update public.route set mode = 'jeepney' where mode::text = 'busway'"
apply < ../apply/${NAME}_revert.sql
apply < ../apply/${NAME}_revert.sql
schema > /tmp/edsa-carousel-after.sql
diff -q /tmp/edsa-carousel-before.sql /tmp/edsa-carousel-after.sql >/dev/null \
  || { echo 'FAILED: the schema after revert differs'; diff /tmp/edsa-carousel-before.sql /tmp/edsa-carousel-after.sql | head -20; exit 1; }
[ "$(ledger)" = 0 ] || { echo 'FAILED: revert left the ledger row'; exit 1; }
try "$STATION" | grep -q 'stop_line_named' || { echo 'FAILED: an EDSA-C station was let in after revert'; exit 1; }
apply < ../apply/${NAME}_apply.sql
checked
echo 'edsa_carousel revert: refused over a station and a route, then schema as before but the enum value (twice), ledger row gone, re-apply passes the check'
