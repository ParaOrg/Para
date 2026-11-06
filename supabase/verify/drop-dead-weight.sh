#!/usr/bin/env bash
# The drop_dead_weight migration on databases of its own. On the first: every earlier migration in
# ledger order with the paste files as live has them (the review flow through draft_published, the
# contributor flow through keep_uploads_on_user_delete), then the refusals: the apply stops, changing
# nothing, while gps_session has a row or a route has a short_name. Then
# apply/…_drop_dead_weight_apply.sql twice (the second run must stop and change nothing), and the
# check: its rolled-back behaviour part raises nothing and leaves nothing behind, and its read-only
# rows are all true. keep_uploads_on_user_delete's own check runs again over it. On the second: the
# apply refuses without keep_uploads_on_user_delete, changing nothing. On the third: apply, revert
# twice, and the schema equals one the migration never touched, line for line once sorted (the two
# columns come back at the end of route); re-apply passes the check.
#   PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/drop-dead-weight.sh
set -euo pipefail
cd "$(dirname "$0")"
export PSQL=${PSQL:?set PSQL to a psql command for a disposable server}
PG_DUMP=${PG_DUMP:-${PSQL/psql/pg_dump}}
NAME=20261105200000_drop_dead_weight
apply() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -q "$@" 2>&1 | { grep -v '^NOTICE\|^WARNING' || true; }; }
q() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -qAt "$@"; }
fresh() {
  $PSQL -d postgres -qc "set client_min_messages = warning" -c "drop database if exists $DB" -c "create database $DB"
  sed '/^create role/d;/^grant anon, authenticated/d' bootstrap.sql | apply
  for n in 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0012 0015 0013 0014 0016 0017 0021; do
    apply < ../migrations/${n}_*.sql
  done
  apply -o /dev/null < before-0018.sql
  for f in 0018 0022 20261018112757_reviewed_draft_approval 20261019125900_contributions \
    20261022090000_contribution_use 20261024090000_contributor_accounts 20261026090000_draft_update_own \
    20261031090000_account_stats 20261031100000_delete_my_account 20261031110000_contribution_fare \
    20261101090000_delete_account_keep_uploads 20261105090000_delete_account_refuse_uploads \
    20261105120000_review_rules 20261105130000_draft_update_makerless 20261105160000_draft_published; do
    apply < ../apply/${f}_apply.sql
  done
}
checked() {
  local file=$1 want=$2 out rows
  out=$($PSQL -d "$DB" -v ON_ERROR_STOP=1 -qAt -F ' | ' < ../apply/${file}_check.sql 2>&1) \
    || { echo "FAILED: ${file}_check.sql: $(echo "$out" | grep -E 'ERROR|FAILED' | head -3)"; exit 1; }
  rows=$(echo "$out" | grep -E '^[0-9]+ \| ')
  [ "$(echo "$rows" | wc -l)" = "$want" ] || { echo "FAILED: ${file}_check.sql gave $(echo "$rows" | wc -l) rows"; exit 1; }
  ! echo "$rows" | grep -v ' | t$' || { echo "FAILED: ${file}_check.sql"; exit 1; }
}
ledger() { q -c "select count(*) from supabase_migrations.schema_migrations where name = 'drop_dead_weight'"; }
# A schema dump, its lines sorted and their trailing commas dropped: column order does not count.
dump() { $PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' | sed 's/,$//' | sort; }

sed -n "/^-- >>> supabase\/migrations\/${NAME}.sql/,/^-- <<< /p" ../apply/${NAME}_apply.sql | sed '1d;$d' \
  | diff -q - ../migrations/${NAME}.sql >/dev/null \
  || { echo "FAILED: apply/${NAME}_apply.sql does not carry the migration unchanged"; exit 1; }

export DB=verify_drop_dead_weight
fresh
apply < ../apply/20261105180000_keep_uploads_on_user_delete_apply.sql
# Nothing is dropped while something is in it.
E=$(q -c "select id from auth.users limit 1")
q -c "insert into public.gps_session (owner_id) values ('$E')" >/dev/null
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'gps_session holds 1 rows. Nothing was changed' || { echo "FAILED: dropped a gps_session with a row: $out"; exit 1; }
q -c "delete from public.gps_session" -c "update public.route set short_name = 'x' where id = (select id from public.route limit 1)" >/dev/null
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'routes have a short_name or a fare_as_of. Nothing was changed' || { echo "FAILED: dropped a short_name in use: $out"; exit 1; }
q -c "update public.route set short_name = null" >/dev/null
[ "$(ledger)" = 0 ] && [ -n "$(q -c "select to_regclass('public.gps_session')")" ] \
  || { echo 'FAILED: a refused apply changed something'; exit 1; }
out=$(apply < ../apply/${NAME}_apply.sql || true)
[ -z "$out" ] || { echo "FAILED: applying: $out"; exit 1; }
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'already applied. Nothing was changed' || { echo "FAILED: a second apply did not stop: $out"; exit 1; }
[ "$(ledger)" = 1 ] || { echo "FAILED: $(ledger) ledger rows for drop_dead_weight"; exit 1; }
before=$(q -c "select (select count(*) from public.contribution) || '/' || (select count(*) from public.route) || '/' || (select count(*) from auth.users)")
checked $NAME 5
[ "$before" = "$(q -c "select (select count(*) from public.contribution) || '/' || (select count(*) from public.route) || '/' || (select count(*) from auth.users)")" ] \
  || { echo 'FAILED: the check left rows behind'; exit 1; }
checked 20261105180000_keep_uploads_on_user_delete 3
echo 'drop_dead_weight: refused while anything would be lost; applied (a second run stops whole), the check passed and left nothing behind; keep_uploads_on_user_delete still holds'

DB=verify_drop_dead_weight_order
fresh
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'keep_uploads_on_user_delete is not applied here. Nothing was changed' \
  || { echo "FAILED: the apply ran without keep_uploads_on_user_delete: $out"; exit 1; }
[ "$(ledger)" = 0 ] || { echo 'FAILED: the refused apply wrote the ledger row'; exit 1; }
echo 'drop_dead_weight: refused without keep_uploads_on_user_delete, nothing changed'

DB=verify_drop_dead_weight_revert
fresh
apply < ../apply/20261105180000_keep_uploads_on_user_delete_apply.sql
dump > /tmp/drop-dead-weight-before.sql
apply < ../apply/${NAME}_apply.sql
apply < ../apply/${NAME}_revert.sql
apply < ../apply/${NAME}_revert.sql
dump > /tmp/drop-dead-weight-after.sql
diff -q /tmp/drop-dead-weight-before.sql /tmp/drop-dead-weight-after.sql >/dev/null \
  || { echo 'FAILED: the schema after revert differs'; diff /tmp/drop-dead-weight-before.sql /tmp/drop-dead-weight-after.sql | head -20; exit 1; }
[ "$(ledger)" = 0 ] || { echo 'FAILED: revert left the ledger row'; exit 1; }
apply < ../apply/${NAME}_apply.sql
checked $NAME 5
echo 'drop_dead_weight revert: schema as before (twice, column order aside), ledger row gone, re-apply passes the check'
