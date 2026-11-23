// Reads the footbridge file back and fails on anything the map could not use honestly: over its
// ceiling, a missing licence or credit, a footbridge without a way id or lines, a broken access
// point, or almost no footbridges at all (the extract or the filter broke).
// Usage: node scripts/footbridges/check.mjs [file]    defaults to public/data/footbridges.v1.json
import { readFileSync } from 'node:fs';

import { FOOTBRIDGE_FILE_PATH, footbridgeFileProblems } from './footbridge-file.mjs';

const path = process.argv[2] ?? FOOTBRIDGE_FILE_PATH;
const text = readFileSync(path, 'utf8');
const problems = footbridgeFileProblems(text);
if (problems.length > 0) {
  console.error(
    `${path} has ${problems.length} problems:\n- ${problems.slice(0, 20).join('\n- ')}`,
  );
  process.exit(1);
}
const { footbridges } = JSON.parse(text);
console.error(
  `${path}: ${footbridges.length} footbridges, ${(Buffer.byteLength(text) / 1024).toFixed(0)} kB.`,
);
