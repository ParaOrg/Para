// The landmark file's shape, written and checked in one place: landmarks.mjs writes it,
// check.mjs and tests/unit/landmark-file-test.mjs read it back with landmarkFileProblems.
//
// JSON has no comments, so the file's header is its first fields: the shape, the licence, the
// credit a reuser has to keep, where the data came from and when. Then one landmark per line, so a
// monthly rebuild reads as a diff of the places that changed.

export const LANDMARK_FILE_SCHEMA = 1;
export const LANDMARK_FILE_PATH = 'public/data/landmarks.v1.json';
/** The owner's ceiling for the file, decision 7 in .scratch/place-search/README.md. */
export const LANDMARK_FILE_MAX_BYTES = 3 * 1024 * 1024;
/** What the owner listed, decision 6, in the order the file keeps them. */
export const LANDMARK_KINDS = [
  'mall',
  'school',
  'university',
  'hospital',
  'church',
  'market',
  'station',
  'barangay',
  'street',
];
export const LANDMARK_SOURCE =
  'https://download.openstreetmap.fr/extracts/asia/philippines/metro_manila.osm.pbf';
const LICENSE = 'ODbL-1.0';
const ATTRIBUTION = '© OpenStreetMap contributors';
const LICENSE_NOTE =
  'Derived from OpenStreetMap data, which is available under the Open Database License ' +
  '(https://opendatacommons.org/licenses/odbl/1-0/). Keep the attribution with any copy or ' +
  'anything made from it. Built by scripts/landmarks/build.sh.';
/** Fewer than this many of a kind means the extract or the filter broke, not that Manila lost its malls. */
const FEWEST_OF_A_KIND = 5;

/** The file's text: the header fields, then one landmark per line. */
export function landmarkFileText({ extractAt, landmarks }) {
  const header = {
    schema: LANDMARK_FILE_SCHEMA,
    license: LICENSE,
    attribution: ATTRIBUTION,
    license_note: LICENSE_NOTE,
    source: LANDMARK_SOURCE,
    extract_at: extractAt,
    kinds: LANDMARK_KINDS,
  };
  const headerLines = Object.entries(header).map(
    ([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`,
  );
  const rows = landmarks.map(({ id, name, kind, point, aliases }) =>
    JSON.stringify({ id, name, kind, point, ...(aliases.length > 0 ? { aliases } : {}) }),
  );
  return `{\n${headerLines.join('\n')}\n  "landmarks": [\n    ${rows.join(',\n    ')}\n  ]\n}\n`;
}

const isText = (value) => typeof value === 'string' && value.trim() !== '';
const isCoordinate = (value, low, high) =>
  typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high;

/** What is wrong with a landmark file's text, as sentences; empty when it is sound. */
export function landmarkFileProblems(text) {
  const problems = [];
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes > LANDMARK_FILE_MAX_BYTES) {
    problems.push(`The file is ${bytes} bytes, over the ${LANDMARK_FILE_MAX_BYTES} the owner set.`);
  }
  let file;
  try {
    file = JSON.parse(text);
  } catch (error) {
    return [...problems, `The file is not JSON: ${error.message}`];
  }
  if (file.schema !== LANDMARK_FILE_SCHEMA)
    problems.push(`schema is ${file.schema}, not ${LANDMARK_FILE_SCHEMA}.`);
  if (file.license !== LICENSE) problems.push(`license is ${file.license}, not ${LICENSE}.`);
  if (file.attribution !== ATTRIBUTION) problems.push(`attribution is not "${ATTRIBUTION}".`);
  if (!isText(file.license_note)) problems.push('license_note is missing.');
  if (!isText(file.source)) problems.push('source is missing.');
  if (!isText(file.extract_at) || Number.isNaN(Date.parse(file.extract_at))) {
    problems.push('extract_at is not a timestamp.');
  }
  if (!Array.isArray(file.landmarks)) return [...problems, 'landmarks is not a list.'];

  const ids = new Set();
  const counts = new Map(LANDMARK_KINDS.map((kind) => [kind, 0]));
  file.landmarks.forEach((landmark, i) => {
    const where = `Landmark ${i} (${landmark?.id ?? 'no id'})`;
    if (!/^[nwr]\d+$/.test(landmark?.id ?? '')) problems.push(`${where}: the id is not an OSM id.`);
    else if (ids.has(landmark.id)) problems.push(`${where}: the id is repeated.`);
    ids.add(landmark?.id);
    if (!isText(landmark?.name)) problems.push(`${where}: no name.`);
    if (!counts.has(landmark?.kind)) problems.push(`${where}: unknown kind ${landmark?.kind}.`);
    else counts.set(landmark.kind, counts.get(landmark.kind) + 1);
    const point = landmark?.point;
    if (
      !Array.isArray(point) ||
      point.length !== 2 ||
      !isCoordinate(point[0], -180, 180) ||
      !isCoordinate(point[1], -90, 90)
    ) {
      problems.push(`${where}: the point is not [lng, lat].`);
    }
    if (landmark?.aliases !== undefined) {
      if (
        !Array.isArray(landmark.aliases) ||
        landmark.aliases.length === 0 ||
        !landmark.aliases.every(isText)
      ) {
        problems.push(`${where}: aliases, when present, are a non-empty list of names.`);
      }
    }
  });
  for (const [kind, count] of counts) {
    if (count < FEWEST_OF_A_KIND) problems.push(`Only ${count} landmarks of kind ${kind}.`);
  }
  return problems;
}
