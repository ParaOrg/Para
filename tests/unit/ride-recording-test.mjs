// The rules for a ride recorded on a phone (src/features/routes/model/ride-recording.ts):
// which fixes count, the distance, the hintos, the gaps and the moving and standing minutes.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/ride-recording-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { haversine } from '../../src/shared/utils/geo.ts';
import {
  distanceM,
  hintosOf,
  keptFixes,
  mergeGaps,
  pathLengthM,
  silentGaps,
  summarize,
} from '../../src/features/routes/model/ride-recording.ts';

const T0 = Date.UTC(2026, 9, 17, 6, 0, 0);
/** A fix `s` seconds after the start, `east` metres east of Tala and `north` metres north. */
const fix = (s, east = 0, north = 0, accuracyM = 5) => ({
  time: T0 + s * 1000,
  at: [121.04 + east / 107_500, 14.7 + north / 111_195],
  accuracyM,
});

test('a fix worse than 50 m is ignored, one at 50 m counts', () => {
  const kept = keptFixes([fix(0), fix(1, 5, 0, 51), fix(2, 10, 0, 50)]);
  assert.deepEqual(
    kept.map((f) => f.time - T0),
    [0, 2000],
  );
});

test('a fix implying over 120 km/h is dropped, and the next is measured from the last that counted', () => {
  // 1 km in 10 s is 360 km/h; the fix after it, 100 m from the start in 20 s, is 18 km/h.
  const kept = keptFixes([fix(0), fix(10, 1000, 0), fix(20, 100, 0)]);
  assert.deepEqual(
    kept.map((f) => f.time - T0),
    [0, 20000],
  );
});

test('120 km/h exactly counts; a fix with no time passing is dropped', () => {
  const metresPerSecond = 120 / 3.6;
  const kept = keptFixes([fix(0), fix(1, metresPerSecond * 0.99, 0), fix(1, 0, 0), fix(1)]);
  assert.equal(kept.length, 2);
});

test('the length of a path is the sum of its legs', () => {
  const fixes = [fix(0), fix(10, 0, 100), fix(20, 100, 100)];
  assert.ok(Math.abs(pathLengthM(fixes) - 200) < 1);
  assert.equal(pathLengthM([fix(0)]), 0);
  assert.equal(pathLengthM([]), 0);
});

test('a hinto is 8 s or more within 25 m of where it began', () => {
  const fixes = [fix(0), fix(4, 10, 0), fix(8, 20, 0), fix(9, 200, 0), fix(10, 400, 0)];
  const hintos = hintosOf(fixes);
  assert.equal(hintos.length, 1);
  assert.equal(hintos[0].from, T0);
  assert.equal(hintos[0].to, T0 + 8000);
});

test('7 s is no hinto, and 26 m away ends one', () => {
  assert.equal(hintosOf([fix(0), fix(7, 1, 0)]).length, 0);
  const fixes = [fix(0), fix(9, 5, 0), fix(10, 26, 0), fix(20, 27, 0)];
  const hintos = hintosOf(fixes);
  assert.deepEqual(
    hintos.map((h) => [h.from - T0, h.to - T0]),
    [
      [0, 9000],
      [10000, 20000],
    ],
  );
});

test('a ride that never stops has no hintos', () => {
  const fixes = Array.from({ length: 30 }, (_, i) => fix(i, i * 30, 0));
  assert.deepEqual(hintosOf(fixes), []);
});

test('a gap is more than 5 s between fixes, or since the last fix', () => {
  const fixes = [fix(0), fix(5), fix(11), fix(12)];
  const gaps = silentGaps(fixes, T0 + 20_000);
  assert.deepEqual(
    gaps.map((g) => [g.from - T0, g.to - T0]),
    [
      [5000, 11000],
      [12000, 20000],
    ],
  );
  assert.deepEqual(silentGaps(fixes, T0 + 17_000), [
    { from: T0 + 5000, to: T0 + 11000, reasons: ['silent'] },
  ]);
  assert.deepEqual(silentGaps([], T0 + 60_000), []);
});

