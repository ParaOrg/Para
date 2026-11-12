#!/usr/bin/env bash
# The schema snapshot: supabase/schema/snapshot.sql is the public and private schemas as the live
# project has them, rebuilt here from every migration the ledger lists, in the ledger's order
# (migrations/README.md), each through its paste file where it has one, as the owner applied it.
# It is for reading what the database is now, in one file; it is never applied.
#
#   PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/schema-snapshot.sh           # check
#   PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/schema-snapshot.sh --write   # rewrite
#
# The check fails when the snapshot differs from the rebuild: a migration recorded as applied, and
# added to APPLIED below, rewrites the snapshot in the same change (--write).
set -euo pipefail
cd "$(dirname "$0")"
export PSQL=${PSQL:?set PSQL to a psql command for a disposable server}
PG_DUMP=${PG_DUMP:-${PSQL/psql/pg_dump}}
SNAPSHOT=../schema/snapshot.sql
apply() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -q "$@" 2>&1 | { grep -v '^NOTICE\|^WARNING' || true; }; }

# The ledger's order. Not here: 20261022100000_backup_reader, written but not applied.
APPLIED=(
  0001_init 0002_pin_function_search_path 0003_rls_performance 0004_stop_hotspot 0005_editor_role
  0006_route_ends 0007_stop_names 0008_route_borrow 0009_overview 0010_signboards 0011_rail 0012_ferry
  0015_shared_editing 0013_hotspot_points 0014_terminal_place_unique 0016_finish_terminal_index
  0017_anon_writes_revoked 0021_loops 0018_review 0022_draft_ops
  20261019125900_contributions 20261018112757_reviewed_draft_approval 20261022090000_contribution_use
  20261023090000_signup_hook 20261024090000_contributor_accounts 20261030090000_am_i_editor
  20261026090000_draft_update_own 20261031090000_account_stats 20261031100000_delete_my_account
  20261031110000_contribution_fare 20261101090000_delete_account_keep_uploads
  20261105090000_delete_account_refuse_uploads 20261105120000_review_rules
  20261105130000_draft_update_makerless 20261105180000_keep_uploads_on_user_delete
  20261105160000_draft_published 20261105190000_lock_map_tables
  20261105200000_drop_dead_weight 20261110190000_retire_review_steps
)

export DB=verify_schema_snapshot
$PSQL -d postgres -qc "set client_min_messages = warning" -c "drop database if exists $DB" -c "create database $DB"
sed '/^create role/d;/^grant anon, authenticated/d' bootstrap.sql | apply
for name in "${APPLIED[@]}"; do
  # 0018 and 0022's paste files carry the number alone (0018_apply.sql).
  if [ -f "../apply/${name}_apply.sql" ]; then apply < "../apply/${name}_apply.sql"
  elif [ -f "../apply/${name%%_*}_apply.sql" ]; then apply < "../apply/${name%%_*}_apply.sql"
  else apply < ../migrations/${name}.sql; fi
done

rebuilt=$(mktemp)
trap 'rm -f "$rebuilt"' EXIT
{
  echo '-- ParaPo — the public and private schemas as the live project has them: schema only, no rows.'
  echo '-- Written by supabase/verify/schema-snapshot.sh --write from every migration the ledger lists,'
  echo '-- in its order. For reading what the database is now; never apply it. Each change still goes'
  echo '-- through its own migration in supabase/migrations/.'
  $PG_DUMP -d $DB --schema-only --no-owner --schema=public --schema=private \
    | grep -Ev '^.(un)?restrict ' | grep -Ev '^-- Dumped (from|by) '
} > "$rebuilt"

if [ "${1:-}" = --write ]; then
  cp "$rebuilt" "$SNAPSHOT"
  echo "schema snapshot: written ($(wc -l < "$SNAPSHOT") lines)"
  exit 0
fi
diff -q "$rebuilt" "$SNAPSHOT" >/dev/null \
  || { echo 'FAILED: supabase/schema/snapshot.sql is out of date: run schema-snapshot.sh --write'; diff "$SNAPSHOT" "$rebuilt" | head -20; exit 1; }
echo 'schema snapshot: matches every applied migration, in ledger order'
