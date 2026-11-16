// The suites' outside services, stood in on a run without PARA_LIVE_SERVICES (a pull request's,
// and a local one by default): each browser context a suite opens answers them from what is
// recorded here instead of the network. With PARA_LIVE_SERVICES=1 (main and staging pushes, the
// nightly run) nothing is stood in. outside-requests.mjs applies them to every context.
//
// The router (router.project-osrm.org): answers recorded from the live router, by the request's
// path and query (fixtures/osrm/answers.json), trimmed to what the editor reads (snap.ts). A
// request with no recorded answer fails the suite, naming it: re-record (record-osrm.mjs).
//
// The basemap (tiles.openfreemap.org): OpenFreeMap's own styles and sprite, and the glyph ranges
// the suites draw with, taken from their source repositories (fixtures/basemap/, its README), so
// the map has the real style's layers and our labels their real letters. Every tile is one made-up
// tile (fixtures/basemap/stand-in.pbf: water and a road, from make-stand-in-tile.mjs), so the map
// draws as it does live without OpenFreeMap's data; the shaded relief is one transparent pixel.
// A path the stand-in does not know (a glyph range not kept, say) fails the suite, naming it.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const IS_LIVE = Boolean(process.env.PARA_LIVE_SERVICES);
/** Recording: live, and each router answer written down (scripts/research/record-osrm.mjs). */
const IS_RECORDING_OSRM = Boolean(process.env.PARA_RECORD_OSRM);

const OSRM = /^https:\/\/router\.project-osrm\.org\//;
const OPENFREEMAP = /^https:\/\/tiles\.openfreemap\.org\//;
const BASEMAP = fileURLToPath(new URL('../fixtures/basemap/', import.meta.url));
/** A 1×1 transparent PNG: the shaded relief's stand-in. */
const EMPTY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const ANSWERS = fileURLToPath(new URL('../fixtures/osrm/answers.json', import.meta.url));

const recorded = existsSync(ANSWERS) ? JSON.parse(readFileSync(ANSWERS, 'utf8')) : {};
/** Requests a run asked for that nothing answers: each fails the suite as it ends. */
const unrecorded = new Set();
let hasNewAnswers = false;

const keyOf = (url) => {
  const { pathname, search } = new URL(url);
  return pathname + search;
};

/** As much of the router's answer as snap.ts reads: a refusal's code and message, or the legs. */
const trimmed = (body) => ({
  code: body.code,
  ...(body.message === undefined ? {} : { message: body.message }),
  ...(body.routes === undefined
    ? {}
    : {
        routes: body.routes.slice(0, 1).map((r) => ({
          legs: r.legs.map((leg) => ({
            steps: leg.steps.map((s) => ({
              name: s.name,
              distance: s.distance,
              geometry: { coordinates: s.geometry.coordinates },
            })),
          })),
        })),
      }),
});

const answerRouter = async (route) => {
  const key = keyOf(route.request().url());
  if (IS_RECORDING_OSRM) {
    const response = await route.fetch();
    // A busy router's page is not an answer to keep: passed on, not written down.
    const body = await response.json().catch(() => null);
    if (body === null) return route.fulfill({ response });
    recorded[key] = { status: response.status(), body: trimmed(body) };
    hasNewAnswers = true;
    return route.fulfill({ response, json: body });
  }
  const answer = recorded[key];
  if (!answer) {
    unrecorded.add(key);
    return route.fulfill({ status: 500, json: { code: 'NotRecorded', message: key } });
  }
  return route.fulfill({ status: answer.status, json: answer.body });
};

/** OpenFreeMap's styles, its tiles' TileJSON, its sprite, and empty tiles, glyphs and relief. */
const answerBasemap = (route) => {
  const { pathname } = new URL(route.request().url());
  const style = /^\/styles\/(positron|liberty|fiord)$/.exec(pathname);
  if (style) {
    const text = readFileSync(`${BASEMAP}${style[1]}.json`, 'utf8');
    return route.fulfill({
      contentType: 'application/json',
      body: text.replaceAll('__TILEJSON_DOMAIN__', 'tiles.openfreemap.org'),
    });
  }
  if (pathname === '/planet') {
    return route.fulfill({
      json: {
        tilejson: '3.0.0',
        tiles: ['https://tiles.openfreemap.org/planet/stand-in/{z}/{x}/{y}.pbf'],
        minzoom: 0,
        maxzoom: 14,
      },
    });
  }
  const sprite = /^\/sprites\/ofm_f384\/(ofm(?:@2x)?\.(?:json|png))$/.exec(pathname);
  if (sprite) return route.fulfill({ path: `${BASEMAP}sprites/ofm_f384/${sprite[1]}` });
  if (/^\/planet\/.+\.pbf$/.test(pathname)) {
    return route.fulfill({ contentType: 'application/x-protobuf', path: `${BASEMAP}stand-in.pbf` });
  }
  const glyphs = /^\/fonts\/([^/]+)\/(\d+-\d+)\.pbf$/.exec(pathname);
  const glyphFile = glyphs && `${BASEMAP}fonts/${decodeURIComponent(glyphs[1])}/${glyphs[2]}.pbf`;
  if (glyphFile && existsSync(glyphFile)) {
    return route.fulfill({ contentType: 'application/x-protobuf', path: glyphFile });
  }
  if (/^\/natural_earth\/.+\.png$/.test(pathname)) {
    return route.fulfill({ contentType: 'image/png', body: EMPTY_PNG });
  }
  unrecorded.add(route.request().url());
  return route.fulfill({ status: 404, body: '' });
};

/** The stand-ins on `context`, unless the run is live. */
export const applyStandIns = async (context) => {
  if (IS_LIVE && !IS_RECORDING_OSRM) return;
  await context.route(OSRM, answerRouter);
  if (!IS_LIVE) await context.route(OPENFREEMAP, answerBasemap);
};

process.on('exit', () => {
  if (hasNewAnswers) {
    const sorted = Object.fromEntries(
      Object.entries(recorded).sort(([a], [b]) => a.localeCompare(b)),
    );
    writeFileSync(ANSWERS, `${JSON.stringify(sorted)}\n`);
  }
  if (unrecorded.size === 0) return;
  console.log(`FAIL  the stand-ins have no answer for ${unrecorded.size} request(s):`);
  for (const key of unrecorded) console.log(`  ${key}`);
  console.log('  Re-record (tests/e2e/README.md): the router, scripts/research/record-osrm.mjs.');
  process.exitCode = 1;
});
