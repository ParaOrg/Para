// The studio's store search files (.scratch/establishments, the studio's store search): every
// Overture store and eatery, drawn on the map or not, and every named OSM establishment, one file
// each in public/data/search/v1/, kept apart by licence as the map's own files are. Only the
// studio's search reads them, on demand: the public page never names them
// (scripts/checks/build/strings.mjs), and the public map's offline cache does not match them
// (scripts/node/offline-worker-caches.ts).
//
//   node --experimental-strip-types scripts/search/search-file.mjs <overture-search.ndjson> <out dir>
//
// The OSM file is made from the establishment cells already in public/data/establishments/v1.

import { createReadStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import {
  ATTRIBUTION as OSM_ATTRIBUTION,
  LICENSE as OSM_LICENSE,
  readEstablishmentFiles,
} from '../establishments/establishment-file.mjs';
import { isAddressLike } from '../overture/overture.mjs';
import { OVERTURE_FILES } from '../overture/overture-file.mjs';
import { readPanningBox } from '../tiles/area.mjs';

export const SEARCH_DIR = 'public/data/search/v1';
export const SEARCH_FILE_SCHEMA = 1;
export const OVERTURE_SEARCH = 'overture.json';
export const OSM_SEARCH = 'osm.json';
/** A file is fetched whole when the studio's search opens: past this it is a filter gone wrong. */
export const SEARCH_FILE_MAX_BYTES = 6 * 1024 * 1024;
/** Fewer places than this in a file means a pull or a filter broke, not that Manila emptied. */
export const FEWEST_PLACES = 10_000;

const round = (value) => Math.round(value * 1e5) / 1e5;

/** The Overture rows pull-search.py wrote, as places: named, not an address, open, in the box. */
export function overtureSearchPlaces(rows, box) {
  const byId = new Map();
  for (const row of rows) {
    const name = row.name?.trim();
    if (!name || isAddressLike(name)) continue;
    if (row.status && row.status !== 'open') continue;
    if (!row.category) continue;
    const point = [round(row.lng), round(row.lat)];
    const [lng, lat] = point;
    if (lng < box.west || lng > box.east || lat < box.south || lat > box.north) continue;
    if (!byId.has(row.id)) byId.set(row.id, { name, category: row.category, point });
  }
  return [...byId.values()];
}

/** The OSM establishment cells' named places, each with its kind as its category. */
export function osmSearchPlaces(cellTexts) {
  const places = [];
  for (const text of cellTexts) {
    for (const [, kind, lng, lat, name] of JSON.parse(text).establishments) {
      if (typeof name === 'string' && name.trim() !== '')
        places.push({ name: name.trim(), category: kind, point: [lng, lat] });
    }
  }
  return places;
}

/**
 * One search file's text: who it is from and under what licence, its categories once, and each
 * place as [name, category index, lng, lat], in a stable order so a month's diff is the change.
 */
export function searchFile(header, places) {
  const categories = [...new Set(places.map(({ category }) => category))].sort();
  const indexOf = new Map(categories.map((category, i) => [category, i]));
  const rows = places
    .map(({ name, category, point }) => [name, indexOf.get(category), point[0], point[1]])
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]) || a[2] - b[2] || a[3] - b[3]);
  const lines = rows.map((row) => JSON.stringify(row));
  const head = JSON.stringify({ schema: SEARCH_FILE_SCHEMA, ...header, categories });
  return `${head.slice(0, -1)},\n"places":[\n${lines.join(',\n')}\n]}\n`;
}

