// A load test of the public map and its tiles, played as commuters opening the
// map for the first time (.scratch/ready-for-100k/issues/03-load-test-on-staging.md).
// Run by hand, never from CI and never on a schedule. Plain Node, no dependency.
//
//   NODE_USE_ENV_PROXY=1 node scripts/research/load-test.mjs [options]
//
//   --site <origin>        the static site (default the staging site below)
//   --tiles <origin>       the tiles Worker (default https://tiles.para-commute.org)
//   --peak <visits/s>      visits started per second once ramped up (default 0.5)
//   --ramp <s>             seconds to climb from nothing to --peak (default 60)
//   --hold <s>             seconds to stay at --peak (default 60)
//   --visits <n>           stop starting visits after n, whatever the clock says
//   --tile-budget <n>      requests to the tiles host this run may make (default 2000)
//   --spent <n>            requests already made today, taken off the budget (default 0)
//   --json <file>          write every request and the summary there
//
// NODE_USE_ENV_PROXY=1 makes Node's fetch use HTTPS_PROXY where there is one, as
// in a cloud container; on a home connection leave it out.
//
// Each visit fetches what a first visit fetches: the page, the scripts and
// styles it names, /data/index.v5.json and two or three line files from the
// site; then the positron style (the default basemap) and 29 tiles around one
// hotspot from the published index, 2×2 at zoom 12, 3×3 at 13 and 4×4 at 14, from
// the tiles host, at the address the style gives. The archive stops at zoom 14
// and MapLibre draws closer zooms from those tiles, so a zoom above the style's
// maxzoom is never asked for. Picking spots from the index makes visits overlap the way
// commuters around the same terminals do, so the edge cache sees real reuse.
//
// The tiles Worker is shared with production and its Free plan stops at 100,000
// requests a day, so every request to the tiles host (style and tiles alike) is
// counted against --tile-budget before it is sent, and the run stops when it
// is spent. A 429 or a Cloudflare block from either host stops the run at once:
// a rate-limit rule would block one machine long before it measured anything.

import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const DEFAULT_SITE = 'https://staging-parapo.villaralvorovic2.workers.dev';
const DEFAULT_TILES = 'https://tiles.para-commute.org';
const STYLE_NAME = 'positron';
// [zoom, tiles across]: 4 + 9 + 16 = 29 tiles a visit.
const TILE_GRID = [
  [12, 2],
  [13, 3],
  [14, 4],
];
// A browser opens about six connections a host; a visit asks for no more at once.
const PER_VISIT_PARALLEL = 6;
const TICK_MS = 100;

const { values: options } = parseArgs({
  options: {
    site: { type: 'string', default: DEFAULT_SITE },
    tiles: { type: 'string', default: DEFAULT_TILES },
    peak: { type: 'string', default: '0.5' },
    ramp: { type: 'string', default: '60' },
    hold: { type: 'string', default: '60' },
    visits: { type: 'string' },
    'tile-budget': { type: 'string', default: '2000' },
    spent: { type: 'string', default: '0' },
    json: { type: 'string' },
  },
});

function readNumber(name, isInteger) {
  const value = Number(options[name]);
  const isValid = Number.isFinite(value) && value >= 0 && (!isInteger || Number.isInteger(value));
  if (!isValid) throw new Error(`--${name} must be a ${isInteger ? 'whole ' : ''}number ≥ 0.`);
  return value;
}

const site = new URL(options.site).origin;
const tilesHost = new URL(options.tiles).origin;
const styleUrl = `${tilesHost}/styles/${STYLE_NAME}`;
const peak = readNumber('peak', false);
const rampSeconds = readNumber('ramp', false);
const holdSeconds = readNumber('hold', false);
const visitLimit = options.visits === undefined ? Infinity : readNumber('visits', true);
const spentBefore = readNumber('spent', true);
const tileBudget = readNumber('tile-budget', true) - spentBefore;
if (tileBudget <= 0) throw new Error('No tile budget left: --tile-budget minus --spent is 0.');

class BlockedError extends Error {}
class BudgetSpentError extends Error {}

const results = [];
let tileRequests = 0;
let stopReason = '';

/** Reserves one tiles-host request before it is sent, so parallel visits never overshoot. */
function reserveTileRequest() {
  if (tileRequests >= tileBudget) throw new BudgetSpentError();
  tileRequests += 1;
  if (tileRequests % 100 === 0) {
    console.warn(`tile requests: ${tileRequests} this run, ${spentBefore + tileRequests} today`);
  }
}

