#!/usr/bin/env bash
# What the phone sends is what the database takes: rides packed by the
# contributor page's code (contributions-pack.mjs), with a jump, a repeated
# fix and one outside the Philippines among them, are saved whole by
# save_contribution, and their points add back up to what was packed.
# Runs after contributions.sh, on its database.
set -euo pipefail
cd "$(dirname "$0")"
PSQL=${PSQL:?set PSQL to a psql command for a disposable server}
DB=${DB:-verify_contributions}
ROOT=$(cd ../.. && pwd)
PHONE=00000000-0000-0000-0000-0000000000d1
$PSQL -d "$DB" -qc "insert into auth.users (id, is_anonymous) values ('$PHONE', true) on conflict do nothing"
for count in 1300 7200; do
  id=$(node -e 'console.log(crypto.randomUUID())')
  json=$(cd "$ROOT" && node --no-warnings --experimental-strip-types --import ./scripts/node/ts-resolve.mjs supabase/verify/contributions-pack.mjs "$id" "$count")
  want=$(node -e 'const p=JSON.parse(process.argv[1]); const b=p.batches.at(-1); let lat=b.first_lat; b.dlat.forEach((d,i)=>{ if(i) lat+=d }); console.log(p.point_count+"|"+p.hintos.length+"|"+lat)' "$json")
  answer=$(printf '%s' "$json" | $PSQL -d "$DB" -qAt -v ON_ERROR_STOP=1 \
    -c "set role authenticated" -c "select set_config('request.jwt.claim.sub', '$PHONE', false)" \
    -c "create temp table j (v text)" -c "copy j from stdin" -c "select public.save_contribution(v::jsonb) from j" 2>&1 | tail -1 || true)
  [ "$answer" = saved ] || { echo "FAILED: packed ride of $count fixes: $answer"; exit 1; }
  got=$($PSQL -d "$DB" -qAt -c "
    select c.point_count || '|' || (select count(*) from public.hinto h where h.contribution_id = c.id) || '|' ||
      (select b.first_lat + coalesce((select sum(x) from unnest(b.dlat) x), 0)
       from public.point_batch b where b.contribution_id = c.id order by b.seq desc limit 1)
    from public.contribution c where c.id = '$id'")
  [ "$got" = "$want" ] || { echo "FAILED: stored $got, packed $want"; exit 1; }
done
echo "contributions-pack: the phone's packed rides (1,300 and 7,200 fixes, with faults) saved whole, points add up"
