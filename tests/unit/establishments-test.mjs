// The establishments the map draws from the basemap's own places (src/features/routes/map/
// establishments.ts, establishment-kinds.ts): which places each tier's layer takes, which marker
// and colour each place gets, that a design's own place labels give them up, and that every
// family's colour holds against the light grounds and under a white glyph.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/establishments-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

import {
  Color,
  createPropertyExpression,
  featureFilter,
  latest,
} from '@maplibre/maplibre-gl-style-spec';

import {
  ESTABLISHMENT_KINDS,
  FAMILY_COLOUR,
  TIER_ZOOM,
} from '../../src/features/routes/map/establishment-kinds.ts';
import {
  establishmentLayer,
  withEstablishments,
} from '../../src/features/routes/map/establishments.ts';

/** A place as the tiles give it: OpenMapTiles' class and subclass, a name and a rank. */
const place = (klass, subclass = klass) => ({
  type: 1,
  properties: { class: klass, subclass, name: 'A place', rank: 3 },
});

const takes = (tier, feature, zoom = 18) =>
  featureFilter(establishmentLayer(tier).filter, 'filter').filter({ zoom }, feature);

const evaluate = (layer, group, property, feature, zoom = 18) => {
  const spec = latest[`${group}_symbol`][property];
  const made = createPropertyExpression(layer[group][property], group, spec);
  assert.equal(made.result, 'success', `${property}: ${JSON.stringify(made.value)}`);
  return made.value.evaluate({ zoom }, feature);
};

test('the kinds never overlap: a class or subclass is one kind, and a kind is matched one way', () => {
  for (const key of ['classes', 'subclasses']) {
    const values = ESTABLISHMENT_KINDS.flatMap((kind) => kind[key] ?? []);
    assert.equal(new Set(values).size, values.length, `a repeated value in ${key}`);
  }
  for (const kind of ESTABLISHMENT_KINDS) {
    assert.ok(!(kind.classes && kind.subclasses), `${kind.glyph} has both`);
  }
});

test('each place goes to its tier alone, with its marker and its family colour', () => {
  const cases = [
    [place('shop', 'mall'), 1, 'establishment-shop', 'shopping'],
    [place('hospital', 'hospital'), 1, 'establishment-hospital', 'health'],
    [place('atm'), 2, 'establishment-atm', 'money'],
    [place('shop', 'chemist'), 2, 'establishment-pharmacy', 'health'],
    [place('shop', 'general'), 2, 'establishment-convenience', 'shopping'],
    [place('fuel', 'fuel'), 2, 'establishment-fuel', 'transport'],
    [place('police'), 2, 'establishment-police', 'safety'],
    [place('hospital', 'clinic'), 3, 'establishment-doctor', 'health'],
    [place('fast_food', 'food_court'), 3, 'establishment-fast-food', 'food'],
    [place('toilets'), 3, 'establishment-toilet', 'services'],
  ];
  for (const [feature, tier, image, family] of cases) {
    const at = feature.properties.subclass;
    for (const t of [1, 2, 3]) assert.equal(takes(t, feature), t === tier, `${at} in tier ${t}`);
    const layer = establishmentLayer(tier);
    assert.equal(evaluate(layer, 'layout', 'icon-image', feature).toString(), image, at);
    assert.equal(
      evaluate(layer, 'paint', 'text-color', feature).toString(),
      Color.parse(FAMILY_COLOUR[family]).toString(),
      at,
    );
  }
});

test('not ours: a station, a bus stop, a hotel, a charging point, a nursing home, a nameless ATM', () => {
  const nameless = { type: 1, properties: { class: 'atm', subclass: 'atm' } };
  for (const feature of [
    place('railway', 'station'),
    place('bus', 'bus_stop'),
    place('lodging', 'hotel'),
    place('fuel', 'charging_station'),
    place('hospital', 'nursing_home'),
    nameless,
  ]) {
    for (const t of [1, 2, 3]) assert.equal(takes(t, feature), false, JSON.stringify(feature));
  }
});

test('the marker first, small; the name beside it a zoom closer', () => {
  for (const tier of [1, 2, 3]) {
    const layer = establishmentLayer(tier);
    const { marker, name } = TIER_ZOOM[tier];
    assert.equal(layer.minzoom, marker);
    const atm = place('atm');
    assert.equal(evaluate(layer, 'layout', 'text-field', atm, name - 0.5).toString(), '');
    assert.equal(evaluate(layer, 'layout', 'text-field', atm, name).toString(), 'A place');
    assert.equal(evaluate(layer, 'layout', 'icon-size', atm, marker), 0.7);
    assert.equal(evaluate(layer, 'layout', 'icon-size', atm, name), 1);
  }
  assert.ok(TIER_ZOOM[1].marker < TIER_ZOOM[2].marker, 'the big places before the errands');
  assert.ok(TIER_ZOOM[2].marker < TIER_ZOOM[3].marker, 'the errands before the rest');
});

test("a design's place labels give the establishments up, and theirs are drawn last", () => {
  const style = {
    version: 8,
    sources: { openmaptiles: { type: 'vector', url: 'https://tiles.example/planet' } },
    layers: [
      { id: 'background', type: 'background' },
      {
        id: 'detail-places',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'poi',
        filter: ['==', ['geometry-type'], 'Point'],
      },
    ],
  };
  const drawn = withEstablishments(style);
  assert.deepEqual(
    drawn.layers.map((l) => l.id),
    ['background', 'detail-places', 'establishments-3', 'establishments-2', 'establishments-1'],
  );
  const places = featureFilter(drawn.layers[1].filter, 'filter');
  assert.equal(places.filter({ zoom: 17 }, place('atm')), false, 'the ATM is ours now');
  assert.equal(places.filter({ zoom: 17 }, place('lodging', 'hotel')), true, 'the hotel is not');
  const photo = { version: 8, sources: {}, layers: [] };
  assert.equal(withEstablishments(photo), photo, 'a style without the tiles is left alone');
});

test('every glyph has its file and its licence', () => {
  const icons = new URL('../../src/features/routes/map/establishment-icons/', import.meta.url);
  for (const { glyph } of ESTABLISHMENT_KINDS) {
    const set = glyph === 'atm' ? 'temaki' : 'maki';
    assert.ok(existsSync(new URL(`${set}/${glyph}.svg`, icons)), glyph);
  }
  assert.ok(existsSync(new URL('maki/LICENSE.txt', icons)));
  assert.ok(existsSync(new URL('temaki/LICENSE.md', icons)));
});

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

test('each family holds 3:1 on the light grounds and its white glyph and name halo 4.5:1', () => {
  // Monochrome's ground (Positron's) and a building on it, and Coloured's ground (daylight.ts).
  const grounds = { monochrome: '#f2f3f0', building: '#e0e0db', coloured: '#f7f3eb' };
  for (const [family, colour] of Object.entries(FAMILY_COLOUR)) {
    for (const [name, ground] of Object.entries(grounds)) {
      assert.ok(contrast(colour, ground) >= 3, `${family} on ${name}`);
    }
    assert.ok(contrast(colour, '#ffffff') >= 4.5, `${family} under white`);
  }
});
