// A hotspot's pin (src/features/routes/map/hotspot-pins.ts): where it stands,
// the middle of its box and always inside it, however the box bends
// (src/features/routes/geo/box-centre.ts, boxCentre); the zoom it comes in at,
// the one where the scale bar first reads 500 m at Manila's latitude, with its
// dot below it, never both, growing from 6 px to 16 px; the names a zoom later,
// where the bar first reads 300 m; and a tap on a pin or a dot, the box's own, even
// where a route runs under it (src/features/routes/map/tap.ts).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/map-pins-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPropertyExpression, latest } from '@maplibre/maplibre-gl-style-spec';
import { boxCentre, ringCentroid } from '../../src/features/routes/geo/box-centre.ts';
import { pointInRing } from '../../src/features/routes/geo/ring.ts';
import {
  DOT,
  PIN,
  PIN_LAYER,
  PINS_FROM_ZOOM,
  addHotspotPins,
  hotspotPinsData,
} from '../../src/features/routes/map/hotspot-pins.ts';
import { NAMES_FROM } from '../../src/features/routes/map/saved-hotspots-labels.ts';
import {
  HOTSPOTS_FILL_LAYER,
  ROUTES_HIT_LAYER,
  tapTargets,
} from '../../src/features/routes/map/tap.ts';
import { haversine } from '../../src/shared/utils/geo.ts';

// ------------------------------------------------------------ the centre

// About 10 m by 8 m on Quirino Highway, 6-decimal corners as saved.
const square = [
  [121.040123, 14.700456],
  [121.040215, 14.700456],
  [121.040215, 14.700528],
  [121.040123, 14.700528],
];

test('a convex box has its pin at its centroid', () => {
  assert.deepEqual(boxCentre(square), ringCentroid(square));
  assert.ok(haversine(boxCentre(square), [121.040169, 14.700492]) < 0.01);
});

// A U, open to the north: its centroid falls in the gap between its arms.
const u = [
  [121.0, 14.6],
  [121.0003, 14.6],
  [121.0003, 14.6003],
  [121.0002, 14.6003],
  [121.0002, 14.6001],
  [121.0001, 14.6001],
  [121.0001, 14.6003],
  [121.0, 14.6003],
];

test('a non-convex box whose centroid falls outside it has its pin inside, either winding', () => {
  assert.ok(!pointInRing(ringCentroid(u), u), 'the U leaves its centroid in the gap');
  for (const ring of [u, [...u].reverse()]) {
    const c = boxCentre(ring);
    assert.ok(pointInRing(c, ring), `${c} is inside`);
    // On the centroid's latitude, in the middle of one arm.
    assert.ok(Math.abs(c[1] - ringCentroid(ring)[1]) < 1e-12);
  }
});

test('an L keeps its pin inside, and a C round the other way', () => {
  const l = [
    [121.0, 14.6],
    [121.0004, 14.6],
    [121.0004, 14.60005],
    [121.00005, 14.60005],
    [121.00005, 14.6004],
    [121.0, 14.6004],
  ];
  const c = u.map(([x, y]) => [121.0 + (y - 14.6), 14.6 + (x - 121.0)]);
  for (const ring of [l, c]) assert.ok(pointInRing(boxCentre(ring), ring), `${boxCentre(ring)}`);
});

test('a ring with no inside keeps its centroid, and an empty one [0, 0]', () => {
  const line = [
    [121.0, 14.6],
    [121.001, 14.6],
    [121.002, 14.6],
  ];
  assert.deepEqual(boxCentre(line), ringCentroid(line));
  assert.deepEqual(boxCentre([]), [0, 0]);
});

test('each box with an area gets one pin point, inside it, with its id and kind', () => {
  const hotspot = (id, kind, ring) => ({
    id,
    kind,
    area: ring && { type: 'Polygon', coordinates: [[...ring, ring[0]]] },
  });
  const data = hotspotPinsData([
    hotspot('t1', 'terminal', square),
    hotspot('h1', 'hintuan', u),
    hotspot('p1', 'hintuan', null),
  ]);
  assert.deepEqual(
    data.features.map((f) => f.properties),
    [
      { id: 't1', kind: 'terminal' },
      { id: 'h1', kind: 'hintuan' },
    ],
  );
  assert.ok(pointInRing(data.features[1].geometry.coordinates, u));
});

// ------------------------------------------------------------ the zoom

/** Metres the scale bar's 100 px cover at Manila (14.6° N), MapLibre's tiles being 512 px. */
const barMetres = (zoom) =>
  (100 * 40_075_016.686 * Math.cos((14.6 * Math.PI) / 180)) / (512 * 2 ** zoom);

/** What MapLibre's ScaleControl reads over `metres`: the largest 1, 2, 3 or 5 × 10ⁿ in it. */
const barReads = (metres) => {
  const tens = 10 ** Math.floor(Math.log10(metres));
  return [5, 3, 2, 1].find((step) => step * tens <= metres) * tens;
};

test('the pins come in the moment the scale bar first reads 500 m: its 100 px under 1000 m', () => {
  assert.ok(Math.abs(barMetres(PINS_FROM_ZOOM) - 1000) < 1e-6);
  assert.ok(Math.abs(PINS_FROM_ZOOM - 12.89) < 0.01, `${PINS_FROM_ZOOM}`);
  assert.equal(barReads(barMetres(PINS_FROM_ZOOM - 0.01)), 1000);
  assert.equal(barReads(barMetres(PINS_FROM_ZOOM + 0.01)), 500);
});

