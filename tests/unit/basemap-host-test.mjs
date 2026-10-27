import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { mapAttribution } from '../../src/features/routes/map/map-attribution.ts';
import { BASEMAPS } from '../../src/features/routes/map/basemap.ts';
import {
  OPENFREEMAP_HOST,
  basemapStyleUrl,
  parseBasemapHost,
} from '../../src/shared/config/basemap-host.ts';
import { basemapCacheRules, withBasemapPreconnect } from '../../scripts/node/basemap-offline.ts';

const OWN = 'https://para-tiles.para-ph-info.workers.dev';

test('no host, or an empty one, is OpenFreeMap', () => {
  for (const unset of [undefined, '', '   '])
    assert.equal(parseBasemapHost(unset), OPENFREEMAP_HOST);
});

test('a host is read as an origin, with no trailing slash', () => {
  assert.equal(parseBasemapHost(OWN), OWN);
  assert.equal(parseBasemapHost(`${OWN}/`), OWN);
  assert.equal(parseBasemapHost(' http://localhost:8787 '), 'http://localhost:8787');
});

test('a host that is not an http(s) origin throws instead of falling back', () => {
  for (const bad of ['para-tiles', 'ftp://tiles.example', `${OWN}/styles`, `${OWN}?x=1`, 42]) {
    assert.throws(() => parseBasemapHost(bad), undefined, String(bad));
  }
});

test('both servers serve the styles under /styles/<name>', () => {
  assert.equal(
    basemapStyleUrl(OPENFREEMAP_HOST, 'liberty'),
    'https://tiles.openfreemap.org/styles/liberty',
  );
  assert.equal(basemapStyleUrl(OWN, 'liberty'), `${OWN}/styles/liberty`);
});

test('with no host configured the three designs are OpenFreeMap exactly as before', () => {
  assert.deepEqual(
    BASEMAPS.map((b) => b.url),
    ['positron', 'liberty', 'fiord'].map((n) => `https://tiles.openfreemap.org/styles/${n}`),
  );
});

// The worker's rules for OpenFreeMap before the host was configurable (vite.config.ts).
const legacyMeta = ({ url }) =>
  url.origin === 'https://tiles.openfreemap.org' &&
  (/^\/(styles|sprites|fonts)\//.test(url.pathname) || url.pathname === '/planet');
const legacyTiles = ({ url }) =>
  url.origin === 'https://tiles.openfreemap.org' &&
  /^\/(planet|natural_earth)\/.+\/\d+\/\d+\/\d+\.(pbf|png)$/.test(url.pathname);

const OFM = 'https://tiles.openfreemap.org';
const URLS = [
  `${OFM}/styles/positron`,
  `${OFM}/styles/liberty`,
  `${OFM}/sprites/ofm_f384/ofm.json`,
  `${OFM}/sprites/ofm_f384/ofm@2x.png`,
  `${OFM}/fonts/Noto%20Sans%20Regular/0-255.pbf`,
  `${OFM}/planet`,
  `${OFM}/planet/20260101_001001_pt/14/13490/7508.pbf`,
  `${OFM}/natural_earth/ne2sr/3/6/3.png`,
  `${OFM}/planet/20260101_001001_pt/14/13490/7508.png`,
  `${OFM}/planetary`,
  `${OFM}/12/3/4.pbf`,
  `${OFM}/`,
  `${OWN}/styles/positron`,
  `${OWN}/12/3/4.pbf`,
  `${OWN}/assets/fonts/Noto%20Sans%20Regular/0-255.pbf`,
  'https://tiles.openfreemap.org.evil.example/styles/positron',
  'https://example.com/planet',
  'https://supabase.co/rest/v1/route',
];

test('OpenFreeMap as the host is cached exactly as it was', () => {
  const rules = basemapCacheRules(OPENFREEMAP_HOST);
  for (const href of URLS) {
    const url = new URL(href);
    assert.equal(rules.meta.test(href), legacyMeta({ url }), `meta ${href}`);
    assert.equal(rules.tiles.test(href), legacyTiles({ url }), `tiles ${href}`);
  }
});

test('our own host is cached from its own paths and no other origin', () => {
  const rules = basemapCacheRules(OWN);
  const meta = (href) => rules.meta.test(href);
  const tiles = (href) => rules.tiles.test(href);
  assert.ok(meta(`${OWN}/styles/liberty`));
  assert.ok(meta(`${OWN}/assets/sprites/ofm.json`));
  assert.ok(meta(`${OWN}/assets/fonts/Noto%20Sans%20Regular/0-255.pbf`));
  assert.ok(tiles(`${OWN}/14/13490/7508.pbf`));
  assert.ok(!tiles(`${OWN}/health`));
  assert.ok(!meta(`${OWN}/health`));
  assert.ok(!meta(`${OWN}.evil.example/styles/liberty`));
  assert.ok(!tiles(`${OFM}/14/13490/7508.pbf`));
  assert.ok(!meta(`${OFM}/styles/liberty`));
});

test("the preconnect follows the host and index.html names OpenFreeMap's", () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const link = (host) => `<link rel="preconnect" href="${host}" crossorigin />`;
  assert.ok(html.includes(link(OPENFREEMAP_HOST)), 'index.html keeps the default');
  assert.equal(withBasemapPreconnect(html, OPENFREEMAP_HOST), html);
  const own = withBasemapPreconnect(html, OWN);
  assert.ok(own.includes(link(OWN)));
  assert.ok(!own.includes(link(OPENFREEMAP_HOST)));
  assert.equal(own.replace(link(OWN), link(OPENFREEMAP_HOST)), html, 'nothing else changes');
});

test('the credits keep OpenStreetMap whoever serves the tiles, and OpenMapTiles with ours', () => {
  const ofm = mapAttribution(OPENFREEMAP_HOST);
  assert.match(ofm, /© OpenStreetMap<\/a> contributors/);
  assert.match(ofm, />OpenFreeMap</);
  const own = mapAttribution(OWN);
  assert.match(own, /© OpenStreetMap<\/a> contributors/);
  assert.match(own, /© OpenMapTiles/);
  assert.ok(!own.includes('OpenFreeMap'));
  assert.match(own, /Route data © Para contributors, ODbL/);
});
