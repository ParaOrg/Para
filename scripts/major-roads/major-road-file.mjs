// The major-roads file's shape, written and checked in one place (.scratch/go-here, ticket 05):
// major-roads.mjs writes it, check.mjs and tests/unit/major-road-file-test.mjs read it back with
// majorRoadFileProblems.
//
// The same header as the landmark and footbridge files (JSON has no comments, so the licence and
// the credit are its first fields), then one road per line, so a monthly rebuild reads as a diff
// of the roads that changed.
import { LANDMARK_SOURCE } from '../landmarks/landmark-file.mjs';

export const MAJOR_ROAD_FILE_SCHEMA = 1;
export const MAJOR_ROAD_FILE_PATH = 'public/data/major-roads.v1.json';
/** The owner's ceiling (Q178). */
export const MAJOR_ROAD_FILE_MAX_BYTES = 500 * 1024;
/** The roads the file holds, as OpenStreetMap tags them. */
export const MAJOR_ROAD_KINDS = ['trunk', 'primary', 'secondary'];
const LICENSE = 'ODbL-1.0';
const ATTRIBUTION = '© OpenStreetMap contributors';
const LICENSE_NOTE =
  'Derived from OpenStreetMap data, which is available under the Open Database License ' +
  '(https://opendatacommons.org/licenses/odbl/1-0/). Keep the attribution with any copy or ' +
  'anything made from it. Built by scripts/landmarks/build.sh.';
/** Fewer than this many roads means the extract or the filter broke. */
const FEWEST_ROADS = 20;

/** The file's text: the header fields, then one road per line. */
export function majorRoadFileText({ extractAt, roads }) {
  const header = {
    schema: MAJOR_ROAD_FILE_SCHEMA,
    license: LICENSE,
    attribution: ATTRIBUTION,
    license_note: LICENSE_NOTE,
    source: LANDMARK_SOURCE,
    extract_at: extractAt,
  };
  const headerLines = Object.entries(header).map(
    ([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`,
  );
  const rows = roads.map(({ name, kind, lines }) =>
    JSON.stringify({ ...(name ? { name } : {}), kind, lines }),
  );
  return `{\n${headerLines.join('\n')}\n  "roads": [\n    ${rows.join(',\n    ')}\n  ]\n}\n`;
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

/** What is wrong with one road, as sentences. */
function roadProblems(road, where) {
  const problems = [];
  if (road?.name !== undefined && !isText(road.name)) {
    problems.push(`${where}: a name, when present, is text.`);
  }
  if (!MAJOR_ROAD_KINDS.includes(road?.kind)) {
    problems.push(`${where}: the kind is one of ${MAJOR_ROAD_KINDS}.`);
  }
  if (!Array.isArray(road?.lines) || road.lines.length === 0) {
    problems.push(`${where}: no lines.`);
  } else if (!road.lines.every(isLine)) {
    problems.push(`${where}: each line is two or more [lng, lat].`);
  }
  return problems;
}

/** What is wrong with a major-roads file's text, as sentences; empty when it is sound. */
export function majorRoadFileProblems(text) {
  const problems = [];
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes > MAJOR_ROAD_FILE_MAX_BYTES) {
    problems.push(`The file is ${bytes} bytes, over its ceiling of ${MAJOR_ROAD_FILE_MAX_BYTES}.`);
  }
  let file;
  try {
    file = JSON.parse(text);
  } catch (error) {
    return [...problems, `The file is not JSON: ${error.message}`];
  }
  if (file.schema !== MAJOR_ROAD_FILE_SCHEMA)
    problems.push(`schema is ${file.schema}, not ${MAJOR_ROAD_FILE_SCHEMA}.`);
  if (file.license !== LICENSE) problems.push(`license is ${file.license}, not ${LICENSE}.`);
  if (file.attribution !== ATTRIBUTION) problems.push(`attribution is not "${ATTRIBUTION}".`);
  if (!isText(file.license_note)) problems.push('license_note is missing.');
  if (!isText(file.source)) problems.push('source is missing.');
  if (!isText(file.extract_at) || Number.isNaN(Date.parse(file.extract_at))) {
    problems.push('extract_at is not a timestamp.');
  }
  if (!Array.isArray(file.roads)) return [...problems, 'roads is not a list.'];
  file.roads.forEach((road, i) => {
    problems.push(...roadProblems(road, `Road ${i} (${road?.name ?? 'no name'})`));
  });
  if (file.roads.length < FEWEST_ROADS) problems.push(`Only ${file.roads.length} roads.`);
  return problems;
}
