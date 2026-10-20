#!/usr/bin/env bash
# Two sends of one recording at once (a retry while the first is still in
# flight): one answers 'saved', the other waits for it and answers
# 'already saved'; one row, one set of points. Runs after contributions.sh.
set -euo pipefail
cd "$(dirname "$0")"
PSQL=${PSQL:?set PSQL to a psql command for a disposable server}
DB=${DB:-verify_contributions}
RID=33333333-0000-0000-0000-000000000001
PHONE=00000000-0000-0000-0000-0000000000c1
$PSQL -d "$DB" -qc "insert into auth.users (id, is_anonymous) values ('$PHONE', true) on conflict do nothing"
REC="jsonb_build_object('id','$RID','format_version',1,'rules_version',1,'consent_version',1,
  'started_at','2026-10-19T08:00:00Z','ended_at','2026-10-19T08:10:00Z','sent_at','2026-10-19T08:11:00Z',
  'distance_m',10,'moving_s',2,'standing_s',0,'lost_s',0,'point_count',2,'events','[]'::jsonb,'gaps','[]'::jsonb,
  'batches',jsonb_build_array(jsonb_build_object('seq',0,'first_at','2026-10-19T08:00:00Z','first_lat',14700000,
  'first_lng',121050000,'point_count',2,'dt_ms','[0,2000]'::jsonb,'dlat','[0,90]'::jsonb,'dlng','[0,0]'::jsonb,
  'accuracy_m','[5,5]'::jsonb)))"
send() {
  $PSQL -d "$DB" -qAt -v ON_ERROR_STOP=1 <<SQL
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '$PHONE', true) \g /dev/null
select public.save_contribution($REC);
select pg_sleep($1) \g /dev/null
commit;
SQL
}
send 2 > /tmp/contributions-race-1 & first=$!
sleep 0.5
send 0 > /tmp/contributions-race-2
wait $first
a=$(cat /tmp/contributions-race-1); b=$(cat /tmp/contributions-race-2)
[ "$a" = saved ] && [ "$b" = 'already saved' ] || { echo "FAILED: race answered '$a' and '$b'"; exit 1; }
n=$($PSQL -d "$DB" -qAt -c "select count(*) || '/' || (select count(*) from public.point_batch where contribution_id = '$RID') from public.contribution where id = '$RID'")
[ "$n" = 1/1 ] || { echo "FAILED: race left $n rows/batches"; exit 1; }
echo "contributions-race: two sends at once stored one recording ('$a', '$b')"
