// The suites' outside services, stood in on a run without PARA_LIVE_SERVICES (a pull request's,
// and a local one by default): each browser context a suite opens answers them from what is
// recorded here instead of the network. With PARA_LIVE_SERVICES=1 (main and staging pushes, the
// nightly run) nothing is stood in. outside-requests.mjs applies them to every context.
//
// The router (router.project-osrm.org): answers recorded from the live router, by the request's
// path, its coordinates rounded, and query (keyOf; fixtures/osrm/answers.json), trimmed to what
// the editor reads (snap.ts). A request with no recorded answer fails the suite, naming it:
// re-record (record-osrm.mjs).
//
// The basemap (tiles.openfreemap.org): OpenFreeMap's own styles and sprite, and the glyph ranges
// the suites draw with, taken from their source repositories (fixtures/basemap/, its README), so
// the map has the real style's layers and our labels their real letters. Every tile is one made-up
// tile (fixtures/basemap/stand-in.pbf: water and a road, from make-stand-in-tile.mjs), so the map
// draws as it does live without OpenFreeMap's data; the shaded relief is one transparent pixel.
// A path the stand-in does not know (a glyph range not kept, say) fails the suite, naming it.
// A suite whose service worker caches the basemap has it served by a real server on a loopback
// port instead (serveBasemapOverHttps), with the same answers.
//
// The database (the address the dev server's build is configured with): the studio's reads of its
// route tables, answered from the published map (route-tables-stand-in.mjs). Anything else sent
// to /rest/v1/, a write included, fails the suite, naming it. A suite with its own page.route for
// the database (fake-studio-db, save-studio) keeps it: a page's route is asked first.
//
// Turnstile (challenges.cloudflare.com): Cloudflare's script, the always-passing stand-in of
// fake-turnstile.mjs, so a page that shows the check (the studio's sign-in, say) gets a token a
// moment later and draws no Cloudflare frame. Any other request there fails the suite, naming it.
// A suite with its own fakeTurnstile, or its own route, keeps it.
//
// The elevation tiles (elevation-tiles-prod.s3.amazonaws.com, the studio's Terrain basemap):
// every Terrarium tile up to the source's z15 is one made-up flat tile at 0 m
// (flat-terrain-tile.mjs). Flat by design: a check that reads heights or shading needs real tiles,
// recorded. Any other path there fails the suite, naming it.
import { execFileSync } from 'node:child_process';
import { createHash, createPublicKey } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TURNSTILE, turnstileScript } from './fake-turnstile.mjs';
import { flatTerrainTile } from './flat-terrain-tile.mjs';
import { answerRouteTables, databaseUrl } from './route-tables-stand-in.mjs';

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

/**
 * A router request's key: its path, each coordinate rounded to 6 decimals (about 0.1 m, the
 * router's own precision), and its query. A point clicked at the same pixel comes back from
 * map.unproject a few 1e-12 degrees apart from run to run (float noise in the camera's path), so
 * the full digits would miss a recorded answer. A miss names this rounded key.
 */
