#!/usr/bin/env bash
# The longer_contributions migration on databases of its own. On the first, every earlier
# migration runs in ledger order with the contributor migrations through their paste files, then
# apply/…_longer_contributions_apply.sql runs twice (the second run must stop and change nothing),
# then the check. Its rolled-back behaviour part raises nothing and leaves nothing behind, and its
# read-only rows are all true. On the second, a revert is refused while a ride is longer than 6
# hours, then runs twice once that ride is gone, and the schema equals one the migration never
# touched. Re-applying then passes the check.
#   PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/longer-contributions.sh
set -euo pipefail
cd "$(dirname "$0")"
export PSQL=${PSQL:?set PSQL to a psql command for a disposable server}
PG_DUMP=${PG_DUMP:-${PSQL/psql/pg_dump}}
NAME=20261115150000_longer_contributions
apply() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -q "$@" 2>&1 | { grep -v '^NOTICE\|^WARNING' || true; }; }
fresh() {
  $PSQL -d postgres -qc "set client_min_messages = warning" -c "drop database if exists $DB" -c "create database $DB"
  sed '/^create role/d;/^grant anon, authenticated/d' bootstrap.sql | apply
  for n in 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0012 0015 0013 0014 0016 0017 0021 0018 0022; do
    apply < ../migrations/${n}_*.sql
  done
  apply < ../migrations/20261018112757_reviewed_draft_approval.sql
  apply -o /dev/null < before-0018.sql
  for f in 20261019125900_contributions 20261022090000_contribution_use 20261024090000_contributor_accounts \
    20261031090000_account_stats 20261031100000_delete_my_account 20261031110000_contribution_fare; do
    apply < ../apply/${f}_apply.sql
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
ledger() { $PSQL -d "$DB" -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = 'longer_contributions'"; }
rides() { $PSQL -d "$DB" -qAt -c "select count(*) from public.contribution"; }
long_ride() {
  $PSQL -d "$DB" -v ON_ERROR_STOP=1 -q -o /dev/null <<'SQL'
insert into auth.users (id, is_anonymous) values ('7e7e7e84-0000-0000-0000-0000000000a1', false);
insert into public.contributor (id) values ('7e7e7e84-0000-0000-0000-0000000000a1');
select set_config('request.jwt.claim.sub', '7e7e7e84-0000-0000-0000-0000000000a1', false);
insert into public.contribution (id, contributor_id, format_version, rules_version, consent_version,
  started_at, ended_at, sent_at, distance_m, moving_s, standing_s, lost_s, point_count, events, gaps,
  start_name, end_name, description)
values ('7e7e7e84-0000-0000-0000-0000000000c1', '7e7e7e84-0000-0000-0000-0000000000a1', 2, 3, 1,
  now() - interval '2 days', now() - interval '2 days' + interval '9 hours', now(),
  100, 60, 10, 0, 0, '[]', '[]', 'UP Diliman', 'Guadalupe', '');
SQL
}

sed -n "/^-- >>> supabase\/migrations\/${NAME}.sql/,/^-- <<< /p" ../apply/${NAME}_apply.sql | sed '1d;$d' \
  | diff -q - ../migrations/${NAME}.sql >/dev/null \
  || { echo "FAILED: apply/${NAME}_apply.sql does not carry the migration unchanged"; exit 1; }

export DB=verify_longer_contributions
fresh
before=$(rides)
out=$(apply < ../apply/${NAME}_apply.sql || true)
[ -z "$out" ] || { echo "FAILED: applying: $out"; exit 1; }
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'already applied. Nothing was changed' || { echo "FAILED: a second apply did not stop: $out"; exit 1; }
[ "$(ledger)" = 1 ] || { echo "FAILED: $(ledger) ledger rows for longer_contributions"; exit 1; }
checked
[ "$(rides)" = "$before" ] || { echo 'FAILED: the check left rides behind'; exit 1; }
echo 'longer_contributions: applied (a second run stops whole), the check passed and left nothing behind'

DB=verify_longer_contributions_revert
fresh
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/longer-contributions-before.sql
apply < ../apply/${NAME}_apply.sql
long_ride
out=$(apply < ../apply/${NAME}_revert.sql || true)
echo "$out" | grep -q 'a kept ride is longer than 6 hours. Nothing was changed' \
  || { echo "FAILED: revert ran over a long ride: $out"; exit 1; }
[ "$(ledger)" = 1 ] || { echo 'FAILED: the refused revert changed the ledger'; exit 1; }
$PSQL -d "$DB" -qc "delete from public.contribution where id = '7e7e7e84-0000-0000-0000-0000000000c1'"
apply < ../apply/${NAME}_revert.sql
apply < ../apply/${NAME}_revert.sql
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/longer-contributions-after.sql
diff -q /tmp/longer-contributions-before.sql /tmp/longer-contributions-after.sql >/dev/null \
  || { echo 'FAILED: the schema after revert differs'; diff /tmp/longer-contributions-before.sql /tmp/longer-contributions-after.sql | head -20; exit 1; }
[ "$(ledger)" = 0 ] || { echo 'FAILED: revert left the ledger row'; exit 1; }
apply < ../apply/${NAME}_apply.sql
checked
echo 'longer_contributions revert: refused over a long ride, then schema as before (twice), ledger row gone, re-apply passes the check'
