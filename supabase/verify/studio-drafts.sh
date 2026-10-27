#!/usr/bin/env bash
# The studio's draft saves end to end on the disposable database: each payload
# is built by the studio's code (studio-drafts.mjs) from the rows as they are,
# stored with claim_draft as an editor, then submitted and approved. Checks
# that a stored draft changes no approved row, that approval applies exactly
# the payload (an edit with its links, signboards, a direction emptied, the
# last one taking the route down, a new route with its slot, a new hotspot),
# and that a live edit after drafting makes approval answer `conflict` with
# the approved rows left as that edit made them.
set -u
PSQL=${PSQL:?}
DB=${DB:?}
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
q() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -qAt "$@"; }
E=00000000-0000-0000-0000-0000000000e1
ed=(-c "set role authenticated" -c "set request.jwt.claim.sub = '$E'")
build() { (cd "$ROOT" && node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs supabase/verify/studio-drafts.mjs "$1"); }
# Failures are kept in a file: claim's checks run inside $(...), whose variables do not come back.
failed=$(mktemp)
trap 'rm -f "$failed"' EXIT
check() { [ "$2" = "$3" ] || { echo "FAILED: $1: expected $3, got: $2" >&2; echo x >> "$failed"; }; }

T1=50000000-0000-0000-0000-0000000000a1; T2=50000000-0000-0000-0000-0000000000a2
T3=50000000-0000-0000-0000-0000000000a3; H=50000000-0000-0000-0000-0000000000a4
HOLD=50000000-0000-0000-0000-0000000000a5; H2=50000000-0000-0000-0000-0000000000a6
R=50000000-0000-0000-0000-0000000000b1; VO=50000000-0000-0000-0000-0000000000c1
VB=50000000-0000-0000-0000-0000000000c2
NR=50000000-0000-0000-0000-0000000000b2; NO=50000000-0000-0000-0000-0000000000c3
NB=50000000-0000-0000-0000-0000000000c4; NH=50000000-0000-0000-0000-0000000000a7
pt='{"type":"Point","coordinates":[121.11,14.6]}'
box='{"type":"Polygon","coordinates":[[[121.109,14.599],[121.111,14.599],[121.111,14.601],[121.109,14.601],[121.109,14.599]]]}'
far='{"type":"Polygon","coordinates":[[[121.109,14.699],[121.111,14.699],[121.111,14.701],[121.109,14.701],[121.109,14.699]]]}'
old='[[121.1,14.65],[121.12,14.65]]'
new='[[121.1,14.6],[121.12,14.6]]'
q -c "insert into stop (id, name, kind, point, area, owner_id) values
  ('$T1', 'Drafts T1', 'terminal', '$pt', null, '$E'), ('$T2', 'Drafts T2', 'terminal', '$pt', null, '$E'),
  ('$T3', 'Drafts T3', 'terminal', '$pt', null, '$E'), ('$H', 'Drafts H', 'hintuan', '$pt', '$box', '$E'),
  ('$HOLD', 'Drafts Hold', 'hintuan', '$pt', '$far', '$E'), ('$H2', 'Drafts H2', 'hintuan', '$pt', '$far', '$E');
  insert into route (id, signboard, head_stop_id, tail_stop_id, owner_id) values ('$R', 'Drafts', '$T1', '$T2', '$E');
  insert into route_variant (id, route_id, owner_id, reversed, shape, control_points, signboards, borrowed_from, borrowed_part, borrowed_m) values
  ('$VO', '$R', '$E', false, '{\"type\":\"LineString\",\"coordinates\":$old}', '$old', '{a.svg}', null, null, null),
  ('$VB', '$R', '$E', true, '{\"type\":\"LineString\",\"coordinates\":$old}', '$old', '{b.svg}', '$VO', 'start', 40);
  insert into route_stop values ('$VO', '$T1', 0), ('$VO', '$HOLD', 1), ('$VB', '$H2', 2)" >/dev/null

