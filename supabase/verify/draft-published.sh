#!/usr/bin/env bash
# The draft_published migration on databases of its own. On the first: every earlier migration in
# ledger order with the review flow's paste files (0018, 0022, reviewed_draft_approval,
# draft_update_own, review_rules, draft_update_makerless), then apply/…_draft_published_apply.sql
# twice (the second run must stop and change nothing), and the check: its rolled-back behaviour part
# raises nothing and leaves nothing behind, and its read-only rows are all true. Then the backfill is
# checked against status_at and owner_id, the races run (draft-published-race.sh), and every
# fixture route and hotspot is unpublished: the drafts left are read by the studio's own code
# (unpublished-drafts.mjs), and publishing them puts back exactly what was there. Then every earlier
# review check runs again over it, as the studio on main still uses that path. On the second:
# the apply refuses without draft_update_makerless, changing nothing. On the third: apply, revert
# twice, and the schema equals one the migration never touched; re-apply passes the check.
#   PSQL="docker exec -i pg-verify psql -U postgres" bash supabase/verify/draft-published.sh
set -euo pipefail
cd "$(dirname "$0")"
ROOT=$(cd ../.. && pwd)
export PSQL=${PSQL:?set PSQL to a psql command for a disposable server}
PG_DUMP=${PG_DUMP:-${PSQL/psql/pg_dump}}
NAME=20261105160000_draft_published
apply() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -q "$@" 2>&1 | { grep -v '^NOTICE\|^WARNING' || true; }; }
q() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -qAt "$@"; }
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
  apply < ../apply/20261026090000_draft_update_own_apply.sql
  apply < ../apply/20261105120000_review_rules_apply.sql
}
# The behaviour part prints its own rows (set_config, claims); the check rows are "n | what | ok".
checked() {
  local out rows
  out=$($PSQL -d "$DB" -v ON_ERROR_STOP=1 -qAt -F ' | ' < ../apply/${NAME}_check.sql 2>&1) \
    || { echo "FAILED: ${NAME}_check.sql: $(echo "$out" | grep -E 'ERROR|FAILED' | head -3)"; exit 1; }
  rows=$(echo "$out" | grep -E '^[0-9]+ \| ')
  [ "$(echo "$rows" | wc -l)" = 8 ] || { echo "FAILED: ${NAME}_check.sql gave $(echo "$rows" | wc -l) rows"; exit 1; }
  ! echo "$rows" | grep -v ' | t$' || { echo "FAILED: ${NAME}_check.sql"; exit 1; }
}
ledger() { q -c "select count(*) from supabase_migrations.schema_migrations where name = 'draft_published'"; }
counts() { q -c "select (select count(*) from public.draft) || '/' || (select count(*) from public.route) || '/' || (select count(*) from public.stop) || '/' || (select count(*) from public.route_stop) || '/' || (select count(*) from public.takedown)"; }

sed -n "/^-- >>> supabase\/migrations\/${NAME}.sql/,/^-- <<< /p" ../apply/${NAME}_apply.sql | sed '1d;$d' \
  | diff -q - ../migrations/${NAME}.sql >/dev/null \
  || { echo "FAILED: apply/${NAME}_apply.sql does not carry the migration unchanged"; exit 1; }

export DB=verify_draft_published
fresh
apply < ../apply/20261105130000_draft_update_makerless_apply.sql
# A taken-down route and a draft based on its route's revision, as live has them, for the backfill.
q -c "update public.route set status = 'taken_down' where id = (select id from public.route order by id limit 1)" \
  -c "insert into public.draft (kind, subject_id, is_new, base_revision, payload, editor_id)
      select 'route', id, false, revision, '{\"version\": 1}', owner_id from public.route
      where status = 'approved' order by id limit 1" >/dev/null
revisions=$(q -c "select string_agg(id || ':' || revision || ':' || updated_at, ',' order by id) from public.route")
out=$(apply < ../apply/${NAME}_apply.sql || true)
[ -z "$out" ] || { echo "FAILED: applying: $out"; exit 1; }
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'already applied. Nothing was changed' || { echo "FAILED: a second apply did not stop: $out"; exit 1; }
[ "$(ledger)" = 1 ] || { echo "FAILED: $(ledger) ledger rows for draft_published"; exit 1; }

# The backfill: from status_at and owner_id, a taken-down row unpublished, no revision moved.
bad=$(q -c "select count(*) from (
    select status, status_at, owner_id, published_at, published_by, last_saved_at, last_saved_by from public.route
    union all
    select status, status_at, owner_id, published_at, published_by, last_saved_at, last_saved_by from public.stop) r
  where last_saved_at is distinct from status_at or last_saved_by is distinct from owner_id
     or published_at is distinct from case when status = 'approved' then status_at end
     or published_by is distinct from case when status = 'approved' then owner_id end")
