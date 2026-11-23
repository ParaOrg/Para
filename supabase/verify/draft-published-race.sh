#!/usr/bin/env bash
# Two sessions race publish_draft against a live edit of its route (both orders), against a second
# publish of the same draft, and against unpublish of the same route (both orders). Publishing
# either lands whole or leaves the route as the other session left it, and nothing deadlocks.
#   PSQL=... DB=... bash supabase/verify/draft-published-race.sh   (after the migration is applied)
set -u
PSQL=${PSQL:?}
DB=${DB:?}
q() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -qAt "$@"; }
R=21000000-0000-0000-0000-0000000000f1
V=21000000-0000-0000-0000-0000000000f2
E=00000000-0000-0000-0000-0000000000e1
as_editor=(-c "set role authenticated" -c "set request.jwt.claim.sub = '$E'")
q -c "insert into auth.users (id, is_anonymous) select '$E', false where not exists (select 1 from auth.users where id = '$E');
  insert into private.editor (user_id) select '$E' where not exists (select 1 from private.editor where user_id = '$E');
  insert into route (id, signboard, is_loop, owner_id) values ('$R', 'Publish Race Loop', true, '$E');
  insert into route_variant (id, route_id, owner_id, shape, signboards) values
  ('$V', '$R', '$E', '{\"type\":\"LineString\",\"coordinates\":[[121.2,14.7],[121.3,14.8]]}', '{old.svg}')" >/dev/null
draft() {
  q -c "insert into draft (kind, subject_id, is_new, payload, base_revision, editor_id)
    select 'route', '$R', false, jsonb_build_object('version', 1,
      'route', jsonb_build_object('signboard', 'Publish Race Loop', 'mode', 'jeepney', 'fare_note', 'payload', 'via', null,
        'head_stop_id', null, 'tail_stop_id', null, 'is_loop', true),
      'directions', jsonb_build_array(jsonb_build_object('id', '$V', 'reversed', false,
        'control_points', '[]'::jsonb, 'segments', '[]'::jsonb, 'overview', null, 'confidence', 'drawn',
        'shape', '{\"type\":\"LineString\",\"coordinates\":[[121.2,14.7],[121.4,14.9]]}'::jsonb,
        'signboards', '[\"new.svg\"]'::jsonb, 'links', '[]'::jsonb))), revision, '$E'
    from route where id = '$R' returning id || ' ' || revision"
}
reset() { q -c "delete from draft where subject_id = '$R'; update route set fare_note = null, via = null, status = 'approved' where id = '$R';
  update route_variant set signboards = '{old.svg}' where id = '$V'" >/dev/null; }
state() { q -c "select coalesce(fare_note, '-') || ' ' || coalesce(via, '-') || ' ' || array_to_string(v.signboards, ',')
  || ' ' || r.status || ' ' || (select count(*) from draft where subject_id = '$R')
  from route r join route_variant v on v.route_id = r.id where r.id = '$R'"; }
publish() { echo "select public.publish_draft('${1% *}', ${1#* }) ->> 'code'"; }
fail=0

# 1. Live edit first (holds the route row), publish second: conflict, nothing applied.
D=$(draft)
(q -c "begin" -c "update route set via = 'live' where id = '$R'" -c "select pg_sleep(2)" -c "commit" >/dev/null) &
sleep 0.5
out=$(q "${as_editor[@]}" -c "$(publish "$D")" 2>&1); wait
[ "$out" = conflict ] || { echo "FAILED: publish after a live edit answered: $out"; fail=1; }
[ "$(state)" = '- live old.svg approved 1' ] || { echo "FAILED: after conflict: $(state)"; fail=1; }

# 2. Publish first (holds the draft and the route), live edit second: the publish lands whole,
#    the edit on top of it.
reset; D=$(draft)
(q "${as_editor[@]}" -c "begin" -c "$(publish "$D")" -c "select pg_sleep(2)" -c "commit" > /tmp/dp-race2.out 2>&1) &
sleep 0.5
q -c "update route set via = 'live' where id = '$R'" >/dev/null; wait
grep -qx approved /tmp/dp-race2.out || { echo "FAILED: publish before a live edit: $(cat /tmp/dp-race2.out)"; fail=1; }
[ "$(state)" = 'payload live new.svg approved 0' ] || { echo "FAILED: after publish then edit: $(state)"; fail=1; }

# 3. Two publishes of one draft: one approved, the other no_draft.
reset; D=$(draft)
(q "${as_editor[@]}" -c "begin" -c "$(publish "$D")" -c "select pg_sleep(2)" -c "commit" > /tmp/dp-race3.out 2>&1) &
sleep 0.5
out=$(q "${as_editor[@]}" -c "$(publish "$D")" 2>&1); wait
{ grep -qx approved /tmp/dp-race3.out && [ "$out" = no_draft ]; } \
  || { echo "FAILED: double publish answered $(cat /tmp/dp-race3.out) / $out"; fail=1; }
[ "$(state)" = 'payload - new.svg approved 0' ] || { echo "FAILED: after double publish: $(state)"; fail=1; }

# 4. Publish first, unpublish second: published, then taken down with a draft of what was published.
reset; D=$(draft)
(q "${as_editor[@]}" -c "begin" -c "$(publish "$D")" -c "select pg_sleep(2)" -c "commit" > /tmp/dp-race4.out 2>&1) &
sleep 0.5
out=$(q "${as_editor[@]}" -c "select public.unpublish('route', '$R') ->> 'code'" 2>&1); wait
{ grep -qx approved /tmp/dp-race4.out && [ "$out" = unpublished ]; } \
  || { echo "FAILED: publish then unpublish answered $(cat /tmp/dp-race4.out) / $out"; fail=1; }
[ "$(state)" = 'payload - new.svg taken_down 1' ] || { echo "FAILED: after publish then unpublish: $(state)"; fail=1; }
held=$(q -c "select d.payload -> 'route' ->> 'fare_note' from draft d where d.subject_id = '$R'")
[ "$held" = payload ] || { echo "FAILED: the draft unpublish left holds $held, not what was published"; fail=1; }

# 5. Unpublish first (holds the draft and the route), publish second: the draft is rebased under
#    the publish, which answers revision_mismatch; the route stays down with the draft kept.
reset; D=$(draft)
(q "${as_editor[@]}" -c "begin" -c "select public.unpublish('route', '$R') ->> 'code'" -c "select pg_sleep(2)" -c "commit" > /tmp/dp-race5.out 2>&1) &
sleep 0.5
out=$(q "${as_editor[@]}" -c "$(publish "$D")" 2>&1); wait
{ grep -qx unpublished /tmp/dp-race5.out && [ "$out" = revision_mismatch ]; } \
  || { echo "FAILED: unpublish then publish answered $(cat /tmp/dp-race5.out) / $out"; fail=1; }
[ "$(state)" = '- - old.svg taken_down 1' ] || { echo "FAILED: after unpublish then publish: $(state)"; fail=1; }

q -c "delete from draft where subject_id = '$R'; delete from route where id = '$R'" >/dev/null
[ $fail = 0 ] && echo 'draft_published races: publish vs live edit (both orders), double publish, publish vs unpublish (both orders)'
exit $fail