# The route as the studio reads it, and the hotspots the hintuan rule sees.
state() {
  q -c "select json_build_object(
    'route', (select row_to_json(r) from (select id, revision, route_code, signboard, mode, fare_note, via,
      head_stop_id, tail_stop_id, is_loop from route where id = '$R') r),
    'variants', (select json_agg(v order by v.id) from (select id, reversed, direction_name, origin_terminal,
      destination_terminal, control_points, segments, shape, overview, confidence, borrowed_from, borrowed_part,
      borrowed_m, signboards from route_variant where route_id = '$R') v),
    'links', coalesce((select json_agg(l) from (select route_variant_id, stop_id, stop_sequence from route_stop
      where route_variant_id in ('$VO', '$VB')) l), '[]'),
    'hotspots', (select json_agg(h) from (select id, name, informal, aliases, kind, point, area, note,
      created_at as \"createdAt\" from stop where id in ('$H', '$HOLD', '$H2')) h),
    'line', '$new'::json, 'direction', '$1'::text, 'names', '[\"n.svg\"]'::json)"
}
# Every approved row the fixture has, as one hash.
snap() {
  q -c "select md5(concat_ws('|',
    (select string_agg(r::text, ',' order by id) from route r where id in ('$R', '$NR')),
    (select string_agg(v::text, ',' order by id) from route_variant v where route_id in ('$R', '$NR')),
    (select string_agg(l::text, ',' order by route_variant_id, stop_id) from route_stop l
      where route_variant_id in ('$VO', '$VB', '$NO', '$NB') or stop_id = '$NH'),
    (select string_agg(s::text, ',' order by id) from stop s where id in ('$T1', '$T2', '$T3', '$H', '$HOLD', '$H2', '$NH'))))"
}
rev() { q -c "select revision from route where id = '$R'"; }
# claim(kind, subject, is_new, base, payload-file) -> draft id; checks no approved row changed.
claim() {
  local before after out
  before=$(snap)
  out=$(q -v p="$5" 2>&1 <<SQL
set role authenticated;
set request.jwt.claim.sub = '$E';
select public.claim_draft('$1', '$2', $3, $4, :'p'::jsonb) ->> 'code';
SQL
)
  check "claim $1 $2" "$out" ok
  after=$(snap)
  check "draft of $1 leaves approved rows unchanged" "$after" "$before"
  q -c "select id from draft where kind = '$1' and subject_id = '$2'"
}
submit_approve() {
  check "submit $2" "$(q "${ed[@]}" -c "select public.submit_draft('$1', 1) ->> 'code'")" submitted
  check "approve $2" "$(q "${ed[@]}" -c "select public.approve_draft('$1') ->> 'code'")" approved
}
# The payload, passed to psql as a variable (read from stdin, so it is interpolated).
store() { cat; }

# 1. Edit the way there: new line through H. The old hintuan goes, the ticked terminal stays.
base=$(rev)
f=$(state "$VO" | build edit | store)
D=$(claim route "$R" false "$base" "$f")
submit_approve "$D" "edit"
check "edit: line" "$(q -c "select shape -> 'coordinates' = '$new'::jsonb from route_variant where id = '$VO'")" t
check "edit: links of the edited way" "$(q -c "select string_agg(stop_id || ':' || stop_sequence, ',' order by stop_id) from route_stop where route_variant_id = '$VO'")" "$T1:0,$H:0"
check "edit: other way untouched" "$(q -c "select string_agg(stop_id || ':' || stop_sequence, ',') || ' ' || (select borrowed_from from route_variant where id = '$VB') from route_stop where route_variant_id = '$VB'")" "$H2:2 $VO"
check "edit: draft gone" "$(q -c "select count(*) from draft where id = '$D'")" 0

