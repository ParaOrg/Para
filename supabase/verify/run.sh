#!/usr/bin/env bash
# Builds a throwaway database from every migration in ledger order, adds rows,
# applies 0018 over them through supabase/apply/0018_apply.sql (twice: it must
# be safe to re-run) and checks it; then undoes it on a second database and
# compares the schema with one 0018 never touched.
#   PSQL="docker exec -i pg18 psql -U postgres" supabase/verify/run.sh
set -euo pipefail
cd "$(dirname "$0")"
PSQL=${PSQL:?set PSQL to a psql command for a disposable server}
PG_DUMP=${PG_DUMP:-${PSQL/psql/pg_dump}}
apply() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -q "$@" 2>&1 | { grep -v '^NOTICE\|^WARNING' || true; }; }
fresh() {
  $PSQL -d postgres -qc "set client_min_messages = warning" -c "drop database if exists $DB" -c "create database $DB"
  NEW_SERVER=0
  for role in anon authenticated service_role; do
    $PSQL -d postgres -qAtc "select 1 from pg_roles where rolname = '$role'" | grep -q 1 || NEW_SERVER=1
  done
  if [ "$NEW_SERVER" = 1 ]; then apply < bootstrap.sql; else
    sed '/^create role/d;/^grant anon, authenticated/d' bootstrap.sql | apply; fi
  # Ledger order (migrations/README.md): 0015 was applied before 0013 and 0014.
  for n in 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0012 0015 0013 0014 0016 0017 0021; do
    apply < ../migrations/${n}_*.sql
  done
  apply -o /dev/null < before-0018.sql
}

# The paste file carries 0018_review.sql unchanged.
sed -n '/^-- >>> supabase\/migrations\/0018_review.sql/,/^-- <<< /p' ../apply/0018_apply.sql | sed '1d;$d' \
  | diff -q - ../migrations/0018_review.sql >/dev/null \
  || { echo 'FAILED: apply/0018_apply.sql does not carry 0018_review.sql unchanged'; exit 1; }

