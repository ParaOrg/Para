#!/usr/bin/env bash
# Builds the tiles: fetches Planetiler and Geofabrik's Philippines extract, each checked against its
# checksum, then runs Planetiler's OpenMapTiles profile over the box. Runs in GitHub Actions
# (Geofabrik and Maven are not reachable from the agents' containers).
# Usage: scripts/tiles/build.sh <work dir> <bounds> <build date YYYY-MM-DD>
# Environment: PLANETILER_VERSION, PLANETILER_SHA256.
# Writes <work dir>/parapo.pmtiles and <work dir>/extract-date.txt (the extract's date).
set -euo pipefail

work="$1"
bounds="$2"
build_date="$3"
mkdir -p "$work"
cd "$work"

curl -fsSL -o planetiler.jar \
  "https://github.com/onthegomap/planetiler/releases/download/v${PLANETILER_VERSION}/planetiler.jar"
echo "${PLANETILER_SHA256}  planetiler.jar" | sha256sum -c -

curl -fsSL -D extract-headers.txt -o philippines-latest.osm.pbf \
  https://download.geofabrik.de/asia/philippines-latest.osm.pbf
curl -fsSL -o philippines-latest.osm.pbf.md5 https://download.geofabrik.de/asia/philippines-latest.osm.pbf.md5
md5sum -c philippines-latest.osm.pbf.md5
last_modified="$(grep -i '^last-modified:' extract-headers.txt | cut -d' ' -f2- | tr -d '\r')"
date -u -d "$last_modified" +%F > extract-date.txt
echo "Extract: $(cat extract-date.txt), $(stat -c %s philippines-latest.osm.pbf) bytes"

# The build date goes into the file's metadata as its version, where check.mjs reads it back.
# data/sources holds Planetiler's own downloads (water polygons, Natural Earth, lake centerlines),
# which the workflow caches.
java -Xmx8g -jar planetiler.jar \
  --osm-path=philippines-latest.osm.pbf \
  --bounds="$bounds" \
  --maxzoom=14 \
  --download \
  --archive_version="$build_date" \
  --output=parapo.pmtiles \
  --tmpdir=planetiler-tmp \
  --force
