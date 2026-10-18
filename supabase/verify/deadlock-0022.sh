#!/usr/bin/env bash
# Two approvals (or an approval and a take-down) that share rows, forced to
# interleave: a third session holds a direction row so the first approval
# stops part-way while the second starts. 0022 takes every lock in one order
# — the draft, then routes by id, then hotspots by id — before writing, so
# each pair must end in a machine code, never a deadlock or a bare error.
#   A. route approval adds hotspot S; hotspot approval of S links that route
#   B. two route approvals whose routes share terminal T
#   C. route approval ending at T; take-down of T
set -u
PSQL=${PSQL:?}
DB=${DB:?}
q() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -qAt "$@"; }
E=00000000-0000-0000-0000-0000000000e1
ed=(-c "set role authenticated" -c "set request.jwt.claim.sub = '$E'")
T=40000000-0000-0000-0000-0000000000a1; X=40000000-0000-0000-0000-0000000000a2
Y=40000000-0000-0000-0000-0000000000a3; S=40000000-0000-0000-0000-0000000000a4
R1=40000000-0000-0000-0000-0000000000b1; V1=40000000-0000-0000-0000-0000000000c1
R2=40000000-0000-0000-0000-0000000000b2; V2=40000000-0000-0000-0000-0000000000c2
pt='{"type":"Point","coordinates":[121.1,14.6]}'
line='{"type":"LineString","coordinates":[[121.1,14.6],[121.2,14.7]]}'
q -c "insert into stop (id, name, kind, point, owner_id) values
  ('$T', 'Deadlock Terminal', 'terminal', '$pt', '$E'), ('$X', 'Deadlock X', 'hintuan', '$pt', '$E'),
  ('$Y', 'Deadlock Y', 'hintuan', '$pt', '$E'), ('$S', 'Deadlock S', 'hintuan', '$pt', '$E');
  insert into route (id, signboard, head_stop_id, tail_stop_id, owner_id) values
  ('$R1', 'T–X', '$T', '$X', '$E'), ('$R2', 'T–Y', '$T', '$Y', '$E');
  insert into route_variant (id, route_id, owner_id, shape) values ('$V1', '$R1', '$E', '$line'), ('$V2', '$R2', '$E', '$line');
  insert into route_stop values ('$V1', '$T', 0), ('$V1', '$X', 1), ('$V2', '$T', 0), ('$V2', '$Y', 1);
  create schema if not exists verify;
  -- A pending draft of the route as it is now, with fare_note set and extra
  -- links appended to its one direction.
  create or replace function verify.route_draft(r uuid, extra jsonb) returns uuid language sql as \$\$
    insert into public.draft (kind, subject_id, is_new, status, payload, base_revision, editor_id)
    select 'route', r.id, false, 'pending', jsonb_build_object('version', 1,
      'route', jsonb_build_object('signboard', r.signboard, 'mode', r.mode, 'fare_note', 'drafted', 'via', r.via,
        'head_stop_id', r.head_stop_id, 'tail_stop_id', r.tail_stop_id, 'is_loop', r.is_loop),
      'directions', (select jsonb_agg(jsonb_build_object('id', v.id, 'reversed', v.reversed, 'shape', v.shape,
          'control_points', v.control_points, 'segments', v.segments, 'overview', v.overview,
          'signboards', to_jsonb(v.signboards), 'confidence', v.confidence,
          'links', coalesce((select jsonb_agg(jsonb_build_object('stop_id', l.stop_id, 'stop_sequence', l.stop_sequence))
                             from public.route_stop l where l.route_variant_id = v.id), '[]') || extra))
        from public.route_variant v where v.route_id = r.id)), r.revision, '$E'
    from public.route r where r.id = route_draft.r returning id \$\$;
  create or replace function verify.hotspot_draft(s uuid, links jsonb) returns uuid language sql as \$\$
    insert into public.draft (kind, subject_id, is_new, status, payload, base_revision, editor_id)
    select 'hotspot', s.id, false, 'pending', jsonb_build_object('version', 1,
      'stop', jsonb_build_object('name', s.name, 'informal', s.informal, 'aliases', to_jsonb(s.aliases), 'kind', s.kind,
        'note', 'drafted', 'area', s.area, 'point', s.point, 'line', s.line), 'links', links), s.revision, '$E'
    from public.stop s where s.id = hotspot_draft.s returning id \$\$" >/dev/null
hold() { q -c "begin" -c "select 1 from route_variant where id in ($1) for no key update" -c "select pg_sleep(2)" -c "commit" >/dev/null; }
approve() { q "${ed[@]}" -c "select public.approve_draft('$1') ->> 'code'" > "$2" 2>&1; }
fail=0
check() {  # name, file, expected
  got=$(tr '\n' ' ' < "$2" | sed 's/ $//')
  [ "$got" = "$3" ] || { echo "FAILED: $1: expected $3, got: $got"; fail=1; }
}

# A.
q -c "delete from draft where subject_id in ('$R1', '$R2', '$S')" >/dev/null
DA=$(q -c "select verify.route_draft('$R1', '[{\"stop_id\":\"$S\",\"stop_sequence\":2}]')")
DB_=$(q -c "select verify.hotspot_draft('$S', '[{\"route_variant_id\":\"$V1\",\"stop_sequence\":7}]')")
hold "'$V1'" & sleep 0.3
approve "$DA" /tmp/dl-a1 & sleep 0.3
approve "$DB_" /tmp/dl-a2 & wait
check 'A route approval' /tmp/dl-a1 approved
check 'A hotspot approval after it' /tmp/dl-a2 conflict

# B.
q -c "delete from draft where subject_id in ('$R1', '$R2', '$S')" >/dev/null
DA=$(q -c "select verify.route_draft('$R1', '[]')")
DB_=$(q -c "select verify.route_draft('$R2', '[]')")
hold "'$V1', '$V2'" & sleep 0.3
approve "$DA" /tmp/dl-b1 & sleep 0.3
approve "$DB_" /tmp/dl-b2 & wait
check 'B first route on T' /tmp/dl-b1 approved
check 'B second route on T' /tmp/dl-b2 approved

# C.
q -c "delete from draft where subject_id in ('$R1', '$R2', '$S')" >/dev/null
DA=$(q -c "select verify.route_draft('$R1', '[]')")
hold "'$V1'" & sleep 0.3
approve "$DA" /tmp/dl-c1 & sleep 0.3
q "${ed[@]}" -c "select public.take_down('hotspot', '$T') ->> 'code'" > /tmp/dl-c2 2>&1 & wait
check 'C route approval' /tmp/dl-c1 approved
check 'C take-down of its terminal' /tmp/dl-c2 blocked

bad=$(q -c "select count(*) from route r join stop s on s.id in (r.head_stop_id, r.tail_stop_id) where r.status = 'approved' and s.status = 'taken_down'")
[ "$bad" = 0 ] || { echo "FAILED: $bad approved routes end at taken-down hotspots"; fail=1; }
[ $fail = 0 ] && echo 'deadlock-0022: route/hotspot, shared terminal, take-down: no deadlock, every answer a code'
exit $fail
