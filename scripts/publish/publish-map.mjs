// Publishes the public map as files, so commuters never ask the database.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs scripts/publish/publish-map.mjs
//                                                   writes public/data/
//
// Six things (shape A of docs/archive/review-2026-09-29.md, section 8, stage 7 of the
// clean-up; since 2026-09-29; the train lines' shape and the ferry's since
// 2026-10-03; loops since 2026-10-17):
//   data/index.v5.json      schema 5, what the app reads (MAP_FILE_URL): the
//                           index below with every line and every loop in —
//                           a loop's route has no ends and `is_loop: true`,
//                           last in its row and on loops only.
//   data/index.v4.json      schema 4: the same without the loops
//                           (shapes.mjs), for an app that would refuse the
//                           whole index for a route with no ends. Every line
//                           in, the trains and the ferry — a line's
//                           `route_code`, a station's `line` — read by
//                           servedBy (src/features/routes/model/routes.ts).
//                           Kept a month at least after shape 5 ships.
//   data/index.v3.json      schema 3: the same without the ferry
//                           (without-lines.mjs), for an app that knows the
//                           trains but would take the ferry for a jeep. Kept
//                           a month at least after shape 4 ships.
//   data/index.json         schema 2: every route, its names, every hotspot,
//                           the links, and each direction's *overview* — its
//                           line thinned at 5 m with 5-decimal coordinates,
//                           a quarter of the points, invisible at the zooms
//                           the whole map is seen at — and its length in
//                           metres, measured on the full line, so a trip's
//                           Distance and fare never read an overview. The
//                           map draws from it. Without any line
//                           (without-lines.mjs): an app installed before
//                           servedBy would draw a jeep stopping at a station.
//                           Kept a month at least after shape 3 ships.
//   data/lines/<id>.json    each direction's full line (below), fetched when
//                           the direction is lit or opened, with its orange
//                           stretches worked out (`pass`, and `passKey`, what
//                           they were worked out against: src/features/routes/model/line-pass.ts),
//                           since 2026-10-05.
//   data/map.json           schema 1, everything in full as before (without
//                           any line, as the index), for one
//                           release: an installed app that has not updated
//                           reads it. Drop it a month at least after the
//                           index ships (src/features/routes/published/map-file.ts has the
//                           rule), with its commit line in the workflow.
// A line file of a direction that no longer exists is removed.
//
// Reading is read-database.mjs's, the rows are assembled by assemble.mjs (with
// the boards sorted by signboard-files.mjs), and write-files.mjs writes them.
// This script runs them in turn and stops at the first check that fails.
//
// The file is written the same way every time: fixed key order, fixed row
// order, and `published_at` is carried over from the previous file when
// nothing else changed. So a run on unchanged data writes a byte-identical
// file, and the workflow that runs this daily commits only real changes.
//
// Shapes 1 to 4 are asserted loop-free, and every shape is built and checked
// before the first file is written (shapes.mjs).
//
// The script checks its own work before writing: every original point must
// lie within half a metre of the thinned line, or it fails. And it refuses to
// publish a map that shrank suddenly — a table that answers with no rows is a
// normal HTTP 200, so without this a policy slip would blank the public map
// and deploy it. The signboards are held the same way (board-guard.mjs,
// 2026-10-03): many of the boards directions name gone from the bucket at
// once, or every one of them.
// `--force` overrides these checks, for a deliberate removal.
//
// The rules are the app's own, imported from src/ as check-map-data does —
// the thinning, the rounding, a hotspot's label, the route and direction
// names, the index's schema — so the file and the app cannot drift (the
// review's 6.5: they were written here a second time). TypeScript, which
// Node strips; ts-resolve.mjs finds the .ts behind an extensionless import.
// Node's own fetch, zlib and fs, and zod through the app's schemas (ticket 08
// of the restructure follow-ups, 2026-10-07): the workflow runs `npm ci
// --omit=dev` first.
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ShapeError, buildFiles, indexRowsOf } from './shapes.mjs';
import { boardsRefusal } from './board-guard.mjs';
import { shrinkRefusals, takenDownSets } from './shrink-guard.mjs';
import { AssembleError, assembleMap, publishedAtOf, sourceRevisionsOf } from './assemble.mjs';
import { databaseConfig, databaseReader } from './read-database.mjs';
import { boardsNamed, sortBoards } from './signboard-files.mjs';
import { dataPaths, readPrevious, writeBoards, writeLines, writeMapFiles } from './write-files.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Says why, sets the exit code and stops. Not process.exit(): on Windows, Node 24 asserts when that runs with a fetch timeout still pending. */
function fail(message) {
  console.error(message);
  process.exitCode = 1;
  throw new Stop();
}
class Stop extends Error {}
process.on('uncaughtException', (e) => {
  if (!(e instanceof Stop)) {
    console.error(e);
    process.exitCode = 1;
  }
});
const paths = dataPaths(root);
const FORCE = process.argv.includes('--force');
/** A collection that lost more than this share of its rows since the last file is not published without --force. */
const MAX_SHRINK = 0.3;

// ------------------------------------------------------------------- read

const config = databaseConfig(root);
if (!config) {
  fail('No Supabase URL and publishable key: set them in .env.production or the environment.');
}
const database = databaseReader(config);

const { directionRows, hotspotRows, linkRows } = await database.tables();

const leaks = await database.leaks();
if (leaks.length) fail(leaks.map((l) => `FAIL  ${l}`).join('\n'));

