// The page's one door to the rules for the mode a recording is on
// (src/features/contribute/recorder/recording-rules.ts): what it adds to ride-recording.ts's own
// rules (tested in ride-recording-test.mjs) — the words the contributor
// reads, and the trail the map is handed — and the way the recording card and the
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
  distanceFigure,
  kilometresText,
  timeFigure,
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

test('the recording card says seconds under a minute, then minutes, as the frames read "42 sec"', () => {
  assert.deepEqual(timeFigure(0), { value: '0', unit: 'sec' });
  assert.deepEqual(timeFigure(42.9), { value: '42', unit: 'sec' });
  assert.deepEqual(timeFigure(59.9), { value: '59', unit: 'sec' });
  assert.deepEqual(timeFigure(60), { value: '1', unit: 'min' });
  assert.deepEqual(timeFigure(42 * 60 + 59), { value: '42', unit: 'min' });
  assert.deepEqual(timeFigure(-3), { value: '0', unit: 'sec' });
});

test('the recording card says metres under a kilometre, then kilometres to one decimal', () => {
  assert.deepEqual(distanceFigure(0), { value: '0', unit: 'm' });
  assert.deepEqual(distanceFigure(421.4), { value: '421', unit: 'm' });
  assert.deepEqual(distanceFigure(999.4), { value: '999', unit: 'm' });
  // 999.5 rounds to a whole kilometre, which reads as kilometres, not "1000 m".
  assert.deepEqual(distanceFigure(999.5), { value: '1.0', unit: 'km' });
  assert.deepEqual(distanceFigure(4249), { value: '4.2', unit: 'km' });
});

test('the countdown says its figures the way the design reads them', () => {
  assert.equal(kilometresText(4200), '4.2');
  assert.equal(kilometresText(4249), '4.2');
  assert.equal(countdownText(102), '1:42');
  assert.equal(countdownText(120), '2:00');
  assert.equal(countdownText(0.2), '0:01');
  assert.equal(countdownText(-3), '0:00');
});
