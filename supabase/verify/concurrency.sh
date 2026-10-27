#!/usr/bin/env bash
# Two sessions race an approval against a take-down of one of its ends, both
# orders. Neither may end with an approved route on a taken-down hotspot.
set -u
PSQL=${PSQL:?}
DB=${DB:?}
q() { $PSQL -d "$DB" -v ON_ERROR_STOP=1 -qAt "$@"; }
q -c "insert into route (id, signboard, head_stop_id, tail_stop_id, status, owner_id) values
  ('20000000-0000-0000-0000-000000000004', 'A–D', '10000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000d', 'taken_down', '00000000-0000-0000-0000-0000000000e1'),
  ('20000000-0000-0000-0000-000000000005', 'B–E', '10000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000e', 'taken_down', '00000000-0000-0000-0000-0000000000e1')"
fail=0
# 1. Approval first (holds its ends FOR SHARE), take-down second.
(q -c "begin; update route set status = 'approved' where id = '20000000-0000-0000-0000-000000000004'; select pg_sleep(2); commit;") &
sleep 0.5
out=$(q -c "update stop set status = 'taken_down' where id = '10000000-0000-0000-0000-00000000000d'" 2>&1); wait
echo "$out" | grep -q stop_takedown_guard || echo "$out" | grep -q "can't be taken down" || { echo "FAILED: take-down after approval: $out"; fail=1; }
# 2. Take-down first (holds the hotspot's row), approval second.
(q -c "begin; update stop set status = 'taken_down' where id = '10000000-0000-0000-0000-00000000000e'; select pg_sleep(2); commit;") &
sleep 0.5
out=$(q -c "update route set status = 'approved' where id = '20000000-0000-0000-0000-000000000005'" 2>&1); wait
echo "$out" | grep -q "both its ends approved" || { echo "FAILED: approval after take-down: $out"; fail=1; }
bad=$(q -c "select count(*) from route r join stop s on s.id in (r.head_stop_id, r.tail_stop_id) where r.status = 'approved' and s.status = 'taken_down'")
[ "$bad" = 0 ] || { echo "FAILED: $bad approved routes end at taken-down hotspots"; fail=1; }
[ $fail = 0 ] && echo 'concurrency: both orders refused'
exit $fail
