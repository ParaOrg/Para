// Reads the major-roads file back and fails on anything the footbridge hint could not use
// honestly: over its ceiling, a missing licence or credit, a road without a kind or lines, or
// almost no roads at all (the extract or the filter broke).
// Usage: node scripts/major-roads/check.mjs [file]    defaults to public/data/major-roads.v1.json
import { readFileSync } from 'node:fs';

import { MAJOR_ROAD_FILE_PATH, majorRoadFileProblems } from './major-road-file.mjs';

const path = process.argv[2] ?? MAJOR_ROAD_FILE_PATH;
const text = readFileSync(path, 'utf8');
const problems = majorRoadFileProblems(text);
if (problems.length > 0) {
  console.error(
    `${path} has ${problems.length} problems:\n- ${problems.slice(0, 20).join('\n- ')}`,
  );
  process.exit(1);
}
const { roads } = JSON.parse(text);
console.error(`${path}: ${roads.length} roads, ${(Buffer.byteLength(text) / 1024).toFixed(0)} kB.`);
