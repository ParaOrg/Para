// The tiles Worker's style rewrite and its CORS rule.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/tiles-worker-style-test.mjs
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../../workers/tiles/src/app.ts';
import { isAllowedOrigin } from '../../workers/tiles/src/cors.ts';
import { rewriteStyle } from '../../workers/tiles/src/styles.ts';
import { buildPmtiles, fakeBucket } from './tiles-worker-fixture.mjs';

const OWN = 'https://tiles.example';
const HEADER = { bounds: [120.6, 14.1, 121.5, 15.05], maxZoom: 14 };

const liberty = () => ({
  version: 8,
  name: 'Liberty',
  sprite: 'https://tiles.openfreemap.org/sprites/ofm_f384/ofm',
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
    ne2_shaded: {
      type: 'raster',
      tiles: ['https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png'],
      maxzoom: 6,
    },
  },
  layers: [
    { id: 'background', type: 'background' },
    { id: 'natural_earth', type: 'raster', source: 'ne2_shaded' },
    { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water' },
  ],
});

test('the style reads our tiles, sprite and glyphs and nothing is left on OpenFreeMap', () => {
  const style = rewriteStyle(liberty(), OWN, HEADER);
  assert.deepEqual(style.sources.openmaptiles, {
    type: 'vector',
    tiles: [`${OWN}/{z}/{x}/{y}.pbf`],
    minzoom: 0,
    maxzoom: 14,
    bounds: HEADER.bounds,
  });
  assert.equal(style.sprite, `${OWN}/assets/sprites/ofm`);
  assert.equal(style.glyphs, `${OWN}/assets/fonts/{fontstack}/{range}.pbf`);
  assert.ok(!JSON.stringify(style).includes('tiles.openfreemap.org'));
});

test('no source carries an attribution: the app holds the credit', () => {
  for (const source of Object.values(rewriteStyle(liberty(), OWN, HEADER).sources)) {
    assert.ok(!('attribution' in source));
  }
});

test('the natural_earth raster source and its layer are dropped, the other layers stay', () => {
  const style = rewriteStyle(liberty(), OWN, HEADER);
  assert.deepEqual(Object.keys(style.sources), ['openmaptiles']);
  assert.deepEqual(
    style.layers.map((layer) => layer.id),
    ['background', 'water'],
  );
});

test('the style takes its maxzoom from the file', () => {
  const style = rewriteStyle(liberty(), OWN, { ...HEADER, maxZoom: 12 });
  assert.equal(style.sources.openmaptiles.maxzoom, 12);
});

// OpenFreeMap's Positron as served on 2026-10-27, untouched.
test("OpenFreeMap's real Positron style is rewritten with nothing left on OpenFreeMap", () => {
  const original = JSON.parse(
    readFileSync(new URL('./fixtures/openfreemap-positron-style.json', import.meta.url), 'utf8'),
  );
  assert.ok(JSON.stringify(original).includes('tiles.openfreemap.org'));
  const style = rewriteStyle(original, OWN, HEADER);
  assert.ok(!JSON.stringify(style).includes('openfreemap'));
  assert.deepEqual(Object.keys(style.sources), ['openmaptiles']);
  assert.ok(!('attribution' in style.sources.openmaptiles));
  assert.equal(style.sprite, `${OWN}/assets/sprites/ofm`);
  assert.equal(style.glyphs, `${OWN}/assets/fonts/{fontstack}/{range}.pbf`);
  assert.equal(style.layers.length, original.layers.length);
  assert.equal(style.layers.at(-1).id, original.layers.at(-1).id);
});

test('a style without the openmaptiles source is refused', () => {
  const bad = { version: 8, sources: {}, layers: [] };
  assert.throws(() => rewriteStyle(bad, OWN, HEADER), /openmaptiles/);
});

