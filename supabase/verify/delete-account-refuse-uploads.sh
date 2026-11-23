#!/usr/bin/env bash
# The delete_account_refuse_uploads migration on databases of its own. On the first: every earlier
# migration in ledger order, the contributor migrations through their paste files (as live will
# have them: account_stats, delete_my_account, contribution_fare, delete_account_keep_uploads),
# then apply/…_delete_account_refuse_uploads_apply.sql twice (the second run must stop and change
# nothing), and the check: its rolled-back behaviour part raises nothing and leaves nothing
# behind, and its read-only rows are all true. On the second: the apply refuses without
# delete_account_keep_uploads, changing nothing. On the third: apply, revert twice, and the schema
# equals one the migration never touched; re-apply passes the check.
#   PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/delete-account-refuse-uploads.sh
set -euo pipefail
cd "$(dirname "$0")"
export PSQL=${PSQL:?set PSQL to a psql command for a disposable server}
PG_DUMP=${PG_DUMP:-${PSQL/psql/pg_dump}}
NAME=20261105090000_delete_account_refuse_uploads
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
  apply < ../apply/20261031100000_delete_my_account_apply.sql
  apply < ../apply/20261031110000_contribution_fare_apply.sql
}
# The behaviour part prints its own rows (fill, set_config); the check rows are "n | what | ok".
checked() {
  local out rows
  out=$($PSQL -d "$DB" -v ON_ERROR_STOP=1 -qAt -F ' | ' < ../apply/${NAME}_check.sql 2>&1) \
    || { echo "FAILED: ${NAME}_check.sql: $(echo "$out" | grep -E 'ERROR|FAILED' | head -3)"; exit 1; }
  rows=$(echo "$out" | grep -E '^[0-9]+ \| ')
  [ "$(echo "$rows" | wc -l)" = 5 ] || { echo "FAILED: ${NAME}_check.sql gave $(echo "$rows" | wc -l) rows"; exit 1; }
  ! echo "$rows" | grep -v ' | t$' || { echo "FAILED: ${NAME}_check.sql"; exit 1; }
}

sed -n "/^-- >>> supabase\/migrations\/${NAME}.sql/,/^-- <<< /p" ../apply/${NAME}_apply.sql | sed '1d;$d' \
  | diff -q - ../migrations/${NAME}.sql >/dev/null \
  || { echo "FAILED: apply/${NAME}_apply.sql does not carry the migration unchanged"; exit 1; }

export DB=verify_delete_account_refuse_uploads
fresh
apply < ../apply/20261101090000_delete_account_keep_uploads_apply.sql
out=$(apply < ../apply/${NAME}_apply.sql || true)
[ -z "$out" ] || { echo "FAILED: applying: $out"; exit 1; }
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'already applied. Nothing was changed' || { echo "FAILED: a second apply did not stop: $out"; exit 1; }
rows=$($PSQL -d $DB -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = 'delete_account_refuse_uploads'")
[ "$rows" = 1 ] || { echo "FAILED: $rows ledger rows for delete_account_refuse_uploads"; exit 1; }
checked
[ "$($PSQL -d $DB -qAt -c "select count(*) from public.contribution")" = 0 ] \
  || { echo 'FAILED: the check left rows behind'; exit 1; }
echo 'delete_account_refuse_uploads: applied (a second run stops whole), the check passed and left nothing behind'

# Without delete_account_keep_uploads the apply refuses and changes nothing.
DB=verify_delete_account_refuse_uploads_order
fresh
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'delete_account_keep_uploads is not applied here. Nothing was changed' \
  || { echo "FAILED: the apply ran without delete_account_keep_uploads: $out"; exit 1; }
[ "$($PSQL -d $DB -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = 'delete_account_refuse_uploads'")" = 0 ] \
  || { echo 'FAILED: the refused apply wrote the ledger row'; exit 1; }
echo 'delete_account_refuse_uploads: refused without delete_account_keep_uploads, nothing changed'

DB=verify_delete_account_refuse_uploads_revert
fresh
apply < ../apply/20261101090000_delete_account_keep_uploads_apply.sql
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/delete-account-refuse-uploads-before.sql
apply < ../apply/${NAME}_apply.sql
apply < ../apply/${NAME}_revert.sql
apply < ../apply/${NAME}_revert.sql
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/delete-account-refuse-uploads-after.sql
diff -q /tmp/delete-account-refuse-uploads-before.sql /tmp/delete-account-refuse-uploads-after.sql >/dev/null \
  || { echo 'FAILED: the schema after revert differs'; diff /tmp/delete-account-refuse-uploads-before.sql /tmp/delete-account-refuse-uploads-after.sql | head -20; exit 1; }
[ "$($PSQL -d $DB -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = 'delete_account_refuse_uploads'")" = 0 ] \
  || { echo 'FAILED: revert left the ledger row'; exit 1; }
apply < ../apply/${NAME}_apply.sql
checked
echo 'delete_account_refuse_uploads revert: schema as before (twice), ledger row gone, re-apply passes the check'
