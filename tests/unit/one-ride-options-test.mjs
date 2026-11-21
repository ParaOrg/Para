// Go here's one-ride options (src/features/routes/model/one-ride-options.ts, .scratch/go-here
// ticket 01): board before the stop (round the tip on a loop), each direction's best pair, ranked
// by least walking, widened to 1 km only when nothing is within 600 m; and, on the published
// index, fast enough to run once per chosen place.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/one-ride-options-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  WALK_REACH_M,
  bestRide,
  oneRideOptions,
} from '../../src/features/routes/model/one-ride-options.ts';
import { directionStopsOf } from '../../src/features/routes/model/direction-stops.ts';
import { indexSchema } from '../../src/features/routes/published/index-schema.ts';

// Along latitude 14.6, 0.001 degrees of longitude is some 108 m.
const at = (lng) => [lng, 14.6];
const hotspot = (id, lng) => ({ id, point: { type: 'Point', coordinates: at(lng) } });
const ride = (name, lngs, { isLoop = false } = {}) => ({
  direction: { id: name },
  name,
  line: lngs.map(at),
  stops: lngs.map((lng, i) => hotspot(`${name}-${i}`, lng)),
  isLoop,
});

test('a ride boards before its stop, never after', () => {
  const eastward = ride('East', [121.0, 121.01, 121.02]);
  assert.equal(bestRide(eastward, at(121.0), at(121.02), WALK_REACH_M)?.stop.id, 'East-2');
  // Going the other way on it would mean riding backwards.
  assert.equal(bestRide(eastward, at(121.02), at(121.0), WALK_REACH_M), null);
});

test('a loop comes round its tip to a stop before the boarding one', () => {
  const loop = ride('Loop', [121.0, 121.01, 121.02, 121.0], { isLoop: true });
  const option = bestRide(loop, at(121.02), at(121.01), WALK_REACH_M);
  assert.equal(option?.board.id, 'Loop-2');
  assert.equal(option?.stop.id, 'Loop-1');
  assert.ok(option.rideM > 0);
});

test("a direction's best pair is the one with the least walking", () => {
  // Two hotspots near the start: 0 m and some 216 m away.
  const two = ride('Two', [121.0, 121.002, 121.02]);
  const option = bestRide(two, at(121.0), at(121.02), WALK_REACH_M);
  assert.equal(option?.board.id, 'Two-0');
  assert.ok(option.walkToBoardM < 1 && option.walkFromStopM < 1);
});

test('ranked by least walking, then the shorter ride, then the name', () => {
  const near = ride('B Near', [121.0, 121.02]);
  // The same two ends, but its line bends some 1.1 km north between them.
  const sameWalkLonger = {
    ...ride('A Longer', [121.0, 121.02]),
    line: [at(121.0), [121.01, 14.61], at(121.02)],
  };
  const sameWalkSameRide = ride('A Near', [121.0, 121.02]);
  const farther = ride('Farther', [121.003, 121.02]);
  const { options, isWidened } = oneRideOptions(
    [farther, sameWalkLonger, near, sameWalkSameRide],
    at(121.0),
    at(121.02),
  );
  assert.equal(isWidened, false);
  assert.deepEqual(
    options.map((o) => o.name),
    ['A Near', 'B Near', 'A Longer', 'Farther'],
  );
});

test('widened to 1 km only when nothing is within 600 m', () => {
  // The nearest hotspot is some 860 m from the start.
  const far = ride('Far', [121.008, 121.02]);
  const widened = oneRideOptions([far], at(121.0), at(121.02));
  assert.equal(widened.isWidened, true);
  assert.deepEqual(
    widened.options.map((o) => o.name),
    ['Far'],
  );
  const none = oneRideOptions([ride('None', [121.05, 121.06])], at(121.0), at(121.02));
  assert.deepEqual(none, { options: [], isWidened: true });
});

test('on the published index, built once and fast enough per chosen place', () => {
  const index = indexSchema.parse(JSON.parse(readFileSync('public/data/index.v5.json', 'utf8')));
  const rides = directionStopsOf(index.directions, index.hotspots, index.links);
  assert.ok(rides.length > 0);
  const points = index.hotspots.map((h) => h.point.coordinates);
  const times = [];
  let withOptions = 0;
  for (let i = 0; i < 40; i++) {
    const start = points[(i * 7) % points.length];
    const place = points[(i * 13 + 5) % points.length];
    const began = performance.now();
    const { options } = oneRideOptions(rides, start, place);
    times.push(performance.now() - began);
    if (options.length > 0) withOptions++;
  }
  times.sort((a, b) => a - b);
  const median = times[times.length >> 1];
  // The ticket's target is 20 ms on a laptop; the bound here is loose, so a slow runner passes.
  assert.ok(median < 50, `median ${median.toFixed(1)} ms over ${rides.length} directions`);
  assert.ok(withOptions > 0, 'some real pairs have a one-ride option');
  console.log(
    `  one-ride options on the published index: median ${median.toFixed(2)} ms, ` +
      `${rides.length} directions, ${withOptions} of 40 pairs with an option`,
  );
});
