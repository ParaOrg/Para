// A flagged stop's place (src/features/contribute/stop-notes/stop-place.ts): the nearest published
// hotspot, its own name inside its box, "Near …" within 500 m, else no nearby place.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/stop-place-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  NO_NEARBY_PLACE,
  stopPlaceName,
} from '../../src/features/contribute/stop-notes/stop-place.ts';

/** A square box about 100 m across round [lng, lat], as a published hotspot has. */
const hotspot = (name, [lng, lat], informal = null) => ({
  id: name,
  name,
  informal,
  kind: 'hintuan',
  point: { type: 'Point', coordinates: [lng, lat] },
  area: {
    type: 'Polygon',
    coordinates: [
      [
        [lng - 0.0005, lat - 0.0005],
        [lng + 0.0005, lat - 0.0005],
        [lng + 0.0005, lat + 0.0005],
        [lng - 0.0005, lat + 0.0005],
        [lng - 0.0005, lat - 0.0005],
      ],
    ],
  },
});

const PHILCOA = hotspot('Philcoa Jeepney Terminal', [121.0567, 14.6539], 'Philcoa');
const UP = hotspot('UP Diliman Shopping Center', [121.0687, 14.6537]);

test('inside a box: the hotspot by the name people say', () => {
  assert.equal(stopPlaceName([121.0567, 14.6539], [UP, PHILCOA]), 'Philcoa');
});

test('within 500 m of the nearest box: Near its name', () => {
  assert.equal(
    stopPlaceName([121.0687, 14.6567], [PHILCOA, UP]),
    'Near UP Diliman Shopping Center',
  );
});

test('beyond 500 m of every box, with no hotspots, or with no position: no nearby place', () => {
  assert.equal(stopPlaceName([121.1, 14.7], [PHILCOA, UP]), NO_NEARBY_PLACE);
  assert.equal(stopPlaceName([121.0567, 14.6539], []), NO_NEARBY_PLACE);
  assert.equal(stopPlaceName(null, [PHILCOA]), NO_NEARBY_PLACE);
});
