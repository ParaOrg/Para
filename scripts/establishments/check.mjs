// Reads an establishment file back and fails on anything the app could not use honestly: over
// its ceiling, a missing licence or credit, a row without an OSM id, a kind or a point, or a kind
// with almost nothing in it (the extract or the filter broke).
// Usage: node scripts/establishments/check.mjs [file]    defaults to public/data/establishments.v1.json
import { readFileSync } from 'node:fs';

import { ESTABLISHMENT_FILE_PATH, establishmentFileProblems } from './establishment-file.mjs';

const path = process.argv[2] ?? ESTABLISHMENT_FILE_PATH;
const text = readFileSync(path, 'utf8');
const problems = establishmentFileProblems(text);
if (problems.length > 0) {
  console.error(
    `${path} has ${problems.length} problems:\n- ${problems.slice(0, 20).join('\n- ')}`,
  );
  process.exit(1);
}
const { establishments } = JSON.parse(text);
console.error(
  `${path}: ${establishments.length} establishments, ${(Buffer.byteLength(text) / 1024).toFixed(0)} kB.`,
);
