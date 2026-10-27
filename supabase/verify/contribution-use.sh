#!/usr/bin/env bash
# The contribution_use migration on databases of its own. On the first: every
# earlier migration in ledger order, contributions through its paste file, then
# apply/…_contribution_use_apply.sql twice (the second run must stop and change
# nothing), the read-only check all true, and after-contribution-use.sql; the
# revert refuses over a stored use and over a blocked contributor. On the second:
# apply, revert twice, and the schema equals one the migration never touched;
# re-apply passes the check.
#   PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/contribution-use.sh
set -euo pipefail
cd "$(dirname "$0")"
export PSQL=${PSQL:?set PSQL to a psql command for a disposable server}
PG_DUMP=${PG_DUMP:-${PSQL/psql/pg_dump}}
NAME=20261022090000_contribution_use
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
}
checked() {
  local bad
  bad=$($PSQL -d "$DB" -qAt -F ' | ' < ../apply/${NAME}_check.sql | grep -v ' | t$' || true)
  [ -z "$bad" ] || { echo "FAILED: ${NAME}_check.sql: $bad"; exit 1; }
}

sed -n "/^-- >>> supabase\/migrations\/${NAME}.sql/,/^-- <<< /p" ../apply/${NAME}_apply.sql | sed '1d;$d' \
  | diff -q - ../migrations/${NAME}.sql >/dev/null \
  || { echo "FAILED: apply/${NAME}_apply.sql does not carry the migration unchanged"; exit 1; }

export DB=verify_contribution_use
fresh
out=$(apply < ../apply/${NAME}_apply.sql || true)
[ -z "$out" ] || { echo "FAILED: applying: $out"; exit 1; }
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'already applied. Nothing was changed' || { echo "FAILED: a second apply did not stop: $out"; exit 1; }
rows=$($PSQL -d $DB -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = 'contribution_use'")
[ "$rows" = 1 ] || { echo "FAILED: $rows ledger rows for contribution_use"; exit 1; }
checked
out=$(apply -o /dev/null < after-contribution-use.sql || true)
[ -z "$out" ] || { echo "$out"; exit 1; }
echo 'contribution_use: applied (a second run stops whole), check all true, after-contribution-use.sql passed'

# The revert refuses over a stored use, and over a blocked contributor.
$PSQL -d $DB -qc "insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000f1') on conflict do nothing" \
  -c "insert into public.contributor (id) values ('00000000-0000-0000-0000-0000000000f1')" \
  -c "update public.contributor set blocked_at = now()"
out=$(apply < ../apply/${NAME}_revert.sql || true)
echo "$out" | grep -q 'a contributor is blocked' || { echo "FAILED: revert ran over a blocked contributor: $out"; exit 1; }
$PSQL -d $DB -qc "update public.contributor set blocked_at = null" \
  -c "insert into public.contribution (id, format_version, rules_version, consent_version, started_at, ended_at, sent_at, distance_m, moving_s, standing_s, lost_s, point_count, events, gaps) values ('11111111-0000-0000-0000-0000000000f1', 1, 1, 1, now() - interval '1 hour', now(), now(), 0, 0, 0, 0, 0, '[]', '[]')" \
  -c "insert into public.contribution_use (contribution_id, kind, subject_id) values ('11111111-0000-0000-0000-0000000000f1', 'direction', gen_random_uuid())"
out=$(apply < ../apply/${NAME}_revert.sql || true)
echo "$out" | grep -q 'links are stored' || { echo "FAILED: revert ran over stored uses: $out"; exit 1; }
checked

DB=verify_contribution_use_revert
fresh
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/contribution-use-before.sql
apply < ../apply/${NAME}_apply.sql
apply < ../apply/${NAME}_revert.sql
apply < ../apply/${NAME}_revert.sql
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/contribution-use-after.sql
diff -q /tmp/contribution-use-before.sql /tmp/contribution-use-after.sql >/dev/null \
  || { echo 'FAILED: the schema after revert differs'; diff /tmp/contribution-use-before.sql /tmp/contribution-use-after.sql | head; exit 1; }
[ "$($PSQL -d $DB -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = 'contribution_use'")" = 0 ] \
  || { echo 'FAILED: revert left the ledger row'; exit 1; }
apply < ../apply/${NAME}_apply.sql
checked
echo 'contribution_use revert: refused over a stored use and a blocked phone; schema as before (twice), ledger row gone, re-apply passes the check'
