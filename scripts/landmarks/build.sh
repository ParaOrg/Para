#!/usr/bin/env bash
# Rebuilds the landmark file place search reads, public/data/landmarks.v1.json, the
# footbridge file the map draws, public/data/footbridges.v1.json, and the establishment files,
# public/data/establishments/v1/ (.scratch/establishments, step E3a), from OpenStreetMap
# (.scratch/place-search/README.md, step 2; .scratch/footbridges, ticket 01). Run it by hand or
# from the monthly workflow, then commit the files as a normal pull request. Commuters never reach
# OpenStreetMap: this runs once, here, and the app reads the committed files.
#
# One download: the Philippines extract (about 600 MB), from Para's own copy at osm.para-commute.org,
# or else Geofabrik or openstreetmap.fr (scripts/osm-mirror/fetch-extract.sh), checked against its
# MD5, then cut to the map's panning box (scripts/tiles/area.mjs, METRO_MANILA), so the provinces
# the map reaches past Metro Manila's line are in it. osmium keeps the tags place search lists (decision 6:
# malls, schools, universities, hospitals, churches, markets, transport stations, barangays and
# major streets; no shops or houses), and landmarks.mjs turns them into one point each. Geofabrik
# is reachable from GitHub's runners, not from the agents' containers: the build runs in Actions.
#
# The OSM data is ODbL: each file carries the licence and the credit in its first fields. The
# Overture files carry Overture's licences instead, with their texts beside them.
#
# Needs: curl, md5sum, Node 22, osmium-tool (apt-get install osmium-tool) and, for Overture,
# Python 3 with duckdb (pip install duckdb; OVERTURE_PYTHON names another Python, such as a virtual
# environment's), none of them an npm dependency.
# Usage: scripts/landmarks/build.sh [work dir]    the work dir defaults to a new temporary one
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
work="${1:-$(mktemp -d)}"
mkdir -p "$work"
download="$work/philippines.osm.pbf"
extract="$work/panning-box.osm.pbf"

# Para's own copy first, then Geofabrik, then openstreetmap.fr, each checked against its md5
# (scripts/osm-mirror/fetch-extract.sh). The files the build writes credit the extract's origin.
EXTRACT_SOURCE="$("$root/scripts/osm-mirror/fetch-extract.sh" "$download")"
export EXTRACT_SOURCE
# Geofabrik names the data's moment as the replication timestamp; an extract may carry either.
extract_at="$(osmium fileinfo -g header.option.timestamp "$download" || true)"
if [ -z "$extract_at" ]; then
  extract_at="$(osmium fileinfo -g header.option.osmosis_replication_timestamp "$download" || true)"
fi
if [ -z "$extract_at" ]; then
  echo "The extract names no timestamp in its header." >&2
  exit 1
fi
echo "Extract of $extract_at"
box="$(node "$root/scripts/tiles/area.mjs")"
echo "Cut to the panning box $box"
osmium extract --overwrite -b "$box" "$download" -o "$extract"

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

# The terminals from the same download (.scratch/terminals): OSM's jeepney, UV Express and bus
# terminals, and the transport terminals it names but does not type, one row each
# (terminal-file.mjs). The writer checks the file and fails the build on one not to trust.
osmium tags-filter --overwrite "$extract" \
  $(node "$root/scripts/terminals/terminals.mjs" --filter) -o "$work/terminals.osm.pbf"
osmium export --overwrite "$work/terminals.osm.pbf" -f geojsonseq --add-unique-id=type_id \
  -o "$work/terminals.geojsonseq"
node "$root/scripts/terminals/terminals.mjs" "$work/terminals.geojsonseq" "$extract_at" \
  "$root/public/data/terminals.v1.json"

# The establishments from the same download (.scratch/establishments, step E3a): the shops,
# banks, ATMs, eateries and the like, an index and a file per area cell (establishments.mjs).
osmium tags-filter --overwrite "$extract" \
  $(node --experimental-strip-types "$root/scripts/establishments/establishments.mjs" --filters) \
  -o "$work/establishments.osm.pbf"
osmium export --overwrite "$work/establishments.osm.pbf" -f geojsonseq --add-unique-id=type_id \
  -o "$work/establishments.geojsonseq"
node --experimental-strip-types "$root/scripts/establishments/establishments.mjs" \
  "$work/establishments.geojsonseq" "$extract_at" "$root/public/data/establishments/v1"
node --experimental-strip-types "$root/scripts/establishments/check.mjs" \
  "$root/public/data/establishments/v1"

# Overture's eateries, cafés, clinics and schools (.scratch/establishments, step E3c), in files of
# their own under Overture's licences: the latest release from its public bucket (pull.py, with
# duckdb from pip), less the points on a road's centre line (the roads from the same extract) and
# the places the OSM files just written already have (overture.mjs).
osmium tags-filter --overwrite "$extract" \
  $(node --experimental-strip-types "$root/scripts/overture/overture.mjs" --roads) \
  -o "$work/roads.osm.pbf"
osmium export --overwrite "$work/roads.osm.pbf" -f geojsonseq -o "$work/roads.geojsonseq"
# The places to stay the basemap already labels (OSM's tourism=hotel and kin): an Overture hotel
# of the same name near one is left to the basemap's label.
osmium tags-filter --overwrite "$extract" \
  $(node --experimental-strip-types "$root/scripts/overture/overture.mjs" --lodging) \
  -o "$work/lodging.osm.pbf"
osmium export --overwrite "$work/lodging.osm.pbf" -f geojsonseq -o "$work/lodging.geojsonseq"
"${OVERTURE_PYTHON:-python3}" -I "$root/scripts/overture/pull.py" "$box" "$work/overture.ndjson"
(cd "$root" && node --experimental-strip-types scripts/overture/overture.mjs \
  "$work/overture.ndjson" "$work/roads.geojsonseq" public/data/overture/v1 \
  "$work/lodging.geojsonseq")
node --experimental-strip-types "$root/scripts/overture/check.mjs" \
  "$root/public/data/overture/v1" "$root/public/data/establishments/v1"

# The studio's search files (scripts/search/): every Overture store and eatery, drawn or not, from
# the same release, and the named OSM establishments just written, one file each by licence. The
# writer checks each and fails the build on a broken one.
release="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$root/public/data/overture/v1/index.json','utf8')).release)")"
"${OVERTURE_PYTHON:-python3}" -I "$root/scripts/search/pull-search.py" "$box" "$work/search.ndjson" "$release"
(cd "$root" && node --experimental-strip-types scripts/search/search-file.mjs \
  "$work/search.ndjson" public/data/search/v1)
