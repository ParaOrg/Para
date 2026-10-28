#!/usr/bin/env bash
# Fixed disposable container/database only. Never accepts a live database URL.
set -euo pipefail
cd "$(dirname "$0")/../.."
node scripts/preview/seed-review.mjs > /tmp/para-review-seed.sql
docker exec -i para-review-db psql -U postgres -d para_preview -v ON_ERROR_STOP=1 < /tmp/para-review-seed.sql > /tmp/para-review-seed.log
mkdir -p /tmp/para-review-publish/public
cp -a public/data /tmp/para-review-publish/public/
node --input-type=module - <<'JS'
import { readdirSync,readFileSync,writeFileSync } from 'node:fs';
const root='/tmp/para-review-publish/public/data';
for(const file of readdirSync(root).filter(f=>/^(index.*|map)\.json$/.test(f))){const json=JSON.parse(readFileSync(`${root}/${file}`));json.published_at=new Date().toISOString();writeFileSync(`${root}/${file}`,JSON.stringify(json));}
JS
node scripts/preview/seed-draft-examples.mjs > /tmp/para-review-examples.sql
docker exec -i para-review-db psql -U postgres -d para_preview -v ON_ERROR_STOP=1 < /tmp/para-review-examples.sql > /tmp/para-review-examples.log
