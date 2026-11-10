// Go here's get-off countdown (src/features/routes/model/get-off-countdown.ts, .scratch/go-here
// ticket 06): hintuans left while any lie between, metres when none do, at the stop, past it;
// never counting back up on a wobbling fix; round the tip on a loop; and when the reminder speaks.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/get-off-countdown-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { countdownTo, cueOf } from '../../src/features/routes/model/get-off-countdown.ts';

// Along latitude 14.6, 0.001 degrees of longitude is some 108 m.
const at = (lng, lat = 14.6) => [lng, lat];
const hotspot = (id, lng) => ({ id, point: { type: 'Point', coordinates: at(lng) } });
// Six hotspots a kilometre and more apart, east along one road; the stop is the last.
const STOPS = [121.0, 121.01, 121.02, 121.03, 121.04, 121.05].map((lng, i) =>
  hotspot(`h${i}`, lng),
);
const ride = (isLoop = false) => ({
  direction: { id: 'd' },
  name: 'East',
  line: [at(121.0), at(121.05)],
  stops: STOPS,
  isLoop,
});
const STOP = STOPS[5];

test('counts the hintuans between while there are any', () => {
  assert.deepEqual(countdownTo(ride(), STOP, at(121.005)), { kind: 'hintuans', left: 4 });
  assert.deepEqual(countdownTo(ride(), STOP, at(121.025)), { kind: 'hintuans', left: 2 });
});

test('counts metres when no hintuan lies between, then says here, then past', () => {
  const last = countdownTo(ride(), STOP, at(121.045));
  assert.equal(last.kind, 'metres');
  assert.ok(last.left > 500 && last.left < 560, `${last.left}`);
  assert.deepEqual(countdownTo(ride(), STOP, at(121.0498)), { kind: 'here' });
  assert.deepEqual(countdownTo(ride(), STOP, at(121.053)), { kind: 'passed' });
});

test('a fix beside the road counts as on it', () => {
  // Some 100 m north of the road.
  assert.deepEqual(countdownTo(ride(), STOP, at(121.025, 14.6009)), { kind: 'hintuans', left: 2 });
});

test('a wobbling fix never counts back up', () => {
  const two = countdownTo(ride(), STOP, at(121.025));
  // The next fix lands behind the last hintuan passed: still two, not three.
  assert.deepEqual(countdownTo(ride(), STOP, at(121.018), two), two);
  const metres = countdownTo(ride(), STOP, at(121.046));
  const wobble = countdownTo(ride(), STOP, at(121.044), metres);
  assert.equal(wobble.left, metres.left);
});

test('on a loop, the stop behind the boarding point is reached round the tip', () => {
  const early = hotspot('h1', 121.01);
  const countdown = countdownTo(ride(true), early, at(121.03));
  assert.deepEqual(countdown, { kind: 'hintuans', left: 3 });
});

test('the reminder speaks at two to go, at the last stretch, and at the stop', () => {
  assert.equal(cueOf({ kind: 'hintuans', left: 3 }), null);
  assert.equal(cueOf({ kind: 'hintuans', left: 2 }), 'two-to-go');
  assert.equal(cueOf({ kind: 'hintuans', left: 1 }), null);
  assert.equal(cueOf({ kind: 'metres', left: 900 }), null);
  assert.equal(cueOf({ kind: 'metres', left: 350 }), 'next-is-yours');
  assert.equal(cueOf({ kind: 'here' }), 'here');
  assert.equal(cueOf({ kind: 'passed' }), null);
});
