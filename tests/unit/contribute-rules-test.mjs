// The page's one door to the rules for the mode a recording is on
// (src/features/contribute/recorder/recording-rules.ts): what it adds to ride-recording.ts's own
// rules (tested in ride-recording-test.mjs) — the words the contributor
// reads, and the trail the map is handed — and the way the stats strip and the
// countdown say their figures.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/contribute-rules-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MODE_LABEL,
  OTHER_MODE,
  trailOf,
} from '../../src/features/contribute/recorder/recording-rules.ts';
import {
  countdownText,
  kilometresText,
  minutesText,
} from '../../src/features/contribute/common/format.ts';

const T0 = Date.UTC(2026, 9, 17, 6, 0, 0);
const M_PER_DEG_LNG = 107_600;
/** A fix `s` seconds in, `east` metres east of Tala. */
const fix = (s, east) => ({
  time: T0 + s * 1000,
  at: [121.0 + east / M_PER_DEG_LNG, 14.6],
  accuracyM: 5,
});

test('the mode button switches to the other mode, and the modes read as Lakad and Sakay', () => {
  assert.equal(OTHER_MODE.walk, 'ride');
  assert.equal(OTHER_MODE.ride, 'walk');
  assert.equal(MODE_LABEL.walk, 'Lakad');
  assert.equal(MODE_LABEL.ride, 'Sakay');
});

test('the trail is a walked line, a ridden line joined to it at the switch, and a dot there', () => {
  const kept = [fix(1, 0), fix(10, 100), fix(20, 200), fix(30, 300), fix(40, 400)];
  const trail = trailOf(kept, [
    { time: T0, to: 'walk' },
    { time: T0 + 20_000, to: 'ride' },
  ]);
  assert.deepEqual(
    trail.lines.map((line) => line.mode),
    ['walk', 'ride'],
  );
  assert.deepEqual(trail.lines[0].path.at(-1), trail.lines[1].path[0]);
  assert.deepEqual(trail.markers, [{ at: kept[2].at, mode: 'ride' }]);
});

test('the start leaves no dot, and neither does a recording with no modes', () => {
  assert.equal(trailOf([fix(1, 0), fix(10, 100)], [{ time: T0, to: 'walk' }]).markers.length, 0);
  assert.equal(trailOf([fix(0, 0), fix(10, 100)], []).markers.length, 0);
});

test('the stats strip and the countdown say their figures the way the design reads them', () => {
  assert.equal(minutesText(42 * 60 + 59), '42');
  assert.equal(kilometresText(4200), '4.2');
  assert.equal(kilometresText(4249), '4.2');
  assert.equal(countdownText(102), '1:42');
  assert.equal(countdownText(120), '2:00');
  assert.equal(countdownText(0.2), '0:01');
  assert.equal(countdownText(-3), '0:00');
});
