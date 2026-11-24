#!/usr/bin/env bash
# Copies the Philippines extract into Para's own R2 bucket, `para-osm`, served read-only at
# https://osm.para-commute.org (.scratch/extract-mirror/plan.md), so the monthly builds stop
# depending on Geofabrik's day. Weekly, from .github/workflows/osm-mirror.yml.
#
# One source after another (mirror-file.mjs, MIRROR_SOURCES): Geofabrik, then openstreetmap.fr.
# From each: its .md5 first, so it cannot be newer than the file; then the file, with time limits,
# so a stalled server fails in minutes, not at the job's timeout. The file must match its md5. Then
# the record (philippines-latest.json): the source, its Last-Modified, the file's own header
# timestamp, size and md5. A copy the same as the one already in the bucket uploads nothing.
# If every source fails, the run fails and last week's copy stays.
#
# Needs: curl, md5sum, Node 22, osmium-tool and, to upload, the AWS CLI with OSM_R2_ENDPOINT,
# OSM_R2_BUCKET, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY set. None of them an npm dependency.
# Usage: scripts/osm-mirror/mirror.sh <work dir> [--upload]
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
work="${1:?Usage: mirror.sh <work dir> [--upload]}"
upload="${2:-}"
mkdir -p "$work"
cd "$work"

sources="$(node --input-type=module -e "
import { MIRROR_SOURCES } from '$root/scripts/osm-mirror/mirror-file.mjs';
for (const s of MIRROR_SOURCES) console.log([s.name, s.md5, s.extract].join(' '));
")"

# One source: its md5, then the file, checked. 0 when the copy is in ./extract.osm.pbf.
fetch() {
  local name="$1" md5_url="$2" url="$3"
  echo "Trying $name: $url"
  if ! curl -fsSL --connect-timeout 30 --max-time 30 --retry 2 --retry-delay 10 \
    -o extract.md5 "$md5_url"; then
    echo "$name did not give $md5_url." >&2
    return 1
  fi
  if ! curl -fsSL --connect-timeout 30 --max-time 300 --retry 2 --retry-delay 10 \
    -D headers.txt -o extract.osm.pbf "$url"; then
    echo "$name did not give $url in time." >&2
    return 1
  fi
  expected="$(cut -d' ' -f1 extract.md5)"
  actual="$(md5sum extract.osm.pbf | cut -d' ' -f1)"
  if [ "$expected" != "$actual" ]; then
    echo "$name's file has md5 $actual, not the $expected it lists: a broken download." >&2
    return 1
  fi
  source_url="$url"
}

source_url=''
while read -r name md5_url url; do
  if fetch "$name" "$md5_url" "$url"; then break; fi
done <<<"$sources"
if [ -z "$source_url" ]; then
  echo "::error::No source gave the Philippines extract. The copy in R2 is unchanged; run the workflow again later." >&2
  exit 1
fi

last_modified="$(grep -i '^last-modified:' headers.txt | tail -1 | cut -d' ' -f2- | tr -d '\r')"
extract_at="$(osmium fileinfo -g header.option.timestamp extract.osm.pbf || true)"
if [ -z "$extract_at" ]; then
  extract_at="$(osmium fileinfo -g header.option.osmosis_replication_timestamp extract.osm.pbf || true)"
fi
md5="$(md5sum extract.osm.pbf | cut -d' ' -f1)"
bytes="$(stat -c %s extract.osm.pbf)"
node "$root/scripts/osm-mirror/mirror-file.mjs" "$source_url" "$last_modified" "$extract_at" \
  "$bytes" "$md5" >record.json
echo "Copied from $source_url: extract of $extract_at, $bytes bytes, md5 $md5."

if [ "$upload" != --upload ]; then
  echo "Not uploading (no --upload)."
  exit 0
fi

# The copy in the bucket now, read through the public address: the same md5 means nothing to do.
current_md5="$(curl -fsS --max-time 30 "$(node --input-type=module -e "
import { MIRROR_URL, MIRROR_KEYS } from '$root/scripts/osm-mirror/mirror-file.mjs';
console.log(MIRROR_URL + '/' + MIRROR_KEYS.record);
")" 2>/dev/null | node -e "
let text = ''; process.stdin.on('data', (d) => (text += d)).on('end', () => {
  try { console.log(JSON.parse(text).md5 ?? ''); } catch { console.log(''); }
});" || true)"
if [ "$current_md5" = "$md5" ]; then
  echo "The bucket already holds this extract (md5 $md5): nothing uploaded."
  exit 0
fi

keys="$(node --input-type=module -e "
import { MIRROR_KEYS } from '$root/scripts/osm-mirror/mirror-file.mjs';
console.log(MIRROR_KEYS.extract, MIRROR_KEYS.md5, MIRROR_KEYS.record);
")"
read -r extract_key md5_key record_key <<<"$keys"
# The file and its md5 first, the record last: a build that sees the new record finds the new file.
put() {
  aws s3 cp "$1" "s3://$OSM_R2_BUCKET/$2" --endpoint-url "$OSM_R2_ENDPOINT" \
    --content-type "$3" --only-show-errors
}
put extract.osm.pbf "$extract_key" application/octet-stream
echo "$md5  $extract_key" >upload.md5
put upload.md5 "$md5_key" text/plain
put record.json "$record_key" application/json
echo "Uploaded $extract_key, $md5_key and $record_key to $OSM_R2_BUCKET."
