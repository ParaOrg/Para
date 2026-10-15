// Monochrome (src/features/routes/map/monochrome.ts): Positron's detail and cool gray,
// and a style without OpenFreeMap's tiles left as it is.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/monochrome-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monochromeStyle } from '../../src/features/routes/map/monochrome.ts';

const line = (id, cls, extra = {}) => ({
  id,
  type: 'line',
  source: 'openmaptiles',
  'source-layer': 'transportation',
  filter: ['==', ['get', 'class'], cls],
  paint: { 'line-color': '#fff' },
  ...extra,
});

/** Enough of Positron for every addition to find its place. */
const positron = () => ({
  version: 8,
  sources: { openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': 'rgb(242,243,240)' } },
    { id: 'building', type: 'fill', source: 'openmaptiles', 'source-layer': 'building', paint: {} },
    line('tunnel_motorway_casing', 'motorway'),
    line('highway_path', 'path'),
    line('highway_minor', 'minor'),
    line('highway_major_casing', 'primary'),
    line('highway_major_inner', 'primary'),
    line('highway_motorway_bridge_casing', 'motorway'),
    line('highway_motorway_bridge_inner', 'motorway'),
    {
      id: 'label_city',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      layout: {},
    },
  ],
});

test("the e2e suites' bare style, with no OpenFreeMap tiles, is left as it is", () => {
  const bare = {
    version: 8,
    sources: {},
    layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#eeeeee' } }],
  };
  assert.equal(monochromeStyle(bare), bare);
});

test('Positron gets the detail where its layers are, and in cool gray, the input untouched', () => {
  const input = positron();
  const before = structuredClone(input);
  const ids = monochromeStyle(input).layers.map((l) => l.id);
  assert.deepEqual(input, before, 'the style handed in is left alone');
  // Underpasses under everything, the bridges in place of Positron's motorway ones, lowest first.
  assert.ok(ids.indexOf('detail-tunnel') < ids.indexOf('tunnel_motorway_casing'));
  assert.ok(!ids.includes('highway_motorway_bridge_casing'));
  assert.ok(ids.indexOf('detail-bridge-1') < ids.indexOf('detail-bridge-4'));
  // The 3D buildings and the arrows before the first label; the places last, rail stations on top.
  assert.ok(ids.indexOf('detail-buildings-3d') < ids.indexOf('label_city'));
  assert.ok(ids.indexOf('detail-one-way') < ids.indexOf('label_city'));
  assert.equal(ids.at(-1), 'detail-rail-stops');
  // No busway of the basemap's own (the owner, 2026-10-15).
  assert.ok(!ids.includes('detail-busway'));
});

test('every colour turns cool gray, keeping its lightness', () => {
  const styled = monochromeStyle(positron());
  const ground = styled.layers.find((l) => l.id === 'background').paint['background-color'];
  const [hue, saturation, lightness] = ground.match(/[\d.]+/g).map(Number);
  assert.equal(hue, 218);
  assert.equal(saturation, 14);
  assert.ok(Math.abs(lightness - 94.7) < 0.2, `${lightness}`);
});