# 2. Signboards of the way back.
base=$(rev)
f=$(state "$VB" | build signboards | store)
D=$(claim route "$R" false "$base" "$f")
submit_approve "$D" "signboards"
check "signboards" "$(q -c "select string_agg(array_to_string(signboards, ';'), ' ' order by reversed) from route_variant where route_id = '$R'")" "a.svg n.svg"

# 3. Conflict: a live edit after drafting. Approval refuses and changes nothing.
base=$(rev)
f=$(state "$VO" | build delete | store)
D=$(claim route "$R" false "$base" "$f")
check "conflict: submit" "$(q "${ed[@]}" -c "select public.submit_draft('$D', 1) ->> 'code'")" submitted
q -c "update route set fare_note = 'live edit' where id = '$R'" >/dev/null
before=$(snap)
check "conflict: approve" "$(q "${ed[@]}" -c "select public.approve_draft('$D') ->> 'code'")" conflict
check "conflict: approved rows as the live edit left them" "$(snap)" "$before"
check "conflict: draft kept" "$(q -c "select count(*) from draft where id = '$D'")" 1
check "conflict: discard" "$(q "${ed[@]}" -c "select public.discard_draft('$D', 2) ->> 'code'")" discarded

# 4. Delete the way back, then the way there: the route comes down.
base=$(rev)
f=$(state "$VB" | build delete | store)
D=$(claim route "$R" false "$base" "$f")
submit_approve "$D" "delete back"
check "delete: emptied" "$(q -c "select (shape is null)::text || ' ' || cardinality(signboards) || ' ' || (select count(*) from route_stop where route_variant_id = '$VB') from route_variant where id = '$VB'")" "true 0 0"
check "delete: route still up, fare_note kept" "$(q -c "select status || ' ' || fare_note from route where id = '$R'")" "approved live edit"
base=$(rev)
f=$(state "$VO" | build delete | store)
D=$(claim route "$R" false "$base" "$f")
submit_approve "$D" "delete there"
check "delete: last way takes the route down" "$(q -c "select status from route where id = '$R'")" taken_down

# 5. A new route between T1 and T3, through H: the drawn way and its empty slot.
f=$(q -c "select json_build_object('route_id', '$NR', 'direction_ids', json_build_array('$NO', '$NB'),
  'head', '$T1', 'tail', '$T3', 'line', '$new'::json,
  'hotspots', (select json_agg(h) from (select id, name, informal, aliases, kind, point, area, note,
    created_at as \"createdAt\" from stop where id = '$H') h))" | build new | store)
D=$(claim route "$NR" true null "$f")
submit_approve "$D" "new route"
check "new route: two ways, one drawn" "$(q -c "select string_agg((shape is not null)::text, ' ' order by reversed) from route_variant where route_id = '$NR'")" "true false"
check "new route: linked to H" "$(q -c "select string_agg(stop_id::text, ',') from route_stop where route_variant_id = '$NO'")" "$H"

# 6. A new hotspot.
f=$(echo "{\"input\":{\"hotspotId\":null,\"kind\":\"hintuan\",\"name\":\" Drafts  New \",\"informal\":\"\",\"aliases\":[],\"note\":\"\",\"ring\":[[121.2,14.6],[121.21,14.6],[121.21,14.61]],\"directions\":[]}}" | build hotspot | store)
D=$(claim hotspot "$NH" true null "$f")
submit_approve "$D" "new hotspot"
check "new hotspot: written, name normalised" "$(q -c "select name || ' ' || status from stop where id = '$NH'")" "Drafts New approved"

q -c "delete from draft where subject_id in ('$R', '$NR', '$NH'); delete from route where id in ('$R', '$NR');
  delete from stop where id in ('$T1', '$T2', '$T3', '$H', '$HOLD', '$H2', '$NH')" >/dev/null
[ -s "$failed" ] && exit 1
echo 'studio-drafts: edit, signboards, conflict, delete (route down), new route, new hotspot: drafts change nothing until approved'
