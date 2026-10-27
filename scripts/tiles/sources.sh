#!/usr/bin/env bash
# Keeps a copy of Planetiler's own downloads (water polygons, Natural Earth, lake centerlines) in
# R2 under build-cache/sources/, so one third-party outage cannot fail a build. `pull` runs before
# the build and Planetiler downloads whatever is still missing from upstream; `push` runs after a
# good build and refreshes the copy. A failure here only warns: the build can still go to upstream.
# To refresh the copy from upstream, delete build-cache/ in the bucket.
# Usage: scripts/tiles/sources.sh pull|push <dir Planetiler reads: <work dir>/data/sources>
# Environment: TILES_R2_ENDPOINT, TILES_R2_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.
set -uo pipefail

direction="$1"
dir="$2"
export AWS_DEFAULT_REGION=auto
remote="s3://$TILES_R2_BUCKET/build-cache/sources/"
mkdir -p "$dir"

case "$direction" in
  pull) aws s3 sync "$remote" "$dir" --endpoint-url "$TILES_R2_ENDPOINT" --only-show-errors ;;
  push) aws s3 sync "$dir" "$remote" --endpoint-url "$TILES_R2_ENDPOINT" --only-show-errors ;;
  *) echo "usage: sources.sh pull|push <dir>" >&2; exit 2 ;;
esac
status=$?
if [ "$status" -ne 0 ]; then
  echo "::warning::Could not $direction the R2 copy of Planetiler's downloads (exit $status); the build uses upstream."
fi
echo "Sources ($direction): $(find "$dir" -type f | wc -l) files, $(du -sh "$dir" | cut -f1)"
exit 0