function isBlock(response, body) {
  if (response.status === 429) return true;
  if (response.headers.has('cf-mitigated')) return true;
  // Cloudflare's own block page, as opposed to a 403 from the Worker's origin check.
  return response.status === 403 && /cloudflare/i.test(body) && /blocked|ray id/i.test(body);
}

async function timedGet(group, url) {
  if (stopReason) throw new BudgetSpentError();
  if (url.startsWith(`${tilesHost}/`)) reserveTileRequest();
  const started = performance.now();
  const record = { group, url, status: 0, ms: 0, bytes: 0, cache: '', colo: '' };
  try {
    // The site's own origin, as the page's requests carry it; the Worker allows it.
    const response = await fetch(url, { headers: { Origin: site } });
    const body = new Uint8Array(await response.arrayBuffer());
    record.ms = performance.now() - started;
    record.status = response.status;
    record.bytes = body.byteLength;
    // The tiles Worker's Cache API hits carry HIT; a tile it made from R2 carries none.
    record.cache = response.headers.get('cf-cache-status') ?? 'none';
    record.colo = response.headers.get('cf-ray')?.split('-')[1] ?? '';
    results.push(record);
    const text = response.ok ? '' : new TextDecoder().decode(body.slice(0, 4000));
    if (isBlock(response, text)) {
      stopReason = `blocked: ${response.status} on ${url}`;
      throw new BlockedError(stopReason);
    }
    return { response, body };
  } catch (error) {
    if (error instanceof BlockedError) throw error;
    record.ms = performance.now() - started;
    record.status = -1;
    record.error = error instanceof Error ? error.message : String(error);
    results.push(record);
    return undefined;
  }
}

async function inBatches(urls, run) {
  for (let i = 0; i < urls.length; i += PER_VISIT_PARALLEL) {
    await Promise.all(urls.slice(i, i + PER_VISIT_PARALLEL).map(run));
  }
}

function tileOf(lng, lat, zoom) {
  const scale = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * scale);
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y = Math.floor((0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale);
  return { x, y };
}

function tileUrlsAround([lng, lat], { template, maxZoom }) {
  const urls = [];
  for (const [zoom, across] of TILE_GRID.filter(([zoom]) => zoom <= maxZoom)) {
    const centre = tileOf(lng, lat, zoom);
    const first = -Math.floor((across - 1) / 2);
    for (let dx = first; dx < first + across; dx++) {
      for (let dy = first; dy < first + across; dy++) {
        const address = { z: zoom, x: centre.x + dx, y: centre.y + dy };
        urls.push(template.replace(/\{([zxy])\}/g, (_, key) => String(address[key])));
      }
    }
  }
  return urls;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** The page's own scripts, styles and preloads, by the addresses its HTML names. */
function pageFiles(html) {
  const found = new Set();
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*>/g)) {
    const tag = match[0];
    const isWanted = tag.startsWith('<script') || /rel="(stylesheet|modulepreload)"/.test(tag);
    const address = /(?:src|href)="([^"]+)"/.exec(tag)?.[1];
    if (isWanted && address?.startsWith('/')) found.add(`${site}${address}`);
  }
  return [...found];
}

async function loadIndex() {
  // Read once before the clock starts, and kept out of the visits' numbers.
  const page = await timedGet('setup', `${site}/`);
  const index = await timedGet('setup', `${site}/data/index.v5.json`);
  if (!page?.response.ok || !index?.response.ok) {
    throw new Error(`The site did not serve its page and index: ${site}`);
  }
  const parsed = JSON.parse(new TextDecoder().decode(index.body));
  const spots = parsed.stops.map((hotspot) => hotspot.point?.coordinates).filter(Boolean);
  const directionIds = parsed.variants.map((direction) => direction.id);
  if (spots.length === 0 || directionIds.length === 0)
    throw new Error('The index has no hotspots.');

  const style = await timedGet('setup', styleUrl);
  if (!style?.response.ok) throw new Error(`The tiles host did not serve its style: ${styleUrl}`);
  const source = JSON.parse(new TextDecoder().decode(style.body)).sources?.openmaptiles;
  const template = source?.tiles?.[0];
  if (!template?.startsWith(`${tilesHost}/`)) {
    throw new Error(`The style's tiles are not on ${tilesHost}: ${template}`);
  }
  const tiles = { template, maxZoom: source.maxzoom ?? 14 };
  return { files: pageFiles(new TextDecoder().decode(page.body)), spots, directionIds, tiles };
}

