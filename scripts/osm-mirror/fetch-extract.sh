#!/usr/bin/env bash
# Fetches the Philippines extract for a build (.scratch/extract-mirror/plan.md, step 2): Para's own
# copy at osm.para-commute.org first, then Geofabrik, then openstreetmap.fr (mirror-file.mjs). Each
# with its .md5 first, time limits, and the md5 checked. Prints, on its last line, the URL of the
# extract's origin: for Para's copy, the source its record names, so a file built from it credits
# where the data came from. Exits 1, saying so, when no source gave it.
#
# Usage: scripts/osm-mirror/fetch-extract.sh <out.osm.pbf> [headers file]
#   the headers file, when given, gets the origin's Last-Modified as `last-modified: <date>`
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
out="${1:?Usage: fetch-extract.sh <out.osm.pbf> [headers file]}"
headers="${2:-/dev/null}"
dir="$(dirname "$out")"

sources="$(node --input-type=module -e "
import { MIRROR_KEYS, MIRROR_SOURCES, MIRROR_URL } from '$root/scripts/osm-mirror/mirror-file.mjs';
console.log(['Para', MIRROR_URL + '/' + MIRROR_KEYS.md5, MIRROR_URL + '/' + MIRROR_KEYS.extract].join(' '));
for (const s of MIRROR_SOURCES) console.log([s.name, s.md5, s.extract].join(' '));
")"

# One source, into $out. 0 when the file is there and matches its md5.
fetch() {
  local name="$1" md5_url="$2" url="$3"
  echo "Downloading $url" >&2
  if ! curl -fsSL --connect-timeout 30 --max-time 30 --retry 2 --retry-delay 10 \
    -o "$dir/extract.md5" "$md5_url"; then
    echo "$name did not give $md5_url." >&2
    return 1
  fi
  # Seven minutes a try is enough at 1.5 MB/s for the 615 MB file.
  if ! curl -fsSL --connect-timeout 30 --max-time 420 --retry 1 --retry-delay 10 \
    -D "$dir/extract-headers.txt" -o "$out" "$url"; then
    echo "$name did not give $url in time." >&2
    return 1
  fi
  local expected actual
  expected="$(cut -d' ' -f1 "$dir/extract.md5")"
  actual="$(md5sum "$out" | cut -d' ' -f1)"
  if [ "$expected" != "$actual" ]; then
    echo "$name's extract has md5 $actual, not the $expected it lists: a broken download." >&2
    return 1
  fi
}

while read -r name md5_url url; do
  if ! fetch "$name" "$md5_url" "$url"; then continue; fi
  if [ "$name" = Para ]; then
    # Para's copy: its record names the origin and the origin's Last-Modified, which R2's own
    # header (the upload's time) cannot.
    record="$(curl -fsSL --connect-timeout 30 --max-time 30 --retry 2 --retry-delay 10 \
      "${url%/*}/$(node --input-type=module -e "
import { MIRROR_KEYS } from '$root/scripts/osm-mirror/mirror-file.mjs';
console.log(MIRROR_KEYS.record);")")" || { echo "Para's copy has no record." >&2; continue; }
    origin="$(node --input-type=module -e "
import { readMirrorRecord } from '$root/scripts/osm-mirror/mirror-file.mjs';
const r = readMirrorRecord(process.argv[1]);
if (r.md5 !== process.argv[2]) throw new Error('The record is for another file: ' + r.md5);
console.log(r.source + ' ' + r.last_modified);
" "$record" "$(md5sum "$out" | cut -d' ' -f1)")" || { echo "Para's copy and its record disagree." >&2; continue; }
    read -r source_url last_modified <<<"$origin"
    echo "last-modified: $(date -u -d "$last_modified" '+%a, %d %b %Y %H:%M:%S GMT')" >"$headers"
  else
    source_url="$url"
    grep -i '^last-modified:' "$dir/extract-headers.txt" | tail -1 | tr -d '\r' >"$headers" || true
  fi
  echo "From $name; the extract's origin is $source_url." >&2
  echo "$source_url"
  exit 0
done <<<"$sources"

echo "::error::No source gave the Philippines extract (Para's copy, Geofabrik, openstreetmap.fr): each is named above. Run the workflow again later." >&2
exit 1
