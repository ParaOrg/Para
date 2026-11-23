// Reads the Overture place files back and fails on anything the app could not use honestly, as
// the OSM establishment files' check does (scripts/establishments/check.mjs), with Overture's
// licence, kinds and ids. And the guard the owner asked for: no Overture id in the OSM files and
// no OSM id in Overture's, so the two never mix. Prints the cells' numbers.
// Usage: node --experimental-strip-types scripts/overture/check.mjs [dir] [osm dir]
//   the dirs default to public/data/overture/v1 and public/data/establishments/v1
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  ESTABLISHMENT_DIR,
  readEstablishmentFiles,
} from '../establishments/establishment-file.mjs';
import { establishmentFilesProblems } from '../establishments/establishment-problems.mjs';
import { OVERTURE_DIR, OVERTURE_FILES } from './overture-file.mjs';

/** The texts that must stay beside the data (overture-file.mjs, OVERTURE_FILES.licenseNote). */
export const LICENCE_FILES = [
  'LICENSE-CDLA-Permissive-2.0.txt',
  'LICENSE-Apache-2.0.txt',
  'LICENSE-CC0-1.0.txt',
  'NOTICE',
  'README.md',
];

/** Rows in one set's cells whose ids belong to the other set, as sentences. */
export function mixedIdProblems(osmCells, overtureCells) {
  const problems = [];
  for (const [cell, text] of osmCells)
    for (const [id] of JSON.parse(text).establishments)
      if (OVERTURE_FILES.idPattern.test(id))
        problems.push(`OSM cell ${cell} holds the Overture id ${id}.`);
  for (const [cell, text] of overtureCells)
    for (const [id] of JSON.parse(text).establishments)
      if (!OVERTURE_FILES.idPattern.test(id))
        problems.push(`Overture cell ${cell} holds ${id}, not an Overture id.`);
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2] ?? OVERTURE_DIR;
  const osmDir = process.argv[3] ?? ESTABLISHMENT_DIR;
  const files = readEstablishmentFiles(dir);
  const problems = [
    ...establishmentFilesProblems(files, OVERTURE_FILES),
    ...LICENCE_FILES.filter((name) => !existsSync(join(dir, name))).map(
      (name) => `${name} is missing beside the data.`,
    ),
    ...mixedIdProblems(readEstablishmentFiles(osmDir).cells, files.cells),
  ];
  if (problems.length > 0) {
    console.error(
      `${dir} has ${problems.length} problems:\n- ${problems.slice(0, 20).join('\n- ')}`,
    );
    process.exit(1);
  }
  const { cells, release } = JSON.parse(files.index);
  const total = cells.reduce((sum, { bytes }) => sum + bytes, 0);
  const densest = cells.reduce((most, cell) => (cell.bytes > most.bytes ? cell : most));
  console.error(
    `${dir}: Overture ${release}, ${cells.reduce((sum, { count }) => sum + count, 0)} places in ${cells.length} cells, ` +
      `${(total / 1024).toFixed(0)} kB together; the densest, ${densest.cell}, ${densest.count} places, ` +
      `${(densest.bytes / 1024).toFixed(0)} kB.`,
  );
}
