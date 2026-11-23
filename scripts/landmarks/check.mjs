// Reads a landmark file back and fails on anything place search could not use honestly: over the
// owner's 3 MB, a missing licence or credit, a landmark without a name, an OSM id or a point, or a
// kind with almost nothing in it (the extract or the filter broke).
// Usage: node scripts/landmarks/check.mjs [file]    defaults to public/data/landmarks.v1.json
import { readFileSync } from 'node:fs';
import { LANDMARK_FILE_PATH, landmarkFileProblems } from './landmark-file.mjs';

const path = process.argv[2] ?? LANDMARK_FILE_PATH;
const text = readFileSync(path, 'utf8');
const problems = landmarkFileProblems(text);
if (problems.length > 0) {
  console.error(
    `${path} has ${problems.length} problems:\n- ${problems.slice(0, 20).join('\n- ')}`,
  );
  process.exit(1);
}
const { landmarks } = JSON.parse(text);
console.error(
  `${path}: ${landmarks.length} landmarks, ${(Buffer.byteLength(text) / 1024).toFixed(0)} kB.`,
);
