// Draws the three designs at the three spots and three zooms, over OpenFreeMap's tiles and the
// spike's own, and lists every outside URL the maps fetched.
// Usage: node scripts/research/tiles-render.mjs <file.pmtiles> <outDir> [summary.json]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import { startServer } from './tiles-serve.mjs';
import { DESIGNS, SPOTS, ZOOMS } from './tiles-spots.mjs';

const [pmtilesPath, outDir, summaryPath] = process.argv.slice(2);
if (!pmtilesPath || !outDir) throw new Error('usage: tiles-render.mjs <file.pmtiles> <outDir>');
mkdirSync(outDir, { recursive: true });

const pageDir = fileURLToPath(new URL('../../node_modules/.tiles-spike-page', import.meta.url));
const SIZE = { width: 640, height: 480 };
const SOURCES = ['ofm', 'ours'];

const server = await startServer({ pmtilesPath, staticDir: pageDir });
const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});
const page = await browser.newPage({ viewport: SIZE });

/** Which kind of file an outside URL is, for the list of what still comes from OpenFreeMap. */
function kindOf(url) {
  const { pathname } = new URL(url);
  if (pathname.startsWith('/styles/')) return 'style';
  if (pathname.startsWith('/sprites/')) return 'sprite';
  if (pathname.startsWith('/fonts/')) return 'glyphs';
  if (pathname.startsWith('/natural_earth/')) return 'raster';
  if (pathname === '/planet') return 'tilejson';
  if (pathname.startsWith('/planet/')) return 'vector tile';
  return 'other';
}
let current = null;
const outside = new Map();
page.on('request', (req) => {
  const url = req.url();
  if (url.startsWith(server.origin) || url.startsWith('data:') || url.startsWith('blob:')) return;
  const key = `${kindOf(url)} ${new URL(url).host}${new URL(url).pathname
    .replace(/\/\d+\/\d+\/\d+(\.\w+)$/, '/{z}/{x}/{y}$1')
    .replace(/\/\d+-\d+\.pbf$/, '/{range}.pbf')
    .replace(/\/fonts\/[^/]+\//, '/fonts/{fontstack}/')}`;
  const entry = outside.get(key) ?? { requests: 0, seenWith: new Set() };
  entry.requests += 1;
  entry.seenWith.add(current);
  outside.set(key, entry);
});

await page.goto(`${server.origin}/`);
await page.waitForFunction(() => window.renderReady === true);

const shots = [];
for (const source of SOURCES) {
  for (const basemapId of DESIGNS) {
    for (const spot of SPOTS) {
      for (const zoom of ZOOMS) {
        const name = `${source}-${basemapId}-${spot.id}-z${zoom}.png`;
        current = `${source}/${basemapId}`;
        const result = await page.evaluate((args) => window.renderMap(args), {
          basemapId,
          source: source === 'ours' ? 'ours' : 'ofm',
          lng: spot.lng,
          lat: spot.lat,
          zoom,
        });
        await page.screenshot({ path: join(outDir, name) });
        shots.push({ name, source, basemapId, spot: spot.id, zoom, errors: result.errors });
        console.log(name, result.errors.length ? `${result.errors.length} errors` : 'ok');
      }
    }
  }
}

// One contact sheet per design and spot: OpenFreeMap left, ours right, a row per zoom.
const sheet = await browser.newPage({
  viewport: { width: SIZE.width * 2, height: SIZE.height * ZOOMS.length },
});
const sheets = [];
for (const basemapId of DESIGNS) {
  for (const spot of SPOTS) {
    const cell = (source, zoom) =>
      `<img width="${SIZE.width}" height="${SIZE.height}" src="data:image/png;base64,${readFileSync(join(outDir, `${source}-${basemapId}-${spot.id}-z${zoom}.png`)).toString('base64')}">`;
    const rows = ZOOMS.map(
      (z) => `<div style="display:flex">${cell('ofm', z)}${cell('ours', z)}</div>`,
    ).join('');
    await sheet.setContent(`<body style="margin:0;background:#fff">${rows}</body>`);
    const name = `sheet-${basemapId}-${spot.id}.png`;
    await sheet.screenshot({ path: join(outDir, name) });
    sheets.push(name);
  }
}

await browser.close();
server.close();

const render = {
  size: SIZE,
  shots,
  sheets,
  outsideRequests: [...outside.entries()]
    .map(([url, e]) => ({ url, requests: e.requests, seenWith: [...e.seenWith].sort() }))
    .sort((a, b) => a.url.localeCompare(b.url)),
};
writeFileSync(join(outDir, 'render.json'), JSON.stringify(render, null, 2));
if (summaryPath) {
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  writeFileSync(summaryPath, JSON.stringify({ ...summary, render }, null, 2));
}
