#!/usr/bin/env bash
# Uploads a checked build to R2 through its S3 API: the tiles file, then the basemap assets, then
# `current.json` last so a failed upload never points at a half file. Keeps the last 3 builds.
# Usage: scripts/tiles/upload.sh <parapo-YYYY-MM-DD-RUNID.pmtiles> <current.json> <assets dir>
# Environment: TILES_R2_ENDPOINT, TILES_R2_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.
# Prints sizes and counts only, never the secrets.
set -euo pipefail

pmtiles="$1"
pointer="$2"
assets="$3"
KEEP=3
export AWS_DEFAULT_REGION=auto
s3() { aws "$@" --endpoint-url "$TILES_R2_ENDPOINT"; }

name="$(basename "$pmtiles")"
size="$(stat -c %s "$pmtiles")"
# A name is never reused: the Worker and Cloudflare's cache key tiles on it, and new bytes under an
# old name would be read at the old offsets.
existing="$(s3 s3api list-objects-v2 --bucket "$TILES_R2_BUCKET" --prefix "tiles/$name" \
  --query 'Contents[].Key' --output text)"
if [ "$existing" != "None" ] && [ -n "$existing" ]; then
  echo "::error::tiles/$name is already in the bucket. Refusing to overwrite it; nothing was changed."
  exit 1
fi
s3 s3 cp "$pmtiles" "s3://$TILES_R2_BUCKET/tiles/$name" --only-show-errors
uploaded="$(s3 s3api head-object --bucket "$TILES_R2_BUCKET" --key "tiles/$name" \
  --query ContentLength --output text)"
if [ "$uploaded" != "$size" ]; then
  echo "::error::The bucket holds $uploaded bytes of tiles/$name, the local file $size. current.json was not moved."
  exit 1
fi
echo "Uploaded tiles/$name: $uploaded bytes"

s3 s3 sync "$assets" "s3://$TILES_R2_BUCKET/assets/" --only-show-errors
echo "Synced the assets: $(find "$assets" -type f | wc -l) files"

s3 s3 cp "$pointer" "s3://$TILES_R2_BUCKET/tiles/current.json" \
  --content-type application/json --cache-control 'no-cache' --only-show-errors
echo "Moved tiles/current.json to $name"

# Only now that current.json has moved. Names carry the date, then the run id, so a version sort
# orders them by age; the file just uploaded is the newest and never listed.
old="$(s3 s3api list-objects-v2 --bucket "$TILES_R2_BUCKET" --prefix tiles/parapo- \
  --query 'Contents[].Key' --output text | tr '\t' '\n' | grep -E '^tiles/parapo-[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]+\.pmtiles$' \
  | grep -vx "tiles/$name" | sort -V | head -n "-$((KEEP - 1))" || true)"
for key in $old; do
  s3 s3 rm "s3://$TILES_R2_BUCKET/$key" --only-show-errors
  echo "Deleted $key"
done
