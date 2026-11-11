#!/usr/bin/env bash
# Rebuilds the landmark file place search reads, public/data/landmarks.v1.json, and the
# footbridge file the map draws, public/data/footbridges.v1.json, and the major roads Go here's
# footbridge hint tests a walk against, public/data/major-roads.v1.json, from OpenStreetMap
# (.scratch/place-search/README.md, step 2; .scratch/footbridges, ticket 01; .scratch/go-here,
# ticket 05). Run it by hand or from the monthly workflow, then commit the files as a normal pull
# request. Commuters never reach
# OpenStreetMap: this runs once, here, and the app reads the committed files.
#
# One download: openstreetmap.fr's daily Metro Manila extract (about 60 MB), checked against its
# MD5. osmium keeps the tags place search lists (decision 6: malls, schools, universities,
# hospitals, churches, markets, transport stations, barangays and major streets; no shops or
# houses), and landmarks.mjs turns them into one point each.
#
# The data is ODbL: the file carries the licence and the credit in its first fields.
#
# Needs: curl, md5sum, Node 22 and osmium-tool (apt-get install osmium-tool), none of them an
# npm dependency.
# Usage: scripts/landmarks/build.sh [work dir]    the work dir defaults to a new temporary one
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
work="${1:-$(mktemp -d)}"
mkdir -p "$work"
source_url="$(node --input-type=module -e "import { LANDMARK_SOURCE } from '$root/scripts/landmarks/landmark-file.mjs'; console.log(LANDMARK_SOURCE)")"
extract="$work/metro-manila.osm.pbf"

echo "Downloading $source_url"
curl -fsSL --retry 3 --retry-delay 10 -o "$extract" "$source_url"
expected="$(curl -fsSL --retry 3 --retry-delay 10 "$source_url.md5" | cut -d' ' -f1)"
actual="$(md5sum "$extract" | cut -d' ' -f1)"
if [ "$expected" != "$actual" ]; then
  echo "The extract's MD5 is $actual, not the $expected the server lists: a broken download." >&2
  exit 1
fi
extract_at="$(osmium fileinfo -g header.option.timestamp "$extract")"
echo "Extract of $extract_at"

osmium tags-filter --overwrite "$extract" \
  nwr/shop=mall \
  nwr/amenity=school,university,college,hospital,place_of_worship,marketplace,bus_station,ferry_terminal \
  nwr/railway=station,halt \
  nwr/public_transport=station \
  r/boundary=administrative \
  w/highway=trunk,primary,secondary \
  -o "$work/filtered.osm.pbf"
osmium export --overwrite "$work/filtered.osm.pbf" -f geojsonseq --add-unique-id=type_id \
  -o "$work/features.geojsonseq"

node --experimental-strip-types "$root/scripts/landmarks/landmarks.mjs" "$work/features.geojsonseq" "$extract_at" \
  "$root/public/data/landmarks.v1.json"
node "$root/scripts/landmarks/check.mjs" "$root/public/data/landmarks.v1.json"

# The footbridges from the same download: footways on a bridge, the roads and rails they may
# cross, and the elevators and steps that lead up to them (footbridges.mjs).
osmium tags-filter --overwrite "$extract" \
  w/bridge \
  w/highway=motorway,motorway_link,trunk,trunk_link,primary,primary_link,secondary,secondary_link,tertiary,tertiary_link \
  w/railway=rail,light_rail,subway \
  n/highway=elevator,steps \
  -o "$work/footbridges.osm.pbf"
osmium export --overwrite "$work/footbridges.osm.pbf" -f geojsonseq --add-unique-id=type_id \
  -o "$work/footbridges.geojsonseq"
node "$root/scripts/footbridges/footbridges.mjs" "$work/footbridges.geojsonseq" "$extract_at" \
  "$root/public/data/footbridges.v1.json"
node "$root/scripts/footbridges/check.mjs" "$root/public/data/footbridges.v1.json"

# The major roads near the published hotspots, from the landmarks' own filter, which keeps the
# trunk, primary and secondary roads (major-roads.mjs).
node "$root/scripts/major-roads/major-roads.mjs" "$work/features.geojsonseq" "$extract_at" \
  "$root/public/data/major-roads.v1.json"
node "$root/scripts/major-roads/check.mjs" "$root/public/data/major-roads.v1.json"