async function visit({ files, spots, directionIds, tiles }) {
  const lineCount = 2 + Math.floor(Math.random() * 2);
  const lines = Array.from({ length: lineCount }, () => pick(directionIds));
  const siteUrls = [
    `${site}/`,
    ...files,
    `${site}/data/index.v5.json`,
    ...lines.map((id) => `${site}/data/lines/${id}.json`),
  ];
  await inBatches(siteUrls, (url) => timedGet('site', url));
  await timedGet('tiles', styleUrl);
  await inBatches(tileUrlsAround(pick(spots), tiles), (url) => timedGet('tiles', url));
}

function percentile(sorted, share) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(share * sorted.length) - 1)];
}

function summarise(group, visitCount) {
  const rows = results.filter((row) => row.group === group);
  const times = rows.map((row) => row.ms).sort((a, b) => a - b);
  const errors = rows.filter((row) => row.status < 200 || row.status >= 400);
  const cache = Object.groupBy(rows, (row) => row.cache);
  const hits = cache.HIT?.length ?? 0;
  const slowest = [...rows].sort((a, b) => b.ms - a.ms).slice(0, 5);
  return {
    requests: rows.length,
    medianMs: Math.round(percentile(times, 0.5)),
    p99Ms: Math.round(percentile(times, 0.99)),
    errors: errors.length,
    errorsByStatus: Object.fromEntries(
      Object.entries(Object.groupBy(errors, (row) => String(row.status))).map(([status, list]) => [
        status,
        list.length,
      ]),
    ),
    cacheStatus: Object.fromEntries(Object.entries(cache).map(([key, list]) => [key, list.length])),
    hitShare: rows.length ? hits / rows.length : 0,
    colos: [...new Set(rows.map((row) => row.colo).filter(Boolean))],
    perThousandVisits: visitCount ? Math.round((rows.length / visitCount) * 1000) : 0,
    missesPerThousandVisits: visitCount
      ? Math.round(((rows.length - hits) / visitCount) * 1000)
      : 0,
    slowest: slowest.map((row) => ({ ...row, ms: Math.round(row.ms) })),
  };
}

function plannedVisits() {
  const byClock = peak * (rampSeconds / 2 + holdSeconds);
  return Math.min(visitLimit, Math.floor(byClock));
}

async function run() {
  const planned = plannedVisits();
  const perVisit = 1 + TILE_GRID.reduce((sum, [, across]) => sum + across * across, 0);
  console.warn(
    `site ${site}, tiles ${tilesHost}: about ${planned} visits, ${planned * perVisit} tile requests planned, budget ${tileBudget}`,
  );
  const shared = await loadIndex();
  const started = performance.now();
  const running = new Set();
  let begun = 0;
  let owed = 0;

  while (!stopReason) {
    const elapsed = (performance.now() - started) / 1000;
    if (elapsed >= rampSeconds + holdSeconds || begun >= visitLimit) break;
    const rate = rampSeconds > 0 ? peak * Math.min(1, elapsed / rampSeconds) : peak;
    owed += (rate * TICK_MS) / 1000;
    while (owed >= 1 && begun < visitLimit) {
      owed -= 1;
      begun += 1;
      const visiting = visit(shared).catch((error) => {
        if (error instanceof BudgetSpentError) stopReason ||= 'tile budget spent';
        else if (error instanceof BlockedError) stopReason ||= error.message;
        else throw error;
      });
      running.add(visiting);
      visiting.finally(() => running.delete(visiting));
    }
    await new Promise((resolve) => setTimeout(resolve, TICK_MS));
  }
  await Promise.all(running);

  const report = {
    peakVisitsPerSecond: peak,
    rampSeconds,
    holdSeconds,
    visitsStarted: begun,
    seconds: Math.round((performance.now() - started) / 1000),
    stopReason: stopReason || 'finished',
    tileRequests,
    tileRequestsToday: spentBefore + tileRequests,
    tileBudget,
    site: { origin: site, ...summarise('site', begun) },
    tiles: { origin: tilesHost, ...summarise('tiles', begun) },
  };
  console.log(JSON.stringify(report, null, 2));
  if (options.json) writeFileSync(options.json, JSON.stringify({ report, results }, null, 2));
  if (stopReason.startsWith('blocked')) process.exitCode = 2;
}

await run();