test('GET /styles/liberty serves the stored style rewritten to the request origin', async () => {
  const files = new Map([
    [
      'tiles/parapo-2026-10-27.pmtiles',
      buildPmtiles([
        [0, 0, 0],
        [1, 0, 0],
      ]),
    ],
    [
      'tiles/current.json',
      Buffer.from(JSON.stringify({ file: 'parapo-2026-10-27.pmtiles', builtAt: 'x' })),
    ],
    ['assets/styles/liberty.json', Buffer.from(JSON.stringify(liberty()))],
  ]);
  globalThis.caches = undefined;
  const app = createApp();
  const response = await app(
    new Request(`${OWN}/styles/liberty`),
    { TILES: fakeBucket(files) },
    { waitUntil() {} },
  );
  assert.equal(response.status, 200);
  const style = await response.json();
  assert.equal(style.sources.openmaptiles.tiles[0], `${OWN}/{z}/{x}/{y}.pbf`);
  assert.deepEqual(style.sources.openmaptiles.bounds, HEADER.bounds);
  assert.ok(!JSON.stringify(style).includes('openfreemap'));
});

const ALLOWED = [
  'https://parapo.villaralvorovic2.workers.dev',
  'https://staging-parapo.villaralvorovic2.workers.dev',
  'https://3f2a9c1b-parapo.villaralvorovic2.workers.dev',
  'https://claude-own-tiles-parapo.villaralvorovic2.workers.dev',
  'https://parapo.para-ph-info.workers.dev',
  'https://staging-parapo.para-ph-info.workers.dev',
  'https://3f2a9c1b-parapo.para-ph-info.workers.dev',
  'https://claude-own-tiles-parapo.para-ph-info.workers.dev',
  'http://localhost:5173',
];
const REFUSED = [
  'https://evil.example',
  'https://parapo.villaralvorovic2.workers.dev.evil.example',
  'https://evil-parapo.villaralvorovic2.workers.dev.evil.example',
  'http://parapo.villaralvorovic2.workers.dev',
  'https://parapo.other-account.workers.dev',
  'https://x-parapo.villaralvorovic2.workers.dev/',
  'https://parapo.para-ph-info.workers.dev.evil.example',
  'https://evil-parapo.para-ph-info.workers.dev.evil.example',
  'http://parapo.para-ph-info.workers.dev',
  'https://x-parapo.para-ph-info.workers.dev/',
  'http://localhost:3000',
  'null',
];

test('ParaPo origins are allowed and every other origin is not', () => {
  for (const origin of ALLOWED) assert.equal(isAllowedOrigin(origin), true, origin);
  for (const origin of REFUSED) assert.equal(isAllowedOrigin(origin), false, origin);
});

test('the extra origins from vars are allowed too, exactly', () => {
  const extra = 'https://parapo.example, https://tiles-user.example';
  assert.equal(isAllowedOrigin('https://parapo.example', extra), true);
  assert.equal(isAllowedOrigin('https://tiles-user.example', extra), true);
  assert.equal(isAllowedOrigin('https://parapo.example.evil', extra), false);
  assert.equal(isAllowedOrigin('https://parapo.example', ''), false);
});

async function ask(headers, method = 'GET') {
  const files = new Map([
    ['tiles/parapo-2026-10-27.pmtiles', buildPmtiles([[0, 0, 0]])],
    [
      'tiles/current.json',
      Buffer.from(JSON.stringify({ file: 'parapo-2026-10-27.pmtiles', builtAt: 'x' })),
    ],
  ]);
  globalThis.caches = undefined;
  return createApp()(
    new Request(`${OWN}/0/0/0.pbf`, { method, headers }),
    { TILES: fakeBucket(files), EXTRA_ORIGINS: 'https://parapo.example' },
    { waitUntil() {} },
  );
}

test('an allowed origin gets CORS headers; a request with no Origin is served without them', async () => {
  const withOrigin = await ask({ Origin: 'http://localhost:5173' });
  assert.equal(withOrigin.status, 200);
  assert.equal(withOrigin.headers.get('Access-Control-Allow-Origin'), 'http://localhost:5173');
  assert.equal(withOrigin.headers.get('Vary'), 'Origin');
  const without = await ask({});
  assert.equal(without.status, 200);
  assert.equal(without.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(without.headers.get('Vary'), 'Origin');
});

test('another origin is refused and gets no CORS headers', async () => {
  const response = await ask({ Origin: 'https://evil.example' });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
});

test('a preflight from an allowed extra origin is answered; from another it is refused', async () => {
  const ok = await ask({ Origin: 'https://parapo.example' }, 'OPTIONS');
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), 'https://parapo.example');
  const no = await ask({ Origin: 'https://evil.example' }, 'OPTIONS');
  assert.equal(no.status, 403);
});