[ "$bad" = 0 ] || { echo "FAILED: $bad rows were not backfilled from status_at and owner_id"; exit 1; }
[ "$(q -c "select count(*) from public.route where status = 'taken_down' and published_at is null")" -ge 1 ] \
  || { echo 'FAILED: no taken-down row to prove the backfill on'; exit 1; }
[ "$revisions" = "$(q -c "select string_agg(id || ':' || revision || ':' || updated_at, ',' order by id) from public.route")" ] \
  || { echo 'FAILED: the backfill moved a revision or an updated_at'; exit 1; }
[ "$(q -c "select count(*) from public.draft d join public.route r on r.id = d.subject_id where d.base_revision = r.revision and d.last_saved_by = d.editor_id")" = 1 ] \
  || { echo 'FAILED: the draft lost its base or its last saver'; exit 1; }
q -c "delete from public.draft" >/dev/null

before=$(counts)
checked
[ "$before" = "$(counts)" ] || { echo "FAILED: the check left rows behind ($before, then $(counts))"; exit 1; }
echo 'draft_published: applied (a second run stops whole), backfilled without moving a revision, the check passed and left nothing behind'

PSQL="$PSQL" DB=$DB bash draft-published-race.sh

# Every fixture route and hotspot unpublished: the drafts left are the studio's own, and
# publishing them all puts back what was there. Hotspots that end a published route are refused
# until their routes are down, so routes go first.
E=00000000-0000-0000-0000-0000000000e1
ed=(-c "set role authenticated" -c "set request.jwt.claim.sub = '$E'")
q -c "insert into auth.users (id, is_anonymous) select '$E', false where not exists (select 1 from auth.users where id = '$E');
  insert into private.editor (user_id) select '$E' where not exists (select 1 from private.editor where user_id = '$E')" >/dev/null
content() { q -c "select md5(string_agg(x, '|' order by x)) from (
    select row(r.id, r.signboard, r.mode, r.fare_note, r.via, r.head_stop_id, r.tail_stop_id, r.is_loop, r.route_code)::text x from public.route r
    union all select row(v.*)::text from (select id, route_id, reversed, control_points, segments, shape, overview, confidence,
      borrowed_from, borrowed_part, borrowed_m, signboards, direction_name, origin_terminal, destination_terminal from public.route_variant) v
    union all select row(s.id, s.name, s.informal, s.aliases, s.kind, s.note, s.area, s.point, s.line)::text from public.stop s
    union all select row(l.*)::text from public.route_stop l) t"; }