const takenDown = takenDownSets(await database.takedowns());
if (takenDown.routes.size || takenDown.hotspots.size) {
  console.log(
    `Taken down: ${takenDown.routes.size} route(s), ${takenDown.hotspots.size} hotspot(s).`,
  );
}

const named = boardsNamed(directionRows);
const fetched = await Promise.all(named.names.map(async (n) => [n, await database.board(n)]));
const {
  boardText,
  refused,
  gone,
  boardsOf,
  missing: boardsMissing,
} = sortBoards(fetched, named.boardsOf);
for (const [n, why] of refused) {
  console.warn(`::warning::signboards/${n} was refused by the clean and left out: ${why}`);
}
for (const n of gone)
  console.warn(
    `::warning::signboards/${n} is named by a direction but gone from the bucket; left out`,
  );
if (!FORCE) {
  const refusal = boardsRefusal({
    named: boardText.size,
    gone: gone.length,
    published: gone.filter((n) => existsSync(join(paths.signboards, n))).length,
    maxShrink: MAX_SHRINK,
  });
  if (refusal) fail(`FAIL  ${refusal}`);
}

// --------------------------------------------------------------- assemble

let assembled;
try {
  assembled = assembleMap(directionRows, hotspotRows, linkRows);
} catch (e) {
  if (e instanceof AssembleError) fail(e.message);
  throw e;
}
const { variants, stops, links, overviews, stats } = assembled;

// The old shapes, for installed apps, without what they do not know
// (shapes.mjs, without-lines.mjs): an app from before servedBy would paint a
// jeep's stretches at the stations over its road, and a line's at every jeep
// hintuan under its track; one reading shape 3 takes the ferry for a jeep;
// one reading shape 4 refuses the whole index for a route with no ends.
const all = { variants, stops, links };
const previous = readPrevious(paths);

// A map that shrank suddenly is far more likely a read that went wrong than
// a clear-out (shrink-guard.mjs): refused unless told, less what editors took
// down on purpose. The new index against its last copy, every line and loop
// in; until it has one, the newest older file against the whole map, which is
// never more than the whole.
if (!FORCE) {
  const was = previous.v5 ?? previous.v4 ?? previous.v3 ?? previous.map;
  const refusals = shrinkRefusals({ was, now: all, takenDown, maxShrink: MAX_SHRINK });
  if (refusals.length) fail(refusals.map((r) => `FAIL  ${r}`).join('\n'));
}

const sourceRevisions = sourceRevisionsOf(directionRows, hotspotRows);
const indexContext = { overviews, boardsOf, sourceRevisions };
const published_at = publishedAtOf({
  prior: previous.v5 ?? previous.v4,
  rows: indexRowsOf(all, indexContext),
  sourceRevisions,
});

// Every file is built and checked before the first is written: a shape that
// fails leaves the files already on disk as they were.
let files;
try {
  files = buildFiles(all, published_at, indexContext);
} catch (e) {
  if (e instanceof ShapeError) fail(e.message);
  throw e;
}
for (const [name, cut] of [
  ['shape 4', files.left.v4],
  ['shape 3', files.left.v3],
  ['shapes 1 and 2', files.left.old],
]) {
  if (cut.ids.variants.size || cut.ids.stops.size) {
    console.log(
      `Left out of ${name}: ${cut.ids.variants.size} direction(s), ${cut.ids.stops.size} station(s).`,
    );
  }
}
const body = files.left.old;

// ------------------------------------------------------------------ write

const before = writeMapFiles(paths, files);
const lines = writeLines(paths, variants, stops);
const boards = writeBoards(paths, boardText, boardsOf);

// ------------------------------------------------------------------ report

for (const s of stats)
  console.log(
    `  ${s.name}: ${s.before} → ${s.after} points, within ${s.dev.toFixed(1)} m; overview ${s.overview}`,
  );
const gz = (text) => gzipSync(Buffer.from(text)).length;
console.log(
  // By the bytes, not the map content: new terms in an unchanged map are still a change to commit.
  `${previous.mapText === files.map ? 'Unchanged' : 'Wrote'} public/data/map.json: ${body.variants.length} direction(s), ${body.stops.length} hotspot(s), ` +
    `${body.links.length} link(s); ${files.map.length} bytes, ${gz(files.map)} gzipped; published_at ${published_at}`,
);
for (const [shape, name] of [
  ['v2', 'index.json'],
  ['v3', 'index.v3.json'],
  ['v4', 'index.v4.json'],
]) {
  console.log(
    `${before[shape] === files[shape] ? 'Unchanged' : 'Wrote'} public/data/${name}: ${files[shape].length} bytes, ${gz(files[shape])} gzipped`,
  );
}
const loopCount = variants.filter((v) => v.route.is_loop === true).length;
console.log(
  `${before.v5 === files.v5 ? 'Unchanged' : 'Wrote'} public/data/index.v5.json: ${variants.length} direction(s) (${loopCount} loop(s)), ` +
    `${stops.length} hotspot(s), ${links.length} link(s); ${files.v5.length} bytes, ${gz(files.v5)} gzipped; ` +
    `lines/: ${lines.files} file(s), ${lines.written} written, ${lines.removed} removed`,
);
console.log(
  `signboards/: ${boards.files} file(s), ${boards.written} written, ${boards.removed} removed` +
    (boardsMissing ? `; ${boardsMissing} named but gone from the bucket or refused, left out` : ''),
);
