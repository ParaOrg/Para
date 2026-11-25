// A card's row says where a direction goes, then its route's via
// (directionRowName, src/features/routes/model/row-name.ts), and the route cards
// list their rows by it (departures, src/features/routes/model/departures.ts).
// The two parts come apart too (directionRowParts), and joined they read the
// same words, for every direction in the published map (public/data/index.v6.json).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/direction-row-name-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { drawnDepartures } from '../../src/features/routes/model/departures.ts';
import { directionEnds, isLoop } from '../../src/features/routes/model/routes.ts';
import {
  directionRowName,
  directionRowParts,
  rowName,
} from '../../src/features/routes/model/row-name.ts';
import { readIndexFile } from '../../src/features/routes/published/parse-index.ts';

/** A drawn direction of a route from Tala to SM Fairview: sample data, not the map. */
const direction = (id, route, routeOver = {}, over = {}) => ({
  id,
  routeId: route,
  name: 'Tala → SM Fairview',
  reversed: false,
  confidence: 'drawn',
  shape: {
    type: 'LineString',
    coordinates: [
      [121.0, 14.7],
      [121.0, 14.71],
    ],
  },
  route: {
    signboard: null,
    headHotspotId: 'tala',
    tailHotspotId: 'fv',
    isLoop: false,
    via: null,
    routeCode: null,
    name: 'Tala – SM Fairview',
    ...routeOver,
  },
  ...over,
});

test('a row says its place, then the via at the end', () => {
  assert.equal(directionRowName(direction('a', 'r1')), 'SM Fairview');
  assert.equal(
    directionRowName(direction('a', 'r1', { via: ' Maligaya ' })),
    'SM Fairview via Maligaya',
  );
  assert.equal(directionRowName(direction('a', 'r1', { via: '   ' })), 'SM Fairview');
});

test('the way back reads its place the same way, via last', () => {
  const back = direction(
    'b',
    'r1',
    { via: 'Almar' },
    { name: 'SM Fairview → Tala', reversed: true },
  );
  assert.equal(directionRowName(back), 'Tala via Almar');
});

test('a loop gets no via added: its name has it already', () => {
  const loop = direction(
    'l',
    'r2',
    {
      isLoop: true,
      headHotspotId: null,
      tailHotspotId: null,
      signboard: 'UP – Ikot',
      via: 'Katipunan',
      name: 'UP – Ikot via Katipunan',
    },
    { name: 'UP – Ikot via Katipunan' },
  );
  assert.equal(directionRowName(loop), 'Ikot');
});

test('two routes to the same place list as two rows told apart by their via', () => {
  const plain = direction('a', 'r1');
  const viaMaligaya = direction('c', 'r3', { via: 'Maligaya' });
  const [place] = drawnDepartures([plain, viaMaligaya], false);
  assert.deepEqual(
    place.directions.map((d) => [d.to, d.via]),
    [
      ['SM Fairview', null],
      ['SM Fairview', 'Maligaya'],
    ],
  );
  assert.deepEqual(place.directions.map(rowName), ['SM Fairview', 'SM Fairview via Maligaya']);
});

test('the place and the via come apart: no via, a blank one and a loop give null', () => {
  assert.deepEqual(directionRowParts(direction('a', 'r1', { via: ' Maligaya ' })), {
    to: 'SM Fairview',
    via: 'Maligaya',
  });
  assert.deepEqual(directionRowParts(direction('a', 'r1')), { to: 'SM Fairview', via: null });
  assert.deepEqual(directionRowParts(direction('a', 'r1', { via: '   ' })), {
    to: 'SM Fairview',
    via: null,
  });
  const loop = direction('l', 'r2', { isLoop: true, via: 'Katipunan' }, { name: 'UP – Ikot' });
  assert.equal(directionRowParts(loop).via, null);
});

test('joined, the parts read as the rows did, for every published direction', () => {
  const url = new URL('../../public/data/index.v6.json', import.meta.url);
  const { directions } = readIndexFile(JSON.parse(readFileSync(url, 'utf8')), url.href);
  assert.ok(directions.length > 0, 'the published map has directions');
  // The row's words as they were before the parts came apart.
  const before = (v) => {
    const via = v.route?.via?.trim();
    const { to } = directionEnds(v);
    return via && !isLoop(v) ? `${to} via ${via}` : to;
  };
  for (const v of directions) assert.equal(rowName(directionRowParts(v)), before(v), v.id);
  assert.ok(
    directions.some((v) => directionRowParts(v).via !== null),
    'some published direction has a via, so the join is tried',
  );
});
