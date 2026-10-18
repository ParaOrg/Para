#!/usr/bin/env bash
# Two sessions race approve_draft against a live edit of its route (both
# orders) and against a second approval of the same draft. Approval either
# lands whole or leaves the route as the other session left it.
set -u
PSQL=${PSQL:?}
DB=${DB:?}
q() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -qAt "$@"; }
R=20000000-0000-0000-0000-0000000000f1
V=20000000-0000-0000-0000-0000000000f2
E=00000000-0000-0000-0000-0000000000e1
as_editor=(-c "set role authenticated" -c "set request.jwt.claim.sub = '$E'")
q -c "insert into route (id, signboard, is_loop, owner_id) values ('$R', 'Race Loop', true, '$E');
  insert into route_variant (id, route_id, owner_id, shape, signboards) values
  ('$V', '$R', '$E', '{\"type\":\"LineString\",\"coordinates\":[[121.2,14.7],[121.3,14.8]]}', '{old.svg}')" >/dev/null
draft() {
  q -c "insert into draft (kind, subject_id, is_new, status, payload, base_revision, editor_id)
    select 'route', '$R', false, 'pending', jsonb_build_object('version', 1,
      'route', jsonb_build_object('signboard', 'Race Loop', 'mode', 'jeepney', 'fare_note', 'payload', 'via', null,
        'head_stop_id', null, 'tail_stop_id', null, 'is_loop', true),
      'directions', jsonb_build_array(jsonb_build_object('id', '$V', 'reversed', false,
        'control_points', '[]'::jsonb, 'segments', '[]'::jsonb, 'overview', null, 'confidence', 'drawn',
        'shape', '{\"type\":\"LineString\",\"coordinates\":[[121.2,14.7],[121.4,14.9]]}'::jsonb,
        'signboards', '[\"new.svg\"]'::jsonb, 'links', '[]'::jsonb))), revision, '$E'
    from route where id = '$R' returning id"
}
reset() { q -c "delete from draft where subject_id = '$R'; update route set fare_note = null, via = null where id = '$R';
  update route_variant set signboards = '{old.svg}' where id = '$V'" >/dev/null; }
state() { q -c "select coalesce(fare_note, '-') || ' ' || coalesce(via, '-') || ' ' || array_to_string(v.signboards, ',')
  || ' ' || (select count(*) from draft where subject_id = '$R')
  from route r join route_variant v on v.route_id = r.id where r.id = '$R'"; }
fail=0

# 1. Live edit first (holds the route row), approval second: conflict, nothing applied.
D=$(draft)
(q -c "begin" -c "update route set via = 'live' where id = '$R'" -c "select pg_sleep(2)" -c "commit" >/dev/null) &
sleep 0.5
out=$(q "${as_editor[@]}" -c "select public.approve_draft('$D') ->> 'code'" 2>&1); wait
[ "$out" = conflict ] || { echo "FAILED: approval after a live edit answered: $out"; fail=1; }
[ "$(state)" = '- live old.svg 1' ] || { echo "FAILED: after conflict: $(state)"; fail=1; }

# 2. Approval first (holds the route row), live edit second: approval lands
#    whole, the later edit lands on top of it.
reset; D=$(draft)
(q "${as_editor[@]}" -c "begin" -c "select public.approve_draft('$D') ->> 'code'" -c "select pg_sleep(2)" -c "commit" > /tmp/race2.out 2>&1) &
sleep 0.5
q -c "update route set via = 'live' where id = '$R'" >/dev/null; wait
grep -qx approved /tmp/race2.out || { echo "FAILED: approval before a live edit: $(cat /tmp/race2.out)"; fail=1; }
[ "$(state)" = 'payload live new.svg 0' ] || { echo "FAILED: after approval then edit: $(state)"; fail=1; }

# 3. Two approvals of one draft: one approved, the other no_draft.
reset; D=$(draft)
(q "${as_editor[@]}" -c "begin" -c "select public.approve_draft('$D') ->> 'code'" -c "select pg_sleep(2)" -c "commit" > /tmp/race3.out 2>&1) &
sleep 0.5
out=$(q "${as_editor[@]}" -c "select public.approve_draft('$D') ->> 'code'" 2>&1); wait
{ grep -qx approved /tmp/race3.out && [ "$out" = no_draft ]; } \
  || { echo "FAILED: double approval answered $(cat /tmp/race3.out) / $out"; fail=1; }
[ "$(state)" = 'payload - new.svg 0' ] || { echo "FAILED: after double approval: $(state)"; fail=1; }

[ $fail = 0 ] && echo 'concurrency-0022: approval vs live edit (both orders) and double approval'
exit $fail
