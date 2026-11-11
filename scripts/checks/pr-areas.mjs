// Which areas of Para a pull request touches (areas.json), and a warning when it is more than one:
// one area per pull request keeps reviews small. A warning, never a failure: some changes do span
// areas, and the reviewer decides.
//
//   git diff --name-only BASE...HEAD | node scripts/checks/pr-areas.mjs

import { readFileSync } from 'node:fs';

/** The area of `file` by the first prefix in `areas` it starts with, or null for none. */
export function areaOf(file, areas) {
  for (const [area, prefixes] of Object.entries(areas)) {
    if (prefixes.some((prefix) => file === prefix || file.startsWith(prefix))) return area;
  }
  return null;
}

/** Each area `files` touch, with its files, in areas.json's order. */
export function areasOf(files, areas) {
  const touched = new Map();
  for (const file of files) {
    const area = areaOf(file, areas);
    if (area === null) continue;
    touched.set(area, [...(touched.get(area) ?? []), file]);
  }
  return Object.keys(areas)
    .filter((area) => touched.has(area))
    .map((area) => ({ area, files: touched.get(area) }));
}

/** The warning for a change that spans `touched` areas, or null for one area or none. */
export function spanWarning(touched) {
  if (touched.length < 2) return null;
  const names = touched.map(({ area, files }) => `${area} (${files.length})`).join(', ');
  return `This pull request spans ${touched.length} areas: ${names}. One area per pull request keeps reviews small; split it if it can be.`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { areas } = JSON.parse(readFileSync(new URL('../../areas.json', import.meta.url), 'utf8'));
  const files = readFileSync(0, 'utf8').split('\n').filter(Boolean);
  const touched = areasOf(files, areas);
  for (const { area, files: inArea } of touched) console.info(`${area}: ${inArea.join(', ')}`);
  const warning = spanWarning(touched);
  // GitHub shows a ::warning:: line on the pull request's checks; the run still passes.
  if (warning) console.info(`::warning title=Several areas::${warning}`);
}
