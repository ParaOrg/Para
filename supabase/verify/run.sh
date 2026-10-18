#!/usr/bin/env bash
# Builds a throwaway database from every migration in ledger order, adds rows,
# applies 0018 over them (twice: it must be safe to re-run) and checks it.
#   PSQL="docker exec -i pg18 psql -U postgres" supabase/verify/run.sh
set -euo pipefail
cd "$(dirname "$0")"
PSQL=${PSQL:?set PSQL to a psql command for a disposable server}
DB=verify_0018
$PSQL -d postgres -qc "drop database if exists $DB" -c "create database $DB"
for role in anon authenticated service_role; do
  $PSQL -d postgres -qAtc "select 1 from pg_roles where rolname = '$role'" | grep -q 1 || NEW_SERVER=1
done
apply() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -q "$@" 2>&1 | { grep -v '^NOTICE' || true; }; }
if [ "${NEW_SERVER:-0}" = 1 ]; then apply < bootstrap.sql; else
  sed '/^create role/d;/^grant anon, authenticated/d' bootstrap.sql | apply; fi
# Ledger order (migrations/README.md): 0015 was applied before 0013 and 0014.
for n in 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0012 0015 0013 0014 0016 0017 0021; do
  apply < ../migrations/${n}_*.sql
done
apply -o /dev/null < before-0018.sql
apply < ../migrations/0018_review.sql
apply < ../migrations/0018_review.sql
apply -o /dev/null < after-0018.sql
PSQL="$PSQL" DB=$DB bash concurrency.sh
