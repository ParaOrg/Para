// Checks a freshly built tiles file before it is uploaded, and writes the `current.json` that
// will point at it. Exits non-zero, saying why, on the first failed check.
// Usage: node scripts/tiles/check.mjs <file.pmtiles> <current.json to write> [previous current.json]
// Environment: BUILD_DATE (YYYY-MM-DD), EXTRACT_DATE (the OSM extract's date), PLANETILER_VERSION.
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

import { PmtilesFile } from './pmtiles.mjs';

const MIN_BYTES = 40_000_000;
/** The share of the last build's tiles the new file must hold. */
const MIN_TILE_SHARE = 0.9;
/** z/x/y of SM Fairview, Quiapo and BGC at zoom 14 (the spike's spots). */
const KNOWN_TILES = [
  ['SM Fairview', 14, 13701, 7513],
  ['Quiapo', 14, 13698, 7520],
  ['BGC', 14, 13700, 7522],
];

const [pmtilesPath, pointerPath, previousPath] = process.argv.slice(2);
const { BUILD_DATE, EXTRACT_DATE, PLANETILER_VERSION } = process.env;
if (!pmtilesPath || !pointerPath || !BUILD_DATE || !EXTRACT_DATE || !PLANETILER_VERSION) {
  throw new Error(
    'usage: check.mjs <file> <current.json> [previous]; env BUILD_DATE, EXTRACT_DATE, PLANETILER_VERSION',
  );
}

const failures = [];
const bytes = statSync(pmtilesPath).size;
const file = new PmtilesFile(pmtilesPath);
const tiles = file.header.addressedTiles;
console.log(
  `${basename(pmtilesPath)}: ${bytes} bytes, ${tiles} tiles, zoom ${file.header.minZoom}-${file.header.maxZoom}`,
);

if (bytes < MIN_BYTES) failures.push(`the file is ${bytes} bytes, under the ${MIN_BYTES} floor`);
if (file.header.maxZoom !== 14) failures.push(`its highest zoom is ${file.header.maxZoom}, not 14`);

for (const [name, z, x, y] of KNOWN_TILES) {
  if (!file.tile(z, x, y)) failures.push(`the ${name} tile ${z}/${x}/${y} is missing`);
}

const version = file.metadata().version;
if (version !== BUILD_DATE) {
  failures.push(
    `the metadata's version is ${JSON.stringify(version)}, not the build date ${BUILD_DATE}`,
  );
}

if (previousPath) {
  const previous = JSON.parse(readFileSync(previousPath, 'utf8'));
  if (!Number.isInteger(previous.tiles) || previous.tiles <= 0) {
    console.error(
      `::error::The last current.json has no usable tile count (${JSON.stringify(previous.tiles)}); fix or delete tiles/current.json in the bucket.`,
    );
    process.exit(1);
  }
  const floor = Math.ceil(previous.tiles * MIN_TILE_SHARE);
  console.log(
    `The last build (${previous.file}) had ${previous.tiles} tiles; the floor is ${floor}.`,
  );
  if (tiles < floor)
    failures.push(`${tiles} tiles is under 90% of the last build's ${previous.tiles}`);
} else {
  console.log('No previous current.json: the tile-count comparison is skipped.');
}
file.close();

if (failures.length > 0) {
  for (const failure of failures) console.error(`::error::Tiles check failed: ${failure}.`);
  process.exit(1);
}

const pointer = {
  file: basename(pmtilesPath),
  builtAt: new Date().toISOString(),
  bytes,
  tiles,
  extractDate: EXTRACT_DATE,
  planetiler: PLANETILER_VERSION,
};
writeFileSync(pointerPath, `${JSON.stringify(pointer, null, 2)}\n`);
console.log(`All checks passed. ${JSON.stringify(pointer)}`);
