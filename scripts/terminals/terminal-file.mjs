// The terminals file (.scratch/terminals): OpenStreetMap's jeepney, UV Express and bus terminals
// in the map's panning box, and the transport terminals OSM names but does not type, for the
// studio's "possible terminal" dots and, the typed three only, the commuter map's terminal
// markers. terminals.mjs writes it from the extract's candidates; the unit checks read it back.
//
// The same header as the landmark file (licence and credit first), then one terminal per line,
// [OSM id, kind, lng, lat, name], so a monthly rebuild reads as a diff of the terminals changed.
import { LANDMARK_SOURCE } from '../landmarks/landmark-file.mjs';

export const TERMINAL_FILE_SCHEMA = 1;
export const TERMINAL_FILE_PATH = 'public/data/terminals.v1.json';
/** Today's file is some 40 kB; past this a filter has gone wrong. */
export const TERMINAL_FILE_MAX_BYTES = 300 * 1024;
/** The kinds, the typed three first; `unknown` is a terminal OSM names but does not type. */
export const TERMINAL_KINDS = ['jeepney', 'uv', 'bus', 'unknown'];
/** Fewer than this many of a typed kind means the extract or the filter broke. */
export const FEWEST_OF_A_KIND = 20;
const LICENSE = 'ODbL-1.0';
const ATTRIBUTION = '© OpenStreetMap contributors';
const LICENSE_NOTE =
  'Derived from OpenStreetMap data, which is available under the Open Database License ' +
  '(https://opendatacommons.org/licenses/odbl/1-0/). Keep the attribution with any copy or ' +
  'anything made from it. Built by scripts/landmarks/build.sh.';

/** What osmium takes from the extract (build.sh): every place a terminal may be mapped as. */
export const TERMINAL_FILTER = [
  'nwr/amenity=bus_station,jeepney_station',
  'nwr/public_transport=station',
  'nwr/name~[Tt]erminal',
];

/** Names that are not a jeepney, UV or bus passengers' terminal: tricycles, taxis, depots. */
const NOT_A_TERMINAL =
  /parking|depot|garage|motor pool|\bstop\b|_stop\b|tricycle|\btoda\b|pedicab|taxi|\bboat\b|ferry|airport|cargo|truck|school bus|\btrike\b|habal/i;
const JEEPNEY = /\b(e-?)?jeep(ney)?s?\b|\bpuj\b|jeepney/i;
const UV =
  /\bu\.?v\.?\s*(express|exp|terminal|station)?\b|\bfx\b|uv express|passenger van|\bvan\s+(terminal|station)\b/i;
const BUS =
  /\bbus(es)?\b|\bp2p\b|liner|\blines?\b|transit|ceres|victory|genesis|philtranco|dltb|partas|five star|\bjam\b|joy ?bus|saulog|santrans|baliwag|first north/i;
/** A rail, subway or ferry station: the basemap draws those already. */
const isRailOrWater = (tags) =>
  Boolean(tags.railway) ||
  ['train', 'subway', 'light_rail', 'monorail', 'tram', 'ferry'].some(
    (mode) => tags[mode] === 'yes',
  );

/**
 * A candidate's kind, or null when it is no passengers' terminal: by its name first (the tags that
 * say which are on a handful), with the few explicit tags as well. A terminal both jeepney and UV
 * is a jeepney terminal.
 */
export function terminalKindOf(tags) {
  const name = tags.name?.trim();
  if (!name) return null;
  if (tags.amenity === 'taxi' || tags.highway === 'bus_stop' || tags.aeroway) return null;
  if (tags.amenity === 'ferry_terminal' || isRailOrWater(tags) || NOT_A_TERMINAL.test(name))
    return null;
  const isTerminal =
    tags.amenity === 'bus_station' ||
    tags.amenity === 'jeepney_station' ||
    tags.public_transport === 'station' ||
    /terminal/i.test(name);
  if (!isTerminal) return null;
  if (
    JEEPNEY.test(name) ||
    tags.jeepney === 'yes' ||
    tags.bus === 'jeep' ||
    tags.amenity === 'jeepney_station' ||
    tags.share_taxi === 'yes'
  )
    return 'jeepney';
  if (UV.test(name) || tags.minibus === 'yes') return 'uv';
  if (BUS.test(name)) return 'bus';
  return 'unknown';
}

const M_PER_DEG = 111_320;
const metresBetween = ([lng1, lat1], [lng2, lat2]) =>
  Math.hypot(
    (lng1 - lng2) * M_PER_DEG * Math.cos((lat1 * Math.PI) / 180),
    (lat1 - lat2) * M_PER_DEG,
  );
const round = (value) => Math.round(value * 1e5) / 1e5;

/** A feature's point: its own, or the mean of its outline's. */
function pointOf(geometry) {
  const points =
    geometry.type === 'Point'
      ? [geometry.coordinates]
      : geometry.type === 'LineString'
        ? geometry.coordinates
        : geometry.type === 'Polygon'
          ? geometry.coordinates[0]
          : geometry.type === 'MultiPolygon'
            ? geometry.coordinates[0][0]
            : [];
  if (points.length === 0) return null;
  const [lng, lat] = points.reduce(([x, y], [a, b]) => [x + a, y + b], [0, 0]);
  return [round(lng / points.length), round(lat / points.length)];
}

