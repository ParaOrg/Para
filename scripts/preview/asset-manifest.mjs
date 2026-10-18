import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, extname } from 'node:path';
const root = '/tmp/parapo-review-hosted';
const manifest = {};
function walk(dir, prefix = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['_headers', '_redirects'].includes(entry.name)) continue;
    const relative = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      walk(join(dir, entry.name), relative);
      continue;
    }
    const content = readFileSync(join(dir, entry.name));
    const hash = createHash('sha256')
      .update(content.toString('base64') + extname(entry.name).slice(1))
      .digest('hex')
      .slice(0, 32);
    manifest[relative] = { hash, size: content.length };
  }
}
walk(root);
writeFileSync('/tmp/parapo-review-assets.json', JSON.stringify({ manifest }));
console.log(`${Object.keys(manifest).length} preview assets prepared`);