test('every fix the phone reported keeps it answering, even one that is ignored', () => {
  const summary = summarize([fix(0), fix(4, 0, 0, 90), fix(8)], [], T0, T0 + 8000);
  assert.equal(summary.gaps.length, 0);
  assert.equal(summary.fixCount, 3);
  assert.equal(summary.keptCount, 2);
});

test('overlapping gaps merge, with both reasons', () => {
  const merged = mergeGaps([
    { from: T0 + 30_000, to: T0 + 40_000, reasons: ['silent'] },
    { from: T0 + 5_000, to: T0 + 32_000, reasons: ['hidden'] },
    { from: T0 + 100_000, to: T0 + 110_000, reasons: ['resumed'] },
  ]);
  assert.deepEqual(merged, [
    { from: T0 + 5_000, to: T0 + 40_000, reasons: ['hidden', 'silent'] },
    { from: T0 + 100_000, to: T0 + 110_000, reasons: ['resumed'] },
  ]);
});

test('moving and standing minutes, with the lost time taken out of both', () => {
  // 0–60 s standing (10 m about), 60–120 s moving at 10 m/s, 120–180 s the screen is off.
  const fixes = [];
  for (let s = 0; s <= 60; s += 2) fixes.push(fix(s, 0, s % 4));
  for (let s = 64; s <= 120; s += 2) fixes.push(fix(s, (s - 60) * 10, 0));
  const hidden = { from: T0 + 120_000, to: T0 + 180_000, reasons: ['hidden'] };
  const summary = summarize(fixes, [hidden], T0, T0 + 180_000);
  assert.equal(summary.hintos.length, 1);
  assert.equal(Math.round(summary.standingSeconds), 60);
  assert.equal(Math.round(summary.lostSeconds), 60);
  assert.equal(Math.round(summary.movingSeconds), 60);
  // 56 s at 10 m/s, plus the wobble while standing.
  assert.ok(summary.distanceM > 560 && summary.distanceM < 700, String(summary.distanceM));
  assert.equal(summary.gaps.length, 1);
});

test('a hinto that spans a gap counts only the time the phone was recording', () => {
  const fixes = [0, 4, 8, 10, 70, 74, 78, 80].map((s) => fix(s));
  const hidden = { from: T0 + 10_000, to: T0 + 70_000, reasons: ['hidden'] };
  const summary = summarize(fixes, [hidden], T0, T0 + 80_000);
  assert.equal(summary.hintos.length, 1);
  assert.equal(Math.round(summary.standingSeconds), 20);
  assert.equal(Math.round(summary.lostSeconds), 60);
  assert.equal(Math.round(summary.movingSeconds), 0);
});

test('a gap logged before the start or after the end is clipped to the recording', () => {
  const early = { from: T0 - 30_000, to: T0 + 10_000, reasons: ['resumed'] };
  const summary = summarize([fix(0), fix(5)], [early], T0, T0 + 5000);
  assert.equal(Math.round(summary.lostSeconds), 5);
});

test('nothing recorded is zero everywhere', () => {
  const summary = summarize([], [], T0, T0);
  assert.equal(summary.distanceM, 0);
  assert.equal(summary.movingSeconds, 0);
  assert.equal(summary.standingSeconds, 0);
  assert.equal(summary.lostSeconds, 0);
  assert.deepEqual(summary.hintos, []);
  assert.deepEqual(summary.gaps, []);
});

test('the distance agrees with shared/utils/geo, whose haversine it repeats', () => {
  const pairs = [
    [
      [121.04, 14.7],
      [121.05, 14.71],
    ],
    [
      [121.04, 14.7],
      [121.04, 14.7],
    ],
    [
      [120.9, 14.4],
      [121.2, 14.8],
    ],
    [
      [121.0, 14.6],
      [-122.4, 37.8],
    ],
  ];
  for (const [a, b] of pairs) assert.equal(distanceM(a, b), haversine(a, b));
});
