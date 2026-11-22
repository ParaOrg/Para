// Reads the establishment files back and fails on anything the app could not use honestly: a
// cell or the whole over its ceiling, the index and a cell disagreeing, a missing licence or
// credit, a row without an OSM id, a kind or a point, a place in the wrong cell, or a kind with
// almost nothing in it (the extract or the filter broke). Prints the cells' numbers.
// Usage: node --experimental-strip-types scripts/establishments/check.mjs [dir]
//   the dir defaults to public/data/establishments/v1
import { ESTABLISHMENT_DIR, readEstablishmentFiles } from './establishment-file.mjs';
import { establishmentFilesProblems } from './establishment-problems.mjs';

const dir = process.argv[2] ?? ESTABLISHMENT_DIR;
const files = readEstablishmentFiles(dir);
const problems = establishmentFilesProblems(files);
if (problems.length > 0) {
  console.error(`${dir} has ${problems.length} problems:\n- ${problems.slice(0, 20).join('\n- ')}`);
  process.exit(1);
}
const { cells } = JSON.parse(files.index);
const total = cells.reduce((sum, { bytes }) => sum + bytes, 0);
const densest = cells.reduce((most, cell) => (cell.bytes > most.bytes ? cell : most));
console.error(
  `${dir}: ${cells.reduce((sum, { count }) => sum + count, 0)} establishments in ${cells.length} cells, ` +
    `${(total / 1024).toFixed(0)} kB together; the densest, ${densest.cell}, ${densest.count} places, ` +
    `${(densest.bytes / 1024).toFixed(0)} kB.`,
);
