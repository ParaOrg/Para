// Builds the studio's old Para route files (old-para-route-file.mjs) from the source file beside
// this script, and fails on a route not to trust. The directory is rewritten whole. The source
// never refreshes, so a build is run once, and again only if the file format changes;
// tests/unit/old-para-route-file-test.mjs proves the committed files are this build's.
//
//   node scripts/old-para-routes/old-para-routes.mjs [out dir]
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  OLD_PARA_ROUTE_DIR,
  OLD_PARA_SOURCE,
  oldParaRouteFiles,
  oldParaRouteProblems,
  oldParaRoutesFrom,
} from './old-para-route-file.mjs';

const out = process.argv[2] ?? OLD_PARA_ROUTE_DIR;
const source = readFileSync(OLD_PARA_SOURCE, 'utf8');
const problems = oldParaRouteProblems(oldParaRoutesFrom(source));
for (const problem of problems) console.error(`${OLD_PARA_SOURCE}: ${problem}`);
if (problems.length > 0) process.exit(1);

const files = oldParaRouteFiles(source);
mkdirSync(out, { recursive: true });
for (const name of readdirSync(out)) if (name.endsWith('.json')) rmSync(join(out, name));
for (const [name, text] of files) writeFileSync(join(out, name), text);
const bytes = (texts) => Math.round(texts.reduce((sum, [, text]) => sum + text.length, 0) / 1024);
console.error(
  `Wrote ${out}: index ${bytes(files.slice(0, 1))} kB, ${files.length - 1} route files ` +
    `${bytes(files.slice(1))} kB.`,
);