/** osmium's unique ids (n, w, and a for an area: twice its way's id, or a relation's plus one). */
export function osmIdOf(uniqueId) {
  if (!uniqueId.startsWith('a')) return uniqueId;
  const area = BigInt(uniqueId.slice(1));
  return area % 2n === 0n ? `w${area / 2n}` : `r${(area - 1n) / 2n}`;
}

/**
 * The terminals among the exported candidates, in the box: one per terminal, where a node and a
 * way of one terminal (the same name within 150 m) are both mapped, sorted by kind, then id.
 */
export function terminalsFrom(features, box) {
  const terminals = [];
  for (const { id, geometry, properties } of features) {
    const kind = terminalKindOf(properties ?? {});
    const point = geometry && pointOf(geometry);
    if (!kind || !point) continue;
    const [lng, lat] = point;
    if (lng < box.west || lng > box.east || lat < box.south || lat > box.north) continue;
    const name = properties.name.trim();
    const isTwin = terminals.some(
      (other) =>
        other.name.toLowerCase() === name.toLowerCase() && metresBetween(other.point, point) < 150,
    );
    if (!isTwin) terminals.push({ id: osmIdOf(String(id)), kind, point, name });
  }
  const order = (kind) => TERMINAL_KINDS.indexOf(kind);
  return terminals.sort((a, b) => order(a.kind) - order(b.kind) || a.id.localeCompare(b.id));
}

/** The file's text: the header fields, then one terminal per line. */
export function terminalFileText({ extractAt, terminals }) {
  const header = {
    schema: TERMINAL_FILE_SCHEMA,
    license: LICENSE,
    attribution: ATTRIBUTION,
    license_note: LICENSE_NOTE,
    source: LANDMARK_SOURCE,
    extract_at: extractAt,
    kinds: TERMINAL_KINDS,
  };
  const headerLines = Object.entries(header).map(
    ([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`,
  );
  const rows = terminals.map(({ id, kind, point, name }) =>
    JSON.stringify([id, kind, point[0], point[1], name]),
  );
  return `{\n${headerLines.join('\n')}\n  "terminals": [\n    ${rows.join(',\n    ')}\n  ]\n}\n`;
}

/** What is wrong with the file's text, one sentence each; none when it is sound. */
export function terminalFileProblems(text) {
  const problems = [];
  if (text.length > TERMINAL_FILE_MAX_BYTES)
    problems.push(`${text.length} bytes is over the ${TERMINAL_FILE_MAX_BYTES} it may be.`);
  let file;
  try {
    file = JSON.parse(text);
  } catch {
    return [...problems, 'It is not JSON.'];
  }
  if (file.schema !== TERMINAL_FILE_SCHEMA)
    problems.push(`Its schema is not ${TERMINAL_FILE_SCHEMA}.`);
  if (file.license !== LICENSE) problems.push(`Its licence is not ${LICENSE}.`);
  if (file.attribution !== ATTRIBUTION) problems.push(`Its attribution is not ${ATTRIBUTION}.`);
  if (!Array.isArray(file.terminals)) return [...problems, 'It holds no list of terminals.'];
  const bad = file.terminals.filter(
    (row) =>
      !Array.isArray(row) ||
      row.length !== 5 ||
      !/^[nwr]\d+$/.test(row[0]) ||
      !TERMINAL_KINDS.includes(row[1]) ||
      !Number.isFinite(row[2]) ||
      !Number.isFinite(row[3]) ||
      typeof row[4] !== 'string' ||
      row[4].trim() === '',
  );
  if (bad.length > 0)
    problems.push(`${bad.length} terminals are not [OSM id, kind, lng, lat, name].`);
  const ids = file.terminals.map((row) => row?.[0]);
  if (new Set(ids).size !== ids.length) problems.push('An OSM id is listed twice.');
  for (const kind of TERMINAL_KINDS.slice(0, 3)) {
    const count = file.terminals.filter((row) => row?.[1] === kind).length;
    if (count < FEWEST_OF_A_KIND)
      problems.push(`${count} ${kind} terminals is fewer than the ${FEWEST_OF_A_KIND} expected.`);
  }
  return problems;
}

/** Each kind's count, as the refresh PR's table: before, after, change. */
export function terminalCountsTable(beforeText, afterText) {
  const counts = (text) => {
    const terminals = text ? (JSON.parse(text).terminals ?? []) : [];
    return Object.fromEntries(
      TERMINAL_KINDS.map((kind) => [kind, terminals.filter((row) => row[1] === kind).length]),
    );
  };
  const [before, after] = [counts(beforeText), counts(afterText)];
  const line = (label, a, b) => `| ${label} | ${a} | ${b} | ${b - a >= 0 ? '+' : ''}${b - a} |`;
  const sum = (c) => Object.values(c).reduce((s, n) => s + n, 0);
  return [
    '| Terminals | Before | After | Change |',
    '| --- | ---: | ---: | ---: |',
    ...TERMINAL_KINDS.map((kind) => line(kind, before[kind], after[kind])),
    line('**All**', sum(before), sum(after)),
  ].join('\n');
}