# Every published hotspot has an outline (the studio's Edit needs one), and every published route a
# drawn line (publishing takes an emptied one down); the oldest fixtures have neither.
q -c "delete from public.route r where not exists (
    select 1 from public.route_variant v where v.route_id = r.id and v.shape is not null);
  update public.route set status = 'approved'; update public.stop set status = 'approved';
  update public.stop set area = jsonb_build_object('type', 'Polygon', 'coordinates', jsonb_build_array(jsonb_build_array(
    jsonb_build_array((point #>> '{coordinates,0}')::float8 - 0.0005, (point #>> '{coordinates,1}')::float8 - 0.0005),
    jsonb_build_array((point #>> '{coordinates,0}')::float8 + 0.0005, (point #>> '{coordinates,1}')::float8 - 0.0005),
    jsonb_build_array((point #>> '{coordinates,0}')::float8 + 0.0005, (point #>> '{coordinates,1}')::float8 + 0.0005),
    jsonb_build_array((point #>> '{coordinates,0}')::float8 - 0.0005, (point #>> '{coordinates,1}')::float8 - 0.0005))))
  where area is null;
  insert into public.route (id, owner_id, signboard, head_stop_id, tail_stop_id, fare_note) values
    ('22000000-0000-0000-0000-0000000000b1', '$E', 'Round trip', '10000000-0000-0000-0000-00000000000a',
     '10000000-0000-0000-0000-00000000000b', '13 pesos');
  insert into public.route (id, owner_id, signboard, is_loop, via) values
    ('22000000-0000-0000-0000-0000000000b2', '$E', 'Round trip ikot', true, 'Katipunan');
  insert into public.route_variant (id, route_id, owner_id, reversed, shape, control_points, segments, overview, signboards) values
    ('22000000-0000-0000-0000-0000000000c1', '22000000-0000-0000-0000-0000000000b1', '$E', false,
     '{\"type\":\"LineString\",\"coordinates\":[[121.1,14.6],[121.12,14.6]]}', '[[121.1,14.6],[121.12,14.6]]',
     '[{\"snap\":\"freehand\",\"coordinates\":[[121.1,14.6],[121.12,14.6]]}]',
     '{\"type\":\"LineString\",\"coordinates\":[[121.1,14.6],[121.12,14.6]]}', '{a.svg,b.svg}'),
    ('22000000-0000-0000-0000-0000000000c2', '22000000-0000-0000-0000-0000000000b1', '$E', true, null, '[]', '[]', null, '{}');
  insert into public.route_variant (id, route_id, owner_id, reversed, shape, borrowed_from, borrowed_part, borrowed_m) values
    ('22000000-0000-0000-0000-0000000000c3', '22000000-0000-0000-0000-0000000000b2', '$E', false,
     '{\"type\":\"LineString\",\"coordinates\":[[121.1,14.6],[121.11,14.61],[121.1,14.6]]}',
     '22000000-0000-0000-0000-0000000000c1', 'start', 40.5);
  insert into public.route_stop (route_variant_id, stop_id, stop_sequence) values
    ('22000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-00000000000c', 1),
    ('22000000-0000-0000-0000-0000000000c3', '10000000-0000-0000-0000-00000000000c', 2)" >/dev/null
was=$(content)
routes=$(q "${ed[@]}" -c "select count(*) filter (where public.unpublish('route', id) ->> 'code' = 'unpublished') || '/' || count(*) from public.route")
stops=$(q "${ed[@]}" -c "select count(*) filter (where public.unpublish('hotspot', id) ->> 'code' = 'unpublished') || '/' || count(*) from public.stop")
[ "${routes%/*}" = "${routes#*/}" ] && [ "${stops%/*}" = "${stops#*/}" ] \
  || { echo "FAILED: unpublished $routes routes and $stops hotspots"; exit 1; }
q -c "select coalesce(json_agg(d), '[]') from public.draft d" \
  | (cd "$ROOT" && node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs supabase/verify/unpublished-drafts.mjs)
# Hotspots first now: a route is published only with both its ends published.
published=$(q "${ed[@]}" -c "select count(*) filter (where public.publish_draft(d.id, d.revision) ->> 'code' = 'approved') || '/' || count(*)
  from (select id, revision from public.draft order by kind, id) d")
[ "${published%/*}" = "${published#*/}" ] || { echo "FAILED: published $published of the drafts unpublish left"; exit 1; }
[ "$was" = "$(content)" ] || { echo 'FAILED: publishing the drafts unpublish left changed the map'; exit 1; }
[ "$(q -c "select count(*) from public.route where status <> 'approved'") $(q -c "select count(*) from public.stop where status <> 'approved'") $(q -c "select count(*) from public.draft")" = '0 0 0' ] \
  || { echo 'FAILED: something stayed down, or a draft stayed'; exit 1; }
echo "draft_published: $routes routes and $stops hotspots unpublished, read by the studio, published back unchanged"

# The studio on main's path, over the migration: every earlier review check again. after-0022.sql's one
# direct base_revision step runs as postgres, as review-rules.sh runs it (review_rules refuses it).
grep -q '^update draft set base_revision = ' after-0022.sql \
  || { echo 'FAILED: after-0022.sql no longer has the base_revision fixture step this script expects'; exit 1; }
sed 's/^update draft set base_revision = .*/reset role;\n&\nset role authenticated;/' after-0022.sql | apply -o /dev/null
PSQL="$PSQL" DB=$DB bash concurrency-0022.sh
PSQL="$PSQL" DB=$DB bash deadlock-0022.sh
PSQL="$PSQL" DB=$DB bash studio-drafts.sh
apply -o /dev/null < reviewed-draft.sql
[ "$(q -c "select count(*) from public.route where last_saved_at is null or (status = 'approved' and published_at is null)")" = 0 ] \
  || { echo 'FAILED: a route the old path approved was not stamped'; exit 1; }
echo 'draft_published: the studio on main still works over it (after-0022.sql, the race scripts, studio-drafts.sh, reviewed-draft.sql), and stamps what it approves'

# Without draft_update_makerless the apply refuses and changes nothing.
DB=verify_draft_published_order
fresh
out=$(apply < ../apply/${NAME}_apply.sql || true)
echo "$out" | grep -q 'draft_update_makerless is not applied here. Nothing was changed' \
  || { echo "FAILED: the apply ran without draft_update_makerless: $out"; exit 1; }
[ "$(ledger)" = 0 ] || { echo 'FAILED: the refused apply wrote the ledger row'; exit 1; }
echo 'draft_published: refused without draft_update_makerless, nothing changed'

DB=verify_draft_published_revert
fresh
apply < ../apply/20261105130000_draft_update_makerless_apply.sql
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/draft-published-before.sql
apply < ../apply/${NAME}_apply.sql
apply < ../apply/${NAME}_revert.sql
apply < ../apply/${NAME}_revert.sql
$PG_DUMP -d $DB --schema-only | grep -Ev '^.(un)?restrict ' > /tmp/draft-published-after.sql
diff -q /tmp/draft-published-before.sql /tmp/draft-published-after.sql >/dev/null \
  || { echo 'FAILED: the schema after revert differs'; diff /tmp/draft-published-before.sql /tmp/draft-published-after.sql | head -20; exit 1; }
[ "$(ledger)" = 0 ] || { echo 'FAILED: revert left the ledger row'; exit 1; }
apply < ../apply/${NAME}_apply.sql
checked
echo 'draft_published revert: schema as before (twice), ledger row gone, re-apply passes the check'
