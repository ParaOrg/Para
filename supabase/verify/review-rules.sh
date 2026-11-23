#!/usr/bin/env bash
# The review_rules migration on databases of its own. On the first: every earlier migration in
# ledger order with the review flow's paste files (0018, 0022, reviewed_draft_approval,
# draft_update_own), then apply/…_review_rules_apply.sql twice (the second run must stop and
# change nothing), and the check: its rolled-back behaviour part raises nothing and leaves nothing
# behind, and its read-only rows are all true. Then every earlier review check runs again over
# it: after-0022.sql, the two race scripts, the studio's draft saves and reviewed-draft.sql. On
# the second: the apply refuses without draft_update_own, changing nothing. On the third: apply,
# revert twice, and the schema equals one the migration never touched; re-apply passes the check.
#   PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/review-rules.sh
set -euo pipefail
cd "$(dirname "$0")"
export PSQL=${PSQL:?set PSQL to a psql command for a disposable server}
PG_DUMP=${PG_DUMP:-${PSQL/psql/pg_dump}}
NAME=20261105120000_review_rules
apply() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -q "$@" 2>&1 | { grep -v '^NOTICE\|^WARNING' || true; }; }
fresh() {
  $PSQL -d postgres -qc "set client_min_messages = warning" -c "drop database if exists $DB" -c "create database $DB"
  sed '/^create role/d;/^grant anon, authenticated/d' bootstrap.sql | apply
  for n in 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0012 0015 0013 0014 0016 0017 0021; do
    apply < ../migrations/${n}_*.sql
  done
  apply -o /dev/null < before-0018.sql
  apply < ../apply/0018_apply.sql
  apply < ../apply/0022_apply.sql
  apply < ../apply/20261018112757_reviewed_draft_approval_apply.sql
}
# The behaviour part prints its own rows (set_config, claims); the check rows are "n | what | ok".
checked() {
  local out rows
  out=$($PSQL -d "$DB" -v ON_ERROR_STOP=1 -qAt -F ' | ' < ../apply/${NAME}_check.sql 2>&1) \
    || { echo "FAILED: ${NAME}_check.sql: $(echo "$out" | grep -E 'ERROR|FAILED' | head -3)"; exit 1; }
  rows=$(echo "$out" | grep -E '^[0-9]+ \| ')
  [ "$(echo "$rows" | wc -l)" = 9 ] || { echo "FAILED: ${NAME}_check.sql gave $(echo "$rows" | wc -l) rows"; exit 1; }
  ! echo "$rows" | grep -v ' | t$' || { echo "FAILED: ${NAME}_check.sql"; exit 1; }
}
ledger() { $PSQL -d "$DB" -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = 'review_rules'"; }

sed -n "/^-- >>> supabase\/migrations\/${NAME}.sql/,/^-- <<< /p" ../apply/${NAME}_apply.sql | sed '1d;$d' \
  | diff -q - ../migrations/${NAME}.sql >/dev/null \
  || { echo "FAILED: apply/${NAME}_apply.sql does not carry the migration unchanged"; exit 1; }

export DB=verify_review_rules
fresh
apply < ../apply/20261026090000_draft_update_own_apply.sql
out=$(apply < ../apply/${NAME}_apply.sql || true)
[ -z "$out" ] || { echo "FAILED: applying: $out"; exit 1; }
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'already applied. Nothing was changed' || { echo "FAILED: a second apply did not stop: $out"; exit 1; }
[ "$(ledger)" = 1 ] || { echo "FAILED: $(ledger) ledger rows for review_rules"; exit 1; }
before=$($PSQL -d $DB -qAt -c "select (select count(*) from public.draft) || '/' || (select count(*) from public.stop) || '/' || (select count(*) from public.route_stop)")
checked
after=$($PSQL -d $DB -qAt -c "select (select count(*) from public.draft) || '/' || (select count(*) from public.stop) || '/' || (select count(*) from public.route_stop)")
[ "$before" = "$after" ] || { echo "FAILED: the check left rows behind ($before, then $after)"; exit 1; }
echo 'review_rules: applied (a second run stops whole), the check passed and left nothing behind'

# The review flow's earlier checks, over the new rules.
# after-0022.sql stands in for a rebase with a direct update of base_revision as the editor, which
# this migration refuses (the check proves it); here that one fixture step runs as postgres.
grep -q '^update draft set base_revision = ' after-0022.sql \
  || { echo 'FAILED: after-0022.sql no longer has the base_revision fixture step this script expects'; exit 1; }
sed 's/^update draft set base_revision = .*/reset role;\n&\nset role authenticated;/' after-0022.sql | apply -o /dev/null
PSQL="$PSQL" DB=$DB bash concurrency-0022.sh
PSQL="$PSQL" DB=$DB bash deadlock-0022.sh
PSQL="$PSQL" DB=$DB bash studio-drafts.sh
apply -o /dev/null < reviewed-draft.sql
echo 'review_rules: after-0022.sql, the race scripts, the studio draft saves and reviewed-draft.sql pass over it'

# Without draft_update_own the apply refuses and changes nothing.
DB=verify_review_rules_order
fresh
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'draft_update_own is not applied here. Nothing was changed' \
  || { echo "FAILED: the apply ran without draft_update_own: $out"; exit 1; }
[ "$(ledger)" = 0 ] || { echo 'FAILED: the refused apply wrote the ledger row'; exit 1; }
echo 'review_rules: refused without draft_update_own, nothing changed'

DB=verify_review_rules_revert
fresh
apply < ../apply/20261026090000_draft_update_own_apply.sql
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/review-rules-before.sql
apply < ../apply/${NAME}_apply.sql
apply < ../apply/${NAME}_revert.sql
apply < ../apply/${NAME}_revert.sql
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/review-rules-after.sql
diff -q /tmp/review-rules-before.sql /tmp/review-rules-after.sql >/dev/null \
  || { echo 'FAILED: the schema after revert differs'; diff /tmp/review-rules-before.sql /tmp/review-rules-after.sql | head -20; exit 1; }
[ "$(ledger)" = 0 ] || { echo 'FAILED: revert left the ledger row'; exit 1; }
apply < ../apply/${NAME}_apply.sql
checked
echo 'review_rules revert: schema as before (twice), ledger row gone, re-apply passes the check'
