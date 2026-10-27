#!/usr/bin/env bash
# Fixed disposable container/database only. Never accepts a live database URL.
set -euo pipefail
cd "$(dirname "$0")/../.."
node scripts/preview/seed-review.mjs > /tmp/parapo-review-seed.sql
docker exec -i parapo-review-db psql -U postgres -d parapo_preview -v ON_ERROR_STOP=1 < /tmp/parapo-review-seed.sql > /tmp/parapo-review-seed.log
mkdir -p /tmp/parapo-review-publish/public
cp -a public/data /tmp/parapo-review-publish/public/
node --input-type=module - <<'JS'
import { readdirSync,readFileSync,writeFileSync } from 'node:fs';
const root='/tmp/parapo-review-publish/public/data';
for(const file of readdirSync(root).filter(f=>/^(index.*|map)\.json$/.test(f))){const json=JSON.parse(readFileSync(`${root}/${file}`));json.published_at=new Date().toISOString();writeFileSync(`${root}/${file}`,JSON.stringify(json));}
JS
node scripts/preview/seed-draft-examples.mjs > /tmp/parapo-review-examples.sql
docker exec -i parapo-review-db psql -U postgres -d parapo_preview -v ON_ERROR_STOP=1 < /tmp/parapo-review-examples.sql > /tmp/parapo-review-examples.log