export const keyOf = (url) => {
  const { pathname, search } = new URL(url);
  const rounded = pathname.replace(/-?\d+\.\d+/g, (n) => Number(n).toFixed(6));
  return rounded + search;
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
/** The basemap stand-in's answer for one address: its status, type and body. */
const basemapAnswer = (url) => {
  const { pathname } = new URL(url);
  const style = /^\/styles\/(positron|liberty|fiord)$/.exec(pathname);
  if (style) {
    const text = readFileSync(`${BASEMAP}${style[1]}.json`, 'utf8');
    return {
      contentType: 'application/json',
      body: text.replaceAll('__TILEJSON_DOMAIN__', 'tiles.openfreemap.org'),
    };
  }
  if (pathname === '/planet') {
    return {
      contentType: 'application/json',
      body: JSON.stringify({
        tilejson: '3.0.0',
        tiles: ['https://tiles.openfreemap.org/planet/stand-in/{z}/{x}/{y}.pbf'],
        minzoom: 0,
        maxzoom: 14,
      }),
    };
  }
  const sprite = /^\/sprites\/ofm_f384\/(ofm(?:@2x)?\.(json|png))$/.exec(pathname);
  if (sprite) {
    return {
      contentType: sprite[2] === 'json' ? 'application/json' : 'image/png',
      body: readFileSync(`${BASEMAP}sprites/ofm_f384/${sprite[1]}`),
    };
  }
  if (/^\/planet\/.+\.pbf$/.test(pathname)) {
    return { contentType: 'application/x-protobuf', body: readFileSync(`${BASEMAP}stand-in.pbf`) };
  }
  const glyphs = /^\/fonts\/([^/]+)\/(\d+-\d+)\.pbf$/.exec(pathname);
  const glyphFile = glyphs && `${BASEMAP}fonts/${decodeURIComponent(glyphs[1])}/${glyphs[2]}.pbf`;
  if (glyphFile && existsSync(glyphFile)) {
    return { contentType: 'application/x-protobuf', body: readFileSync(glyphFile) };
  }
  if (/^\/natural_earth\/.+\.png$/.test(pathname)) {
    return { contentType: 'image/png', body: EMPTY_PNG };
  }
  unrecorded.add(url);
  return { status: 404, contentType: 'text/plain', body: '' };
};

const answerBasemap = (route) => route.fulfill(basemapAnswer(route.request().url()));

/** The path of Cloudflare's script the page loads (turnstile.tsx's SCRIPT_URL). */
const TURNSTILE_SCRIPT = '/turnstile/v0/api.js';

/** Cloudflare's script, as the always-passing stand-in; nothing else there is known. */
const answerTurnstile = (route) => {
  if (new URL(route.request().url()).pathname === TURNSTILE_SCRIPT) {
    return route.fulfill({ contentType: 'text/javascript', body: turnstileScript(false) });
  }
  unrecorded.add(route.request().url());
  return route.fulfill({ status: 404, body: '' });
};

const ELEVATION = /^https:\/\/elevation-tiles-prod\.s3\.amazonaws\.com\//;
/** The studio's elevation source's maxzoom (studio-basemaps.ts): no tile past it is asked for. */
const ELEVATION_MAXZOOM = 15;
const FLAT_TILE = flatTerrainTile();

/** A Terrarium tile up to z15, flat at 0 m; nothing else there is known. */
const answerElevation = (route) => {
  const request = route.request();
  const tile = /^\/terrarium\/(\d+)\/(\d+)\/(\d+)\.png$/.exec(new URL(request.url()).pathname);
  const zoom = tile && Number(tile[1]);
  const isTile =
    tile !== null &&
    request.method() === 'GET' &&
    zoom <= ELEVATION_MAXZOOM &&
    Number(tile[2]) < 2 ** zoom &&
    Number(tile[3]) < 2 ** zoom;
  if (isTile) return route.fulfill({ contentType: 'image/png', body: FLAT_TILE });
  unrecorded.add(request.url());
  return route.fulfill({ status: 404, body: '' });
};

/** Whether the basemap is stood in on a run without PARA_LIVE_SERVICES (keepBasemapUnreachable). */
let isBasemapStoodIn = true;

/**
 * Leaves the basemap unanswered for this run's browsers: for handover-test only, whose hand-over
 * needs the basemap's requests to fail at once. With the basemap stood in, its service worker's
 * tile requests are answered through Playwright's routing, and Chromium then finds a new worker
 * on every update check (.scratch/ci-flakes/issues/04). Call it before the browser launches.
 */
export const keepBasemapUnreachable = () => {
  isBasemapStoodIn = false;
};

/** The port of the basemap stand-in served over HTTPS (serveBasemapOverHttps), once it runs. */
let basemapPort = null;
/** Its certificate's public key, hashed as Chromium names a key to trust (SPKI, SHA-256, base64). */
let basemapKeyHash = null;

/**
 * Serves the basemap stand-in from a real server on a loopback port, over HTTPS with a certificate
 * made for this run, and has the run's browsers resolve tiles.openfreemap.org to it instead of
 * routing it: for the suites with a service worker. Playwright answering the worker's own
 * requests makes Chromium find a new worker on every update check, though /sw.js is unchanged
 * (.scratch/ci-flakes/issues/04). Call it before the browser launches. A live run reaches the
 * real host, as before.
 */
export const serveBasemapOverHttps = async () => {
  if (IS_LIVE) return;
  const folder = mkdtempSync(join(tmpdir(), 'para-basemap-'));
  const keyFile = join(folder, 'key.pem');
  const certificateFile = join(folder, 'certificate.pem');
  execFileSync(
    'openssl',
    [
      ...['req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1', '-nodes'],
      ...['-keyout', keyFile, '-out', certificateFile, '-days', '1'],
      ...['-subj', '/CN=tiles.openfreemap.org'],
    ],
    { stdio: 'ignore' },
  );
  const key = readFileSync(keyFile);
  const cert = readFileSync(certificateFile);
  rmSync(folder, { recursive: true });
  const server = createServer({ key, cert }, (request, response) => {
    const answer = basemapAnswer(`https://tiles.openfreemap.org${request.url}`);
    response.writeHead(answer.status ?? 200, {
      'content-type': answer.contentType,
      'access-control-allow-origin': '*',
    });
    response.end(answer.body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  // The suite's end is the server's: it keeps no run alive.
  server.unref();
  basemapPort = server.address().port;
  const publicKey = createPublicKey(cert).export({ type: 'spki', format: 'der' });
  basemapKeyHash = createHash('sha256').update(publicKey).digest('base64');
};

/**
 * A browser's launch options, while the HTTPS stand-in runs: the basemap's host resolved to it, and
 * its certificate, and no other, trusted.
 */
export const withStandInLaunch = (options = {}) =>
  basemapPort === null
    ? options
    : {
        ...options,
        args: [
          ...(options.args ?? []),
          `--host-resolver-rules=MAP tiles.openfreemap.org 127.0.0.1:${basemapPort}`,
          `--ignore-certificate-errors-spki-list=${basemapKeyHash}`,
        ],
      };

/** The stand-ins on `context`, unless the run is live. */
export const applyStandIns = async (context) => {
  if (IS_LIVE && !IS_RECORDING_OSRM) return;
  await context.route(OSRM, answerRouter);
  if (!IS_LIVE && isBasemapStoodIn && basemapPort === null) {
    await context.route(OPENFREEMAP, answerBasemap);
  }
  if (!IS_LIVE) await context.route(TURNSTILE, answerTurnstile);
  if (!IS_LIVE) await context.route(ELEVATION, answerElevation);
  const database = databaseUrl();
  // Recording too: the router's answers are recorded for the lines the stood-in tables draw.
  if ((!IS_LIVE || IS_RECORDING_OSRM) && database) {
    await context.route(
      (url) => url.href.startsWith(`${database}/rest/v1/`),
      answerRouteTables(unrecorded),
    );
  }
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
  console.log(
    '  A router request: re-record (tests/e2e/README.md), scripts/research/record-osrm.mjs. A database, Turnstile or elevation one names what its stand-in does not know.',
  );
  process.exitCode = 1;
});
