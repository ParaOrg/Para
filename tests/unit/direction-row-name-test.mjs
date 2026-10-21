// A card's row says where a direction goes, then its route's via
// (directionRowName, src/features/routes/model/routes.ts), and the route cards
// list their rows by it (departures, src/features/routes/model/departures.ts).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/direction-row-name-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawnDepartures } from '../../src/features/routes/model/departures.ts';
import { directionRowName } from '../../src/features/routes/model/routes.ts';

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
    place.directions.map((d) => d.to),
    ['SM Fairview', 'SM Fairview via Maligaya'],
  );
});
