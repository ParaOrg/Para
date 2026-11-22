// The establishment file's shape, written and checked in one place (.scratch/establishments,
// step E3a): establishments.mjs writes it, check.mjs and tests/unit/establishment-file-test.mjs
// read it back with establishmentFileProblems.
//
// The landmark file's header (JSON has no comments, so the licence and the credit are its first
// fields), then one establishment per line, so a monthly rebuild reads as a diff of the places
// that changed. A row is an array, not an object, to keep some 40,000 places under the ceiling:
// [id, kind, lng, lat] and, when it has them, its name and its extras.
import { LANDMARK_SOURCE } from '../landmarks/landmark-file.mjs';

export const ESTABLISHMENT_FILE_SCHEMA = 1;
export const ESTABLISHMENT_FILE_PATH = 'public/data/establishments.v1.json';
/** The landmark file's ceiling (.scratch/place-search, decision 7), held to here too. */
export const ESTABLISHMENT_FILE_MAX_BYTES = 3 * 1024 * 1024;
/**
 * What the owner listed (.scratch/establishments, answer 1), in the order the file keeps them.
 * Schools, hospitals and universities are not here: the landmark file has them.
 */
export const ESTABLISHMENT_KINDS = [
  'atm',
  'bank',
  'pawnshop',
  'remittance',
  'pharmacy',
  'convenience',
  'supermarket',
  'restaurant',
  'fast_food',
  'cafe',
  'fuel',
  'clinic',
  'laundry',
  'toilets',
  'police',
];
const LICENSE = 'ODbL-1.0';
const ATTRIBUTION = '© OpenStreetMap contributors';
const LICENSE_NOTE =
  'Derived from OpenStreetMap data, which is available under the Open Database License ' +
  '(https://opendatacommons.org/licenses/odbl/1-0/). Keep the attribution with any copy or ' +
  'anything made from it. Built by scripts/landmarks/build.sh.';
/** Fewer than this many of a kind means the extract or the filter broke. */
const FEWEST_OF_A_KIND = 20;

/** A row as the file writes it: [id, kind, lng, lat], then the name and the extras when there are any. */
function rowOf({ id, kind, point, name, extras }) {
  const row = [id, kind, point[0], point[1]];
  const hasExtras = extras && Object.keys(extras).length > 0;
  if (name || hasExtras) row.push(name ?? null);
  if (hasExtras) row.push(extras);
  return row;
}

/** The file's text: the header fields, then one establishment per line. */
export function establishmentFileText({ extractAt, establishments }) {
  const header = {
    schema: ESTABLISHMENT_FILE_SCHEMA,
    license: LICENSE,
    attribution: ATTRIBUTION,
    license_note: LICENSE_NOTE,
    source: LANDMARK_SOURCE,
    extract_at: extractAt,
    kinds: ESTABLISHMENT_KINDS,
    row: ['id', 'kind', 'lng', 'lat', 'name', 'extras'],
  };
  const headerLines = Object.entries(header).map(
    ([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`,
  );
  const rows = establishments.map((e) => JSON.stringify(rowOf(e)));
  return `{\n${headerLines.join('\n')}\n  "establishments": [\n    ${rows.join(',\n    ')}\n  ]\n}\n`;
}

const isText = (value) => typeof value === 'string' && value.trim() !== '';
const isCoordinate = (value, low, high) =>
  typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high;
const EXTRA_KEYS = new Set(['brand', 'atm']);

/** What is wrong with an establishment file's text, as sentences; empty when it is sound. */
export function establishmentFileProblems(text) {
  const problems = [];
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes > ESTABLISHMENT_FILE_MAX_BYTES) {
    problems.push(
      `The file is ${bytes} bytes, over its ceiling of ${ESTABLISHMENT_FILE_MAX_BYTES}.`,
    );
  }
  let file;
  try {
    file = JSON.parse(text);
  } catch (error) {
    return [...problems, `The file is not JSON: ${error.message}`];
  }
  if (file.schema !== ESTABLISHMENT_FILE_SCHEMA)
    problems.push(`schema is ${file.schema}, not ${ESTABLISHMENT_FILE_SCHEMA}.`);
  if (file.license !== LICENSE) problems.push(`license is ${file.license}, not ${LICENSE}.`);
  if (file.attribution !== ATTRIBUTION) problems.push(`attribution is not "${ATTRIBUTION}".`);
  if (!isText(file.license_note)) problems.push('license_note is missing.');
  if (!isText(file.source)) problems.push('source is missing.');
  if (!isText(file.extract_at) || Number.isNaN(Date.parse(file.extract_at))) {
    problems.push('extract_at is not a timestamp.');
  }
  if (!Array.isArray(file.establishments)) return [...problems, 'establishments is not a list.'];

  const ids = new Set();
  const counts = new Map(ESTABLISHMENT_KINDS.map((kind) => [kind, 0]));
  file.establishments.forEach((row, i) => {
    const [id, kind, lng, lat, name, extras] = Array.isArray(row) ? row : [];
    const where = `Establishment ${i} (${id ?? 'no id'})`;
    if (!Array.isArray(row) || row.length < 4 || row.length > 6) {
      problems.push(`${where}: a row is [id, kind, lng, lat] and, maybe, a name and extras.`);
      return;
    }
    if (!/^[nwr]\d+$/.test(id ?? '')) problems.push(`${where}: the id is not an OSM id.`);
    else if (ids.has(id)) problems.push(`${where}: the id is repeated.`);
    ids.add(id);
    if (!counts.has(kind)) problems.push(`${where}: unknown kind ${kind}.`);
    else counts.set(kind, counts.get(kind) + 1);
    if (!isCoordinate(lng, -180, 180) || !isCoordinate(lat, -90, 90))
      problems.push(`${where}: the point is not lng, lat.`);
    if (row.length >= 5 && name !== null && !isText(name))
      problems.push(`${where}: the name, when present, is text or null.`);
    if (row.length === 6) {
      const keys = extras && typeof extras === 'object' ? Object.keys(extras) : [];
      if (keys.length === 0 || keys.some((key) => !EXTRA_KEYS.has(key)))
        problems.push(`${where}: extras, when present, hold brand or atm only.`);
    }
  });
  for (const [kind, count] of counts) {
    if (count < FEWEST_OF_A_KIND) problems.push(`Only ${count} establishments of kind ${kind}.`);
  }
  return problems;
}