DB=verify_0018
fresh
apply < ../apply/0018_apply.sql
apply < ../apply/0018_apply.sql
rows=$($PSQL -d $DB -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = '0018_review'")
[ "$rows" = 1 ] || { echo "FAILED: $rows ledger rows for 0018_review"; exit 1; }
bad=$($PSQL -d $DB -qAt -F ' | ' < ../apply/0018_check.sql | grep -v '| t |' || true)
[ -z "$bad" ] || { echo "FAILED: 0018_check.sql: $bad"; exit 1; }
echo 'apply: once in the ledger, 0018_check.sql all true'
apply -o /dev/null < after-0018.sql
PSQL="$PSQL" DB=$DB bash concurrency.sh
sed -n '/^-- >>> supabase\/migrations\/0022_draft_ops.sql/,/^-- <<< /p' ../apply/0022_apply.sql | sed '1d;$d' \
  | diff -q - ../migrations/0022_draft_ops.sql >/dev/null \
  || { echo 'FAILED: apply/0022_apply.sql does not carry 0022_draft_ops.sql unchanged'; exit 1; }
apply < ../apply/0022_apply.sql
apply < ../apply/0022_apply.sql
bad=$($PSQL -d $DB -qAt -F ' | ' < ../apply/0022_check.sql | grep -v ' | t$' || true)
[ -z "$bad" ] || { echo "FAILED: 0022_check.sql: $bad"; exit 1; }
apply -o /dev/null < after-0022.sql
PSQL="$PSQL" DB=$DB bash concurrency-0022.sh
PSQL="$PSQL" DB=$DB bash deadlock-0022.sh
PSQL="$PSQL" DB=$DB bash studio-drafts.sh
sed -n '/^-- >>> supabase\/migrations\/20261018112757_reviewed_draft_approval.sql/,/^-- <<< /p' \
  ../apply/20261018112757_reviewed_draft_approval_apply.sql | sed '1d;$d' \
  | diff -q - ../migrations/20261018112757_reviewed_draft_approval.sql >/dev/null \
  || { echo 'FAILED: the reviewed approval paste file does not carry its migration unchanged'; exit 1; }
apply < ../apply/20261018112757_reviewed_draft_approval_apply.sql
apply < ../apply/20261018112757_reviewed_draft_approval_apply.sql
bad=$($PSQL -d $DB -qAt -F ' | ' < ../apply/20261018112757_reviewed_draft_approval_check.sql | grep -v ' | t$' || true)
[ -z "$bad" ] || { echo "FAILED: reviewed_draft_approval_check.sql: $bad"; exit 1; }
rows=$($PSQL -d $DB -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = 'reviewed_draft_approval'")
[ "$rows" = 1 ] || { echo "FAILED: $rows ledger rows for reviewed_draft_approval"; exit 1; }
apply -o /dev/null < reviewed-draft.sql
echo 'reviewed approval: paste file applied twice, check all true, stale review and base guards passed'
echo '0022: applied twice, 0022_check.sql all true, after-0022.sql passed'
out=$(apply < ../apply/0018_revert.sql || true)
echo "$out" | grep -q 'is not undone' || { echo "FAILED: revert ran over taken-down rows: $out"; exit 1; }

DB=verify_0018_revert
fresh
$PG_DUMP -d $DB --schema-only --schema=public --schema=private | grep -Ev '^.(un)?restrict ' > /tmp/before-0018.dump
apply < ../apply/0018_apply.sql
apply < ../apply/0018_revert.sql
$PG_DUMP -d $DB --schema-only --schema=public --schema=private | grep -Ev '^.(un)?restrict ' > /tmp/reverted-0018.dump
diff /tmp/before-0018.dump /tmp/reverted-0018.dump || { echo 'FAILED: revert left the schema different'; exit 1; }
rows=$($PSQL -d $DB -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = '0018_review'")
[ "$rows" = 0 ] || { echo 'FAILED: revert left the ledger row'; exit 1; }
echo 'revert: schema as before 0018, ledger row gone, refused over a takedown'

DB=verify_0022_revert
fresh
apply < ../apply/0018_apply.sql
$PG_DUMP -d $DB --schema-only --schema=public --schema=private | grep -Ev '^.(un)?restrict ' > /tmp/before-0022.dump
apply < ../apply/0022_apply.sql
apply < ../apply/0022_revert.sql
apply < ../apply/0022_revert.sql
$PG_DUMP -d $DB --schema-only --schema=public --schema=private | grep -Ev '^.(un)?restrict ' > /tmp/reverted-0022.dump
diff /tmp/before-0022.dump /tmp/reverted-0022.dump || { echo 'FAILED: 0022 revert left the schema different'; exit 1; }
rows=$($PSQL -d $DB -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = '0022_draft_ops'")
[ "$rows" = 0 ] || { echo 'FAILED: 0022 revert left the ledger row'; exit 1; }
apply < ../apply/0022_apply.sql
bad=$($PSQL -d $DB -qAt -F ' | ' < ../apply/0022_check.sql | grep -v ' | t$' || true)
[ -z "$bad" ] || { echo "FAILED: 0022_check.sql after re-apply: $bad"; exit 1; }
echo '0022 revert: schema as before 0022 (twice), ledger row gone, re-apply passes 0022_check.sql'


# New revision-checked entry points undo without changing the existing 0022 schema.
$PG_DUMP -d $DB --schema-only --schema=public --schema=private | grep -Ev '^.(un)?restrict ' > /tmp/before-reviewed-approval.dump
apply < ../migrations/20261018112757_reviewed_draft_approval.sql
apply -o /dev/null < reviewed-draft.sql
apply < ../apply/20261018112757_reviewed_draft_approval_revert.sql
apply < ../apply/20261018112757_reviewed_draft_approval_revert.sql
$PG_DUMP -d $DB --schema-only --schema=public --schema=private | grep -Ev '^.(un)?restrict ' > /tmp/reverted-reviewed-approval.dump
diff /tmp/before-reviewed-approval.dump /tmp/reverted-reviewed-approval.dump || { echo 'FAILED: reviewed approval revert changed the baseline'; exit 1; }
echo 'reviewed approval revert: schema unchanged, repeated recovery safe'
PSQL="$PSQL" PG_DUMP="$PG_DUMP" bash contributions.sh
PSQL="$PSQL" PG_DUMP="$PG_DUMP" bash contribution-use.sh
PSQL="$PSQL" PG_DUMP="$PG_DUMP" bash signup-hook.sh
PSQL="$PSQL" PG_DUMP="$PG_DUMP" bash contributor-accounts.sh
PSQL="$PSQL" PG_DUMP="$PG_DUMP" bash am-i-editor.sh