test('the names come in the moment the scale bar first reads 300 m: its 100 px under 500 m', () => {
  assert.ok(Math.abs(barMetres(NAMES_FROM) - 500) < 1e-6);
  assert.ok(Math.abs(NAMES_FROM - 13.89) < 0.01, `${NAMES_FROM}`);
  assert.equal(barReads(barMetres(NAMES_FROM - 0.01)), 500);
  assert.equal(barReads(barMetres(NAMES_FROM + 0.01)), 300);
  assert.ok(NAMES_FROM > PINS_FROM_ZOOM, 'the pins before the names');
});

test('the dot is 6 px across to zoom 11, grows evenly to 16 px at the pins, and never past it', () => {
  const layers = [];
  addHotspotPins({ addSource: () => {}, addLayer: (l) => layers.push(l) }, []);
  const dot = layers.find((l) => l.id === DOT);
  const radius = createPropertyExpression(
    dot.paint['circle-radius'],
    'paint',
    latest.paint_circle['circle-radius'],
  );
  assert.equal(radius.result, 'success');
  const at = (zoom) => radius.value.evaluate({ zoom });
  assert.equal(at(8), 3, 'zoom 8');
  assert.equal(at(11), 3, 'zoom 11');
  const halfway = (11 + PINS_FROM_ZOOM) / 2;
  assert.ok(Math.abs(at(halfway) - 5.5) < 1e-9, `halfway, zoom ${halfway}: ${at(halfway)}`);
  assert.ok(Math.abs(at(PINS_FROM_ZOOM) - 8) < 1e-9, `at the pins: ${at(PINS_FROM_ZOOM)}`);
  for (let z = 0; z <= 24; z += 0.25) assert.ok(at(z) <= 8, `16 px across at most, zoom ${z}`);
  for (let z = 11; z < PINS_FROM_ZOOM - 0.25; z += 0.25)
    assert.ok(at(z + 0.25) > at(z), `growing, zoom ${z}`);
});

test('the dot below that zoom and the pin from it: one or the other, never both', () => {
  const layers = [];
  addHotspotPins({ addSource: () => {}, addLayer: (l) => layers.push(l) }, []);
  const dot = layers.find((l) => l.id === DOT);
  const pin = PIN_LAYER;
  assert.equal(pin.id, PIN);
  assert.equal(pin.source, dot.source, 'one source of points');
  // MapLibre draws a layer from its minzoom, inclusive, to its maxzoom, exclusive.
  const drawn = (l, z) => z >= (l.minzoom ?? 0) && z < (l.maxzoom ?? 24);
  for (const z of [10, 12.5, 12.88, PINS_FROM_ZOOM, 12.9, 13.9, 15.9, 17, 20]) {
    assert.equal(drawn(dot, z) + drawn(pin, z), 1, `zoom ${z}`);
    assert.equal(drawn(pin, z), z >= PINS_FROM_ZOOM, `zoom ${z}`);
  }
  assert.equal(dot.type, 'circle');
  assert.equal(pin.layout['icon-anchor'], 'bottom-left');
  assert.deepEqual(pin.layout['icon-offset'], [-2, 0], "the stem's middle on the point");
});

// ------------------------------------------------------------ the tap

/**
 * A map with a pin, a dot, a box and a route's hit area; `under` gives, for each layer and a
 * point or a box, what a query there finds. One query may ask several layers: what each finds,
 * in the order asked, which is the map's topmost first. Every query is counted in `asked`.
 */
function standIn(under) {
  const asked = [];
  const layers = new Set([PIN, DOT, HOTSPOTS_FILL_LAYER, ROUTES_HIT_LAYER]);
  return {
    asked,
    getLayer: (id) => (layers.has(id) ? { id } : undefined),
    queryRenderedFeatures(where, { layers: wanted }) {
      const kind = Array.isArray(where[0]) ? 'box' : 'point';
      asked.push([wanted, kind]);
      return wanted.flatMap((layer) =>
        (under[`${layer} ${kind}`] ?? []).map((properties) => ({ properties })),
      );
    },
  };
}
const touch = () => ({ type: 'click', pointerType: 'touch' });

test("a tap on a pin is its box's, even with a route under it", () => {
  const map = standIn({
    [`${PIN} point`]: [{ id: 's1' }],
    [`${ROUTES_HIT_LAYER} box`]: [{ id: 'a-out', routeId: 'a' }],
  });
  assert.deepEqual(tapTargets(map, { x: 5, y: 5 }, touch()), {
    routeIds: [],
    routeKeys: [],
    hotspotIds: ['s1'],
  });
  assert.deepEqual(
    map.asked,
    [[[PIN, DOT, HOTSPOTS_FILL_LAYER], 'point']],
    'one query for the pin, the dot and the box; the routes not asked',
  );
});

test('a pin over its own box counts the box once; a dot near a finger is its box', () => {
  const both = standIn({
    [`${PIN} point`]: [{ id: 's1' }],
    [`${HOTSPOTS_FILL_LAYER} point`]: [{ id: 's1' }, { id: 's1' }],
  });
  assert.deepEqual(tapTargets(both, { x: 1, y: 1 }, touch()).hotspotIds, ['s1']);
  const near = standIn({ [`${DOT} box`]: [{ id: 's2' }] });
  assert.deepEqual(tapTargets(near, { x: 2, y: 2 }, touch()).hotspotIds, ['s2']);
});
