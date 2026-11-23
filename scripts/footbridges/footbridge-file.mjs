// The footbridge file's shape, written and checked in one place (.scratch/footbridges, ticket
// 01): footbridges.mjs writes it, check.mjs and tests/unit/footbridge-file-test.mjs read it back
// with footbridgeFileProblems.
//
// The same header as the landmark file (JSON has no comments, so the licence and the credit are
// its first fields), then one footbridge per line, so a monthly rebuild reads as a diff of the
// footbridges that changed.
import { LANDMARK_SOURCE } from '../landmarks/landmark-file.mjs';

export const FOOTBRIDGE_FILE_SCHEMA = 1;
export const FOOTBRIDGE_FILE_PATH = 'public/data/footbridges.v1.json';
/** The ceiling in .scratch/footbridges/README.md: today's file is some 50 kB. */
export const FOOTBRIDGE_FILE_MAX_BYTES = 500 * 1024;
/** What leads up to a footbridge, as the file names it. */
export const ACCESS_KINDS = ['elevator', 'steps'];
const LICENSE = 'ODbL-1.0';
const ATTRIBUTION = '© OpenStreetMap contributors';
const LICENSE_NOTE =
  'Derived from OpenStreetMap data, which is available under the Open Database License ' +
  '(https://opendatacommons.org/licenses/odbl/1-0/). Keep the attribution with any copy or ' +
  'anything made from it. Built by scripts/landmarks/build.sh.';
/** Fewer than this many footbridges means the extract or the filter broke. */
const FEWEST_FOOTBRIDGES = 50;

/** The file's text: the header fields, then one footbridge per line. */
export function footbridgeFileText({ extractAt, footbridges }) {
  const header = {
    schema: FOOTBRIDGE_FILE_SCHEMA,
    license: LICENSE,
    attribution: ATTRIBUTION,
    license_note: LICENSE_NOTE,
    source: LANDMARK_SOURCE,
    extract_at: extractAt,
  };
  const headerLines = Object.entries(header).map(
    ([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`,
  );
  const rows = footbridges.map(({ id, name, isCovered, lines, access }) =>
    JSON.stringify({
      id,
      ...(name ? { name } : {}),
      ...(isCovered ? { covered: true } : {}),
      lines,
      ...(access.length > 0 ? { access } : {}),
    }),
  );
  return `{\n${headerLines.join('\n')}\n  "footbridges": [\n    ${rows.join(',\n    ')}\n  ]\n}\n`;
}

const isText = (value) => typeof value === 'string' && value.trim() !== '';
const isCoordinate = (value, low, high) =>
  typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high;
const isLngLat = (point) =>
  Array.isArray(point) &&
  point.length === 2 &&
  isCoordinate(point[0], -180, 180) &&
  isCoordinate(point[1], -90, 90);
const isLine = (line) => Array.isArray(line) && line.length >= 2 && line.every(isLngLat);

/** What is wrong with one footbridge, as sentences. */
function footbridgeProblems(footbridge, where) {
  const problems = [];
  if (footbridge?.name !== undefined && !isText(footbridge.name)) {
    problems.push(`${where}: a name, when present, is text.`);
  }
  if (footbridge?.covered !== undefined && footbridge.covered !== true) {
    problems.push(`${where}: covered, when present, is true.`);
  }
  if (!Array.isArray(footbridge?.lines) || footbridge.lines.length === 0) {
    problems.push(`${where}: no lines.`);
  } else if (!footbridge.lines.every(isLine)) {
    problems.push(`${where}: each line is two or more [lng, lat].`);
  }
  if (footbridge?.access !== undefined) {
    const isSound = (point) => ACCESS_KINDS.includes(point?.kind) && isLngLat(point?.point);
    if (!Array.isArray(footbridge.access) || footbridge.access.length === 0) {
      problems.push(`${where}: access, when present, is a non-empty list.`);
    } else if (!footbridge.access.every(isSound)) {
      problems.push(`${where}: each access point is a kind (${ACCESS_KINDS}) and a point.`);
    }
  }
  return problems;
}

/** What is wrong with a footbridge file's text, as sentences; empty when it is sound. */
export function footbridgeFileProblems(text) {
  const problems = [];
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes > FOOTBRIDGE_FILE_MAX_BYTES) {
    problems.push(`The file is ${bytes} bytes, over its ceiling of ${FOOTBRIDGE_FILE_MAX_BYTES}.`);
  }
  let file;
  try {
    file = JSON.parse(text);
  } catch (error) {
    return [...problems, `The file is not JSON: ${error.message}`];
  }
  if (file.schema !== FOOTBRIDGE_FILE_SCHEMA)
    problems.push(`schema is ${file.schema}, not ${FOOTBRIDGE_FILE_SCHEMA}.`);
  if (file.license !== LICENSE) problems.push(`license is ${file.license}, not ${LICENSE}.`);
  if (file.attribution !== ATTRIBUTION) problems.push(`attribution is not "${ATTRIBUTION}".`);
  if (!isText(file.license_note)) problems.push('license_note is missing.');
  if (!isText(file.source)) problems.push('source is missing.');
  if (!isText(file.extract_at) || Number.isNaN(Date.parse(file.extract_at))) {
    problems.push('extract_at is not a timestamp.');
  }
  if (!Array.isArray(file.footbridges)) return [...problems, 'footbridges is not a list.'];
  const ids = new Set();
  file.footbridges.forEach((footbridge, i) => {
    const where = `Footbridge ${i} (${footbridge?.id ?? 'no id'})`;
    if (!/^w\d+$/.test(footbridge?.id ?? '')) problems.push(`${where}: the id is not a way id.`);
    else if (ids.has(footbridge.id)) problems.push(`${where}: the id is repeated.`);
    ids.add(footbridge?.id);
    problems.push(...footbridgeProblems(footbridge, where));
  });
  if (file.footbridges.length < FEWEST_FOOTBRIDGES) {
    problems.push(`Only ${file.footbridges.length} footbridges.`);
  }
  return problems;
}
