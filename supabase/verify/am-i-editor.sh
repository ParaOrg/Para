#!/usr/bin/env bash
# The am_i_editor migration on databases of its own. On the first: every
# earlier migration in ledger order, then apply/…_am_i_editor_apply.sql twice
# (the second run must stop and change nothing), the read-only check all true,
# and after-am-i-editor.sql. On the second: apply, revert twice, and the schema
# equals one the migration never touched; re-apply passes the check.
#   PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/am-i-editor.sh
set -euo pipefail
cd "$(dirname "$0")"
export PSQL=${PSQL:?set PSQL to a psql command for a disposable server}
PG_DUMP=${PG_DUMP:-${PSQL/psql/pg_dump}}
NAME=20261030090000_am_i_editor
apply() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -q "$@" 2>&1 | { grep -v '^NOTICE\|^WARNING' || true; }; }
fresh() {
  $PSQL -d postgres -qc "set client_min_messages = warning" -c "drop database if exists $DB" -c "create database $DB"
  sed '/^create role/d;/^grant anon, authenticated/d' bootstrap.sql | apply
  for n in 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0012 0015 0013 0014 0016 0017 0021 0018 0022; do
    apply < ../migrations/${n}_*.sql
  done
}
checked() {
  local bad
  bad=$($PSQL -d "$DB" -qAt -F ' | ' < ../apply/${NAME}_check.sql | grep -v ' | t$' || true)
  [ -z "$bad" ] || { echo "FAILED: ${NAME}_check.sql: $bad"; exit 1; }
}

sed -n "/^-- >>> supabase\/migrations\/${NAME}.sql/,/^-- <<< /p" ../apply/${NAME}_apply.sql | sed '1d;$d' \
  | diff -q - ../migrations/${NAME}.sql >/dev/null \
  || { echo "FAILED: apply/${NAME}_apply.sql does not carry the migration unchanged"; exit 1; }

export DB=verify_am_i_editor
fresh
out=$(apply < ../apply/${NAME}_apply.sql || true)
[ -z "$out" ] || { echo "FAILED: applying: $out"; exit 1; }
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'already applied. Nothing was changed' || { echo "FAILED: a second apply did not stop: $out"; exit 1; }
rows=$($PSQL -d $DB -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = 'am_i_editor'")
[ "$rows" = 1 ] || { echo "FAILED: $rows ledger rows for am_i_editor"; exit 1; }
checked
out=$(apply -o /dev/null < after-am-i-editor.sql || true)
[ -z "$out" ] || { echo "$out"; exit 1; }
echo 'am_i_editor: applied (a second run stops whole), check all true, after-am-i-editor.sql passed'

DB=verify_am_i_editor_revert
fresh
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/am-i-editor-before.sql
apply < ../apply/${NAME}_apply.sql
apply < ../apply/${NAME}_revert.sql
apply < ../apply/${NAME}_revert.sql
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/am-i-editor-after.sql
diff -q /tmp/am-i-editor-before.sql /tmp/am-i-editor-after.sql >/dev/null \
  || { echo 'FAILED: the schema after revert differs'; diff /tmp/am-i-editor-before.sql /tmp/am-i-editor-after.sql | head; exit 1; }
[ "$($PSQL -d $DB -qAt -c "select count(*) from supabase_migrations.schema_migrations where name = 'am_i_editor'")" = 0 ] \
  || { echo 'FAILED: revert left the ledger row'; exit 1; }
apply < ../apply/${NAME}_apply.sql
checked
echo 'am_i_editor revert: schema as before (twice), ledger row gone, re-apply passes the check'