/** What is wrong with a search file's text, one short line each; none when it is sound. */
export function searchFileProblems(text, { license, attribution }) {
  const problems = [];
  if (text.length > SEARCH_FILE_MAX_BYTES)
    problems.push(`${text.length} bytes is over the ${SEARCH_FILE_MAX_BYTES} a file may be.`);
  let file;
  try {
    file = JSON.parse(text);
  } catch {
    return [...problems, 'It is not JSON.'];
  }
  if (file.schema !== SEARCH_FILE_SCHEMA) problems.push(`Its schema is not ${SEARCH_FILE_SCHEMA}.`);
  if (file.license !== license) problems.push(`Its licence is not ${license}.`);
  if (file.attribution !== attribution) problems.push(`Its attribution is not ${attribution}.`);
  const { categories, places } = file;
  if (!Array.isArray(categories) || categories.some((c) => typeof c !== 'string' || c === ''))
    return [...problems, 'Its categories are not a list of names.'];
  if (!Array.isArray(places)) return [...problems, 'It holds no list of places.'];
  if (places.length < FEWEST_PLACES)
    problems.push(`${places.length} places is fewer than the ${FEWEST_PLACES} expected.`);
  const bad = places.filter(
    (row) =>
      !Array.isArray(row) ||
      row.length !== 4 ||
      typeof row[0] !== 'string' ||
      row[0] === '' ||
      !Number.isInteger(row[1]) ||
      row[1] < 0 ||
      row[1] >= categories.length ||
      !Number.isFinite(row[2]) ||
      !Number.isFinite(row[3]),
  );
  if (bad.length > 0) problems.push(`${bad.length} places are not [name, category, lng, lat].`);
  return problems;
}

export const OVERTURE_SEARCH_HEADER = (release) => ({
  license: OVERTURE_FILES.license,
  attribution: OVERTURE_FILES.attribution,
  license_note:
    'From Overture Maps Places, for the studio’s search only. Rows from Meta, Microsoft and ' +
    'Overture are under the Community Data License Agreement – Permissive 2.0, rows from ' +
    'Foursquare under the Apache License 2.0 (with its NOTICE), rows from AllThePlaces under CC0 ' +
    '1.0; the texts are in this folder. Not OpenStreetMap data and never merged into it.',
  source: OVERTURE_FILES.source,
  release,
});

export const OSM_SEARCH_HEADER = (extractAt) => ({
  license: OSM_LICENSE,
  attribution: OSM_ATTRIBUTION,
  license_note:
    'Derived from OpenStreetMap data, which is available under the Open Database License ' +
    '(https://opendatacommons.org/licenses/odbl/1-0/), for the studio’s search only. Keep the ' +
    'attribution with any copy or anything made from it.',
  source: 'https://www.openstreetmap.org',
  extract_at: extractAt,
});

async function readLines(path) {
  const rows = [];
  const lines = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  for await (const line of lines) if (line.trim() !== '') rows.push(JSON.parse(line));
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [overturePath, outDir] = process.argv.slice(2);
  if (!overturePath || !outDir) {
    console.error(
      'Usage: node --experimental-strip-types scripts/search/search-file.mjs <overture-search.ndjson> <out dir>',
    );
    process.exit(2);
  }
  const rows = await readLines(overturePath);
  const release = rows[0]?.release;
  if (!release) {
    console.error(`${overturePath} holds no places.`);
    process.exit(1);
  }
  const establishments = readEstablishmentFiles('public/data/establishments/v1');
  const extractAt = JSON.parse(establishments.index).extract_at;
  const files = [
    [
      OVERTURE_SEARCH,
      searchFile(OVERTURE_SEARCH_HEADER(release), overtureSearchPlaces(rows, readPanningBox())),
      OVERTURE_FILES,
    ],
    [
      OSM_SEARCH,
      searchFile(OSM_SEARCH_HEADER(extractAt), osmSearchPlaces(establishments.cells.values())),
      { license: OSM_LICENSE, attribution: OSM_ATTRIBUTION },
    ],
  ];
  let failed = false;
  mkdirSync(outDir, { recursive: true });
  for (const [name, text, expected] of files) {
    const problems = searchFileProblems(text, expected);
    for (const problem of problems) console.error(`${name}: ${problem}`);
    if (problems.length > 0) failed = true;
    writeFileSync(join(outDir, name), text);
    const { places, categories } = JSON.parse(readFileSync(join(outDir, name), 'utf8'));
    console.error(
      `${name}: ${places.length} places in ${categories.length} categories, ${Math.round(text.length / 1024)} kB.`,
    );
  }
  if (failed) process.exit(1);
}
