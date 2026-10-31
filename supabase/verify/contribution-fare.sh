#!/usr/bin/env bash
# The contribution_fare migration on databases of its own. On the first: every
# earlier migration in ledger order, the contributions, contribution_use,
# contributor_accounts and account_stats migrations through their paste files,
# then apply/…_contribution_fare_apply.sql twice (the second run must stop and
# change nothing), and the check: its rolled-back behaviour part raises nothing
# and leaves nothing behind, and its read-only rows are all true. The revert
# refuses over a stored fare, over retired totals counting one and over an
# e_jeep ride. On the
# second: apply, revert twice, and the schema equals one the migration never
# touched; re-apply passes the check.
#   PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/contribution-fare.sh
set -euo pipefail
cd "$(dirname "$0")"
export PSQL=${PSQL:?set PSQL to a psql command for a disposable server}
PG_DUMP=${PG_DUMP:-${PSQL/psql/pg_dump}}
NAME=20261031110000_contribution_fare
apply() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -q "$@" 2>&1 | { grep -v '^NOTICE\|^WARNING' || true; }; }
fresh() {
  $PSQL -d postgres -qc "set client_min_messages = warning" -c "drop database if exists $DB" -c "create database $DB"
  sed '/^create role/d;/^grant anon, authenticated/d' bootstrap.sql | apply
  for n in 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0012 0015 0013 0014 0016 0017 0021 0018 0022; do
    apply < ../migrations/${n}_*.sql
  done
  apply < ../migrations/20261018112757_reviewed_draft_approval.sql
  apply -o /dev/null < before-0018.sql
  apply < ../apply/20261019125900_contributions_apply.sql
  apply < ../apply/20261022090000_contribution_use_apply.sql
  apply < ../apply/20261024090000_contributor_accounts_apply.sql
  apply < ../apply/20261031090000_account_stats_apply.sql
}
# The behaviour part prints its own rows (saves, set_config); the check rows are "n | what | ok".
checked() {
  local out rows
  out=$($PSQL -d "$DB" -v ON_ERROR_STOP=1 -qAt -F ' | ' < ../apply/${NAME}_check.sql 2>&1) \
    || { echo "FAILED: ${NAME}_check.sql: $(echo "$out" | grep -E 'ERROR|FAILED' | head -3)"; exit 1; }
  rows=$(echo "$out" | grep -E '^[0-9]+ \| ')
  [ "$(echo "$rows" | wc -l)" = 7 ] || { echo "FAILED: ${NAME}_check.sql gave $(echo "$rows" | wc -l) rows"; exit 1; }
  ! echo "$rows" | grep -v ' | t$' || { echo "FAILED: ${NAME}_check.sql"; exit 1; }
}

sed -n "/^-- >>> supabase\/migrations\/${NAME}.sql/,/^-- <<< /p" ../apply/${NAME}_apply.sql | sed '1d;$d' \
  | diff -q - ../migrations/${NAME}.sql >/dev/null \
  || { echo "FAILED: apply/${NAME}_apply.sql does not carry the migration unchanged"; exit 1; }

export DB=verify_contribution_fare
fresh
out=$(apply < ../apply/${NAME}_apply.sql || true)
[ -z "$out" ] || { echo "FAILED: applying: $out"; exit 1; }
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'already applied. Nothing was changed' || { echo "FAILED: a second apply did not stop: $out"; exit 1; }
rows=$($PSQL -d $DB -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = 'contribution_fare'")
[ "$rows" = 1 ] || { echo "FAILED: $rows ledger rows for contribution_fare"; exit 1; }
checked
[ "$($PSQL -d $DB -qAt -c "select count(*) from public.contribution")" = 0 ] \
  || { echo 'FAILED: the check left rows behind'; exit 1; }
echo 'contribution_fare: applied (a second run stops whole), the check passed and left nothing behind'

# The revert refuses over a stored fare, and over retired totals counting one.
$PSQL -d $DB -qc "insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000f1') on conflict do nothing" \
  -c "insert into public.contributor (id) values ('00000000-0000-0000-0000-0000000000f1')" \
  -c "select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', false)" \
  -c "insert into public.contribution (id, format_version, rules_version, consent_version, started_at, ended_at, sent_at, distance_m, moving_s, standing_s, lost_s, point_count, events, gaps, fare_php) values ('11111111-0000-0000-0000-0000000000f1', 1, 1, 1, now() - interval '1 hour', now(), now(), 10, 10, 0, 0, 0, '[]', '[]', 13)" >/dev/null
out=$(apply < ../apply/${NAME}_revert.sql || true)
echo "$out" | grep -q 'holds a fare' || { echo "FAILED: revert ran over a stored fare: $out"; exit 1; }
$PSQL -d $DB -qc "update public.contribution set fare_php = null" \
  -c "insert into private.contributor_retired_totals (contributor_id, rides, fare_php_total, fare_recordings) values ('00000000-0000-0000-0000-0000000000f1', 1, 13, 1)"
out=$(apply < ../apply/${NAME}_revert.sql || true)
echo "$out" | grep -q 'retired totals count a fare' || { echo "FAILED: revert ran over a retired fare: $out"; exit 1; }
$PSQL -d $DB -qc "delete from private.contributor_retired_totals" \
  -c "update public.contribution set vehicle = 'e_jeep'"
out=$(apply < ../apply/${NAME}_revert.sql || true)
echo "$out" | grep -q 'e_jeep or uv_express ride, so' || { echo "FAILED: revert ran over an e_jeep ride: $out"; exit 1; }
$PSQL -d $DB -qc "delete from public.contributor where id = '00000000-0000-0000-0000-0000000000f1'"
checked
echo 'contribution_fare revert: refuses over a stored fare, a retired one and an e_jeep ride'

DB=verify_contribution_fare_revert
fresh
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/contribution-fare-before.sql
apply < ../apply/${NAME}_apply.sql
apply < ../apply/${NAME}_revert.sql
apply < ../apply/${NAME}_revert.sql
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/contribution-fare-after.sql
diff -q /tmp/contribution-fare-before.sql /tmp/contribution-fare-after.sql >/dev/null \
  || { echo 'FAILED: the schema after revert differs'; diff /tmp/contribution-fare-before.sql /tmp/contribution-fare-after.sql | head; exit 1; }
[ "$($PSQL -d $DB -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = 'contribution_fare'")" = 0 ] \
  || { echo 'FAILED: revert left the ledger row'; exit 1; }
apply < ../apply/${NAME}_apply.sql
checked
echo 'contribution_fare revert: schema as before (twice), ledger row gone, re-apply passes the check'
