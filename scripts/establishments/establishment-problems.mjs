// What is wrong with the establishment files (establishment-file.mjs), as sentences: the
// monthly run's check (check.mjs) and the unit checks read them back with it. It needs no
// package; the unit checks parse the files with the app's own schemas too
// (src/features/routes/published/establishment-file-schema.ts).
import {
  ESTABLISHMENT_CELL_DEG,
  establishmentCellOf,
} from '../../src/features/routes/published/establishment-cells.ts';
import {
  ATTRIBUTION,
  ESTABLISHMENT_CELL_MAX_BYTES,
  ESTABLISHMENT_FILE_SCHEMA,
  ESTABLISHMENT_KINDS,
  ESTABLISHMENT_TOTAL_MAX_BYTES,
  FEWEST_OF_A_KIND,
  LICENSE,
  sha,
} from './establishment-file.mjs';

const isText = (value) => typeof value === 'string' && value.trim() !== '';
const isCoordinate = (value, low, high) =>
  typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high;
const EXTRA_KEYS = new Set(['brand', 'atm']);

/** What is wrong with one row, as a sentence, or null. */
function rowProblem(row) {
  const [id, kind, lng, lat, name, extras] = Array.isArray(row) ? row : [];
  if (!Array.isArray(row) || row.length < 4 || row.length > 6)
    return 'a row is [id, kind, lng, lat] and, maybe, a name and extras.';
  if (!/^[nwr]\d+$/.test(id ?? '')) return 'the id is not an OSM id.';
  if (!ESTABLISHMENT_KINDS.includes(kind)) return `unknown kind ${kind}.`;
  if (!isCoordinate(lng, -180, 180) || !isCoordinate(lat, -90, 90))
    return 'the point is not lng, lat.';
  if (row.length >= 5 && name !== null && !isText(name)) return 'the name is not text or null.';
  if (row.length === 6) {
    const keys = extras && typeof extras === 'object' ? Object.keys(extras) : [];
    if (keys.length === 0 || keys.some((key) => !EXTRA_KEYS.has(key)))
      return 'extras, when present, hold brand or atm only.';
  }
  return null;
}

const parse = (text, what, problems) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    problems.push(`${what} is not JSON: ${error.message}`);
    return null;
  }
};

/** What is wrong with the files, as sentences; empty when they are sound. `cells` maps each cell's name to its text. */
export function establishmentFilesProblems({ index: indexText, cells }) {
  const problems = [];
  const index = parse(indexText, 'The index', problems);
  if (!index) return problems;
  if (index.schema !== ESTABLISHMENT_FILE_SCHEMA) problems.push(`schema is ${index.schema}.`);
  if (index.license !== LICENSE) problems.push(`license is ${index.license}, not ${LICENSE}.`);
  if (index.attribution !== ATTRIBUTION) problems.push(`attribution is not "${ATTRIBUTION}".`);
  for (const key of ['license_note', 'source'])
    if (!isText(index[key])) problems.push(`${key} is missing.`);
  if (!isText(index.extract_at) || Number.isNaN(Date.parse(index.extract_at)))
    problems.push('extract_at is not a timestamp.');
  if (index.cell_deg !== ESTABLISHMENT_CELL_DEG)
    problems.push(`cell_deg is ${index.cell_deg}, not ${ESTABLISHMENT_CELL_DEG}.`);
  if (!Array.isArray(index.cells)) return [...problems, 'cells is not a list.'];

  const listed = new Set(index.cells.map(({ cell }) => cell));
  for (const name of cells.keys())
    if (!listed.has(name)) problems.push(`Cell ${name} has a file the index does not list.`);
  const ids = new Set();
  const counts = new Map(ESTABLISHMENT_KINDS.map((kind) => [kind, 0]));
  let total = 0;
  for (const { cell, count, bytes, hash } of index.cells) {
    const text = cells.get(cell);
    if (text === undefined) {
      problems.push(`Cell ${cell} is listed but has no file.`);
      continue;
    }
    const size = Buffer.byteLength(text, 'utf8');
    total += size;
    if (size > ESTABLISHMENT_CELL_MAX_BYTES)
      problems.push(
        `Cell ${cell} is ${size} bytes, over its ceiling of ${ESTABLISHMENT_CELL_MAX_BYTES}.`,
      );
    if (size !== bytes || sha(text) !== hash)
      problems.push(`Cell ${cell}: the index's size or hash is not the file's.`);
    const file = parse(text, `Cell ${cell}`, problems);
    if (!file) continue;
    if (
      file.cell !== cell ||
      file.attribution !== ATTRIBUTION ||
      !Array.isArray(file.establishments)
    ) {
      problems.push(`Cell ${cell}: its name, credit or list is wrong.`);
      continue;
    }
    if (file.establishments.length !== count)
      problems.push(`Cell ${cell} holds ${file.establishments.length}, the index says ${count}.`);
    file.establishments.forEach((row, i) => {
      const problem = rowProblem(row);
      if (problem) return problems.push(`Cell ${cell}, row ${i}: ${problem}`);
      if (ids.has(row[0])) problems.push(`Cell ${cell}, row ${i}: ${row[0]} is repeated.`);
      ids.add(row[0]);
      if (establishmentCellOf(row[2], row[3]) !== cell)
        problems.push(`Cell ${cell}, row ${i}: ${row[0]} lies in another cell.`);
      counts.set(row[1], counts.get(row[1]) + 1);
    });
  }
  if (total > ESTABLISHMENT_TOTAL_MAX_BYTES)
    problems.push(`The cells are ${total} bytes together, over ${ESTABLISHMENT_TOTAL_MAX_BYTES}.`);
  for (const [kind, count] of counts)
    if (count < FEWEST_OF_A_KIND) problems.push(`Only ${count} establishments of kind ${kind}.`);
  return problems;
}
