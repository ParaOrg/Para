// The rules for a ride recorded on a phone (src/features/routes/model/ride-recording.ts):
// which fixes count, the distance, the hintos, the gaps and the moving and standing minutes.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/ride-recording-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { haversine } from '../../src/shared/utils/geo.ts';
import {
  BEARING_WINDOW_S,
  HINTO_MIN_SECONDS,
  courseBearing,
  currentMode,
  distanceM,
  hintosOf,
  keptFixes,
  mergeGaps,
  modeFixIndexes,
  modesOf,
  pathLengthM,
  rideHintos,
  rideSpans,
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
  // 150 km/h is over the limit by a small margin and is dropped too.
  const fast = keptFixes([fix(0), fix(1, 150 / 3.6, 0), fix(2, 5, 0)]);
  assert.deepEqual(
    fast.map((f) => f.time - T0),
    [0, 2000],
  );
});

test('under 120 km/h counts; a fix with no time passing is dropped', () => {
  const metresPerSecond = 120 / 3.6;
  const kept = keptFixes([fix(0), fix(1, metresPerSecond * 0.99, 0), fix(1, 0, 0), fix(1)]);
  assert.equal(kept.length, 2);
});

test('fixes that arrive out of order are used in the order they were taken', () => {
  const kept = keptFixes([fix(0), fix(10, 100, 0), fix(5, 50, 0), fix(15, 150, 0)]);
  assert.deepEqual(
    kept.map((f) => f.time - T0),
    [0, 5000, 10000, 15000],
  );
  const summary = summarize([fix(0), fix(10), fix(5), fix(15)], [], T0, T0 + 15_000);
  assert.deepEqual(summary.gaps, []);
});

test('three fast fixes that agree with each other start a new anchor, dropping the wild first ones', () => {
  // The first fix is 5 km out; everything after it is tight, so the first is the wrong one.
  const kept = keptFixes([fix(0, 5000, 0), fix(1), fix(2, 10, 0), fix(3, 20, 0), fix(4, 30, 0)]);
  assert.deepEqual(
    kept.map((f) => f.time - T0),
    [1000, 2000, 3000, 4000],
  );
});

test('after a good start, a lasting jump is taken as the true position, and what came before stays', () => {
  const good = [fix(0), fix(1, 10, 0), fix(2, 20, 0), fix(3, 30, 0)];
  const jumped = [fix(4, 5000, 0), fix(5, 5010, 0), fix(6, 5020, 0)];
  assert.equal(keptFixes([...good, ...jumped]).length, 7);
});

test('one or two wild fixes in the middle of a ride do not move the anchor', () => {
  const kept = keptFixes([fix(0), fix(1, 10, 0), fix(2, 5000, 0), fix(3, 5010, 0), fix(4, 30, 0)]);
  assert.deepEqual(
    kept.map((f) => f.time - T0),
    [0, 1000, 4000],
  );
});

test('the length of a path is the sum of its legs', () => {
  const fixes = [fix(0), fix(10, 0, 100), fix(20, 100, 100)];
  assert.ok(Math.abs(pathLengthM(fixes) - 200) < 1);
  assert.equal(pathLengthM([fix(0)]), 0);
  assert.equal(pathLengthM([]), 0);
});

test('standing in a hinto adds no distance, but the leg that leaves it does', () => {
  // 20 s standing with a wobble of 10 m, then 100 m on.
  const fixes = [
    fix(0),
    fix(4, 10, 0),
    fix(8, 0, 10),
    fix(12, 10, 10),
    fix(20, 0, 0),
    fix(30, 100, 0),
  ];
  const hintos = hintosOf(fixes);
  assert.equal(hintos.length, 1);
  assert.ok(pathLengthM(fixes) > 130);
  assert.ok(Math.abs(pathLengthM(fixes, hintos) - 100) < 1);
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
  const fixes = [fix(0), fix(9, 5, 0), fix(20, 26, 0), fix(31, 27, 0)];
  const hintos = hintosOf(fixes);
  assert.deepEqual(
    hintos.map((h) => [h.from - T0, h.to - T0]),
    [
      [0, 9000],
      [20000, 31000],
    ],
  );
});

test('24.9 m is still within the hinto, and 25.1 m is not', () => {
  assert.equal(hintosOf([fix(0), fix(4, 24.9, 0), fix(8, 0, 0)]).length, 1);
  const out = hintosOf([fix(0), fix(4, 25.1, 0), fix(8, 25.1, 0), fix(12, 25.1, 0)]);
  assert.deepEqual(
    out.map((h) => [h.from - T0, h.to - T0]),
    [[4000, 12000]],
  );
});

test('a ride that never stops has no hintos', () => {
  const fixes = Array.from({ length: 30 }, (_, i) => fix(i, i * 30, 0));
  assert.deepEqual(hintosOf(fixes), []);
});

test('a crawl of short stops a few seconds apart is one hinto', () => {
  const fixes = [fix(0), fix(4), fix(8), fix(12, 30, 0), fix(16, 30, 0), fix(20, 30, 0)];
  const hintos = hintosOf(fixes);
  assert.deepEqual(
    hintos.map((h) => [h.from - T0, h.to - T0]),
    [[0, 20000]],
  );
});

test('a 30 m spike in a long stand does not split it in two', () => {
  const fixes = [fix(0), fix(4), fix(8), fix(12), fix(13, 30, 0), fix(16), fix(20), fix(24)];
  const hintos = hintosOf(fixes);
  assert.deepEqual(
    hintos.map((h) => [h.from - T0, h.to - T0]),
    [[0, 24000]],
  );
});

test('a gap is more than 5 s between fixes, or since the last fix', () => {
  const fixes = [fix(0), fix(5), fix(11), fix(12)];
  const gaps = silentGaps(fixes, T0, T0 + 20_000);
  assert.deepEqual(
    gaps.map((g) => [g.from - T0, g.to - T0]),
    [
      [5000, 11000],
      [12000, 20000],
    ],
  );
  assert.deepEqual(silentGaps(fixes, T0, T0 + 17_000), [
    { from: T0 + 5000, to: T0 + 11000, reasons: ['silent'] },
  ]);
});

test('the wait for the first fix is a gap, and so is a phone that never answers', () => {
  const late = silentGaps([fix(10), fix(11)], T0, T0 + 11_000);
  assert.deepEqual(late, [{ from: T0, to: T0 + 10_000, reasons: ['silent'] }]);
  const never = silentGaps([], T0, T0 + 60_000);
  assert.deepEqual(never, [{ from: T0, to: T0 + 60_000, reasons: ['silent'] }]);
  assert.deepEqual(silentGaps([], T0, T0 + 5_000), []);
});

test('the silence clock starts again when a pause ends', () => {
  const pause = { from: T0 + 10_000, to: T0 + 40_000, reasons: ['paused'] };
  const fixes = [fix(0), fix(4), fix(8), fix(10), fix(40), fix(44)];
  assert.deepEqual(silentGaps(fixes, T0, T0 + 44_000, [pause]), []);
  // The phone never answers after the Resume: that wait counts from the Resume.
  const after = silentGaps([fix(0), fix(4), fix(8)], T0, T0 + 60_000, [pause]);
  assert.deepEqual(after, [{ from: T0 + 40_000, to: T0 + 60_000, reasons: ['silent'] }]);
});

test('every fix the phone reported keeps it answering, even one that is ignored', () => {
  const summary = summarize([fix(0), fix(4, 0, 0, 90), fix(8)], [], T0, T0 + 8000);
  assert.equal(summary.gaps.length, 0);
  assert.equal(summary.fixCount, 3);
  assert.equal(summary.keptCount, 2);
});

test('overlapping or touching gaps merge, with both reasons', () => {
  const merged = mergeGaps([
    { from: T0 + 30_000, to: T0 + 40_000, reasons: ['silent'] },
    { from: T0 + 5_000, to: T0 + 32_000, reasons: ['hidden'] },
    { from: T0 + 100_000, to: T0 + 110_000, reasons: ['resumed'] },
    { from: T0 + 110_000, to: T0 + 120_000, reasons: ['silent'] },
  ]);
  assert.deepEqual(merged, [
    { from: T0 + 5_000, to: T0 + 40_000, reasons: ['hidden', 'silent'] },
    { from: T0 + 100_000, to: T0 + 120_000, reasons: ['resumed', 'silent'] },
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

test('the page hidden while fixes kept coming is recorded time, not lost', () => {
  const fixes = [];
  for (let s = 0; s <= 120; s += 1) fixes.push(fix(s, s * 10, 0));
  const hidden = { from: T0 + 30_000, to: T0 + 90_000, reasons: ['hidden'] };
  const summary = summarize(fixes, [hidden], T0, T0 + 120_000);
  assert.equal(Math.round(summary.lostSeconds), 0);
  assert.equal(summary.gaps.length, 0);
  assert.equal(Math.round(summary.movingSeconds), 120);
});

test('a Stop and Resume is a pause, left out of the lost time and of moving', () => {
  const fixes = [fix(0), fix(4), fix(8), fix(10), fix(40), fix(44), fix(48), fix(50)];
  const pause = { from: T0 + 10_000, to: T0 + 40_000, reasons: ['paused'] };
  const summary = summarize(fixes, [pause], T0, T0 + 50_000);
  assert.equal(Math.round(summary.pausedSeconds), 30);
  assert.equal(Math.round(summary.lostSeconds), 0);
  assert.deepEqual(summary.gaps, []);
  assert.equal(Math.round(summary.standingSeconds), 20);
  assert.equal(Math.round(summary.movingSeconds), 0);
});

test('the distance counts only the fixes that count', () => {
  const summary = summarize(
    [fix(0), fix(1, 10, 0), fix(2, 5000, 0), fix(3, 20, 0)],
    [],
    T0,
    T0 + 3000,
  );
  assert.equal(summary.fixCount, 4);
  assert.equal(summary.keptCount, 3);
  assert.ok(Math.abs(summary.distanceM - 20) < 0.5);
});

test('a gap logged before the start or after the end is clipped to the recording', () => {
  const early = { from: T0 - 30_000, to: T0 + 10_000, reasons: ['resumed'] };
  const summary = summarize([fix(0), fix(5)], [early], T0, T0 + 5000);
  assert.equal(Math.round(summary.lostSeconds), 5);
  const late = { from: T0 + 100_000, to: T0 + 110_000, reasons: ['hidden'] };
  const outside = summarize([fix(0), fix(5)], [late], T0, T0 + 5000);
  assert.equal(outside.lostSeconds, 0);
  assert.deepEqual(outside.gaps, []);
});

test('nothing recorded is zero everywhere', () => {
  const summary = summarize([], [], T0, T0);
  assert.equal(summary.distanceM, 0);
  assert.equal(summary.movingSeconds, 0);
  assert.equal(summary.standingSeconds, 0);
  assert.equal(summary.lostSeconds, 0);
  assert.equal(summary.pausedSeconds, 0);
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

// ---------------------------------------------------------------- modes

/** Metres east per `fix` unit, measured, so a distance below is the distance haversine gives. */
const PER_METRE = distanceM(fix(0).at, fix(0, 1000).at) / 1000;
/** A fix `s` seconds in, exactly `m` metres east (and `north` metres north) of the start by haversine. */
const at = (s, m, north = 0) => fix(s, m / PER_METRE, north);
/** A switch to `to` at `s` seconds in. */
const to = (mode, s) => ({ time: T0 + s * 1000, to: mode });
/** A recording started on walk at T0, as the page starts one. */
const started = to('walk', 0);

test('currentMode: ride with no switch, the last real flip otherwise', () => {
  assert.equal(currentMode([]), 'ride');
  assert.equal(currentMode([started]), 'walk');
  assert.equal(currentMode([started, to('ride', 10)]), 'ride');
  assert.equal(currentMode([started, to('ride', 10), to('walk', 20)]), 'walk');
  // A switch to the mode already on changes nothing; out of order is sorted by time first.
  assert.equal(currentMode([started, to('walk', 10)]), 'walk');
  assert.equal(currentMode([to('ride', 10), started]), 'ride');
});

test('modes: a recording started on walk is one walked line, with no marker for the start', () => {
  const fixes = [at(1, 0), at(10, 10), at(20, 20)];
  assert.deepEqual(modesOf(fixes, [started]), {
    walkLines: [[fixes[0].at, fixes[1].at, fixes[2].at]],
    rideLines: [],
    markers: [],
  });
  assert.deepEqual(modeFixIndexes(fixes, [started]), []);
});

test('modes: no switch at all is all ride, as a recording made before modes reads', () => {
  const fixes = [at(0, 0), at(10, 100), at(20, 200)];
  assert.deepEqual(modesOf(fixes, []), {
    walkLines: [],
    rideLines: [[fixes[0].at, fixes[1].at, fixes[2].at]],
    markers: [],
  });
});

test('modes: the walked and ridden lines meet at the fix the switch happened on', () => {
  const fixes = [at(1, 0), at(10, 10), at(20, 20), at(30, 120), at(40, 220)];
  const modes = modesOf(fixes, [started, to('ride', 24)]);
  assert.deepEqual(modes.walkLines, [[fixes[0].at, fixes[1].at, fixes[2].at]]);
  assert.deepEqual(modes.rideLines, [[fixes[2].at, fixes[3].at, fixes[4].at]]);
  assert.deepEqual(modes.markers, [{ time: T0 + 24_000, at: fixes[2].at, to: 'ride' }]);
  assert.deepEqual(modeFixIndexes(fixes, [started, to('ride', 24)]), [2]);
});

test('modes: walk, ride, walk makes two walked lines and a marker at each switch', () => {
  const fixes = [at(1, 0), at(10, 10), at(20, 110), at(30, 210), at(40, 220), at(50, 230)];
  const modes = modesOf(fixes, [started, to('ride', 10), to('walk', 30), to('walk', 45)]);
  assert.deepEqual(modes.walkLines, [
    [fixes[0].at, fixes[1].at],
    [fixes[3].at, fixes[4].at, fixes[5].at],
  ]);
  assert.deepEqual(modes.rideLines, [[fixes[1].at, fixes[2].at, fixes[3].at]]);
  assert.deepEqual(
    modes.markers.map((m) => m.to),
    ['ride', 'walk'],
  );
});

test('modes: a switch before the first fix sets the mode it starts on, and leaves no marker', () => {
  const fixes = [at(10, 0), at(20, 100), at(30, 200)];
  const modes = modesOf(fixes, [started, to('ride', 5)]);
  assert.deepEqual(modes.walkLines, []);
  assert.equal(modes.rideLines.length, 1);
  assert.deepEqual(modes.markers, []);
  // Flipped and flipped back before the first fix: still on walk.
  assert.equal(modesOf(fixes, [started, to('ride', 5), to('walk', 6)]).walkLines.length, 1);
  assert.deepEqual(modesOf([], [started]), { walkLines: [], rideLines: [], markers: [] });
});

test('modes: a switch between fixes sits on the last fix before it; one at a fix, on that fix', () => {
  const fixes = [at(1, 0), at(10, 10), at(20, 110)];
  assert.deepEqual(modesOf(fixes, [started, to('ride', 19)]).markers[0].at, fixes[1].at);
  assert.deepEqual(modesOf(fixes, [started, to('ride', 10)]).markers[0].at, fixes[1].at);
  // After the last fix: a marker on it, and no ridden line yet.
  const late = modesOf(fixes, [started, to('ride', 25)]);
  assert.deepEqual(late.markers[0].at, fixes[2].at);
  assert.deepEqual(late.rideLines, []);
});

test('ride spans: the stretches on ride, clipped to the window', () => {
  const modes = [started, to('ride', 60), to('walk', 120), to('ride', 180)];
  assert.deepEqual(rideSpans(modes, T0, T0 + 240_000), [
    { from: T0 + 60_000, to: T0 + 120_000 },
    { from: T0 + 180_000, to: T0 + 240_000 },
  ]);
  assert.deepEqual(rideSpans(modes, T0 + 90_000, T0 + 100_000), [
    { from: T0 + 90_000, to: T0 + 100_000 },
  ]);
  assert.deepEqual(rideSpans(modes, T0 + 130_000, T0 + 170_000), []);
  // No switch is all ride; a recording on walk throughout has none.
  assert.deepEqual(rideSpans([], T0, T0 + 1000), [{ from: T0, to: T0 + 1000 }]);
  assert.deepEqual(rideSpans([started], T0, T0 + 1000), []);
});

test('hintos count only on ride; one across a switch keeps its ridden part if that is long enough', () => {
  const stand = { from: T0 + 100_000, to: T0 + 130_000, at: at(100, 0).at };
  // Wholly on walk: none. Wholly on ride: as it was.
  assert.deepEqual(rideHintos([stand], [started]), []);
  assert.deepEqual(rideHintos([stand], []), [stand]);
  assert.deepEqual(rideHintos([stand], [started, to('ride', 50)]), [stand]);
  // Boarded 10 s into it: the 20 s on ride remain.
  assert.deepEqual(rideHintos([stand], [started, to('ride', 110)]), [
    { from: T0 + 110_000, to: T0 + 130_000, at: stand.at },
  ]);
  // Boarded with less than a hinto's worth left: none.
  const late = 130 - HINTO_MIN_SECONDS + 1;
  assert.deepEqual(rideHintos([stand], [started, to('ride', late)]), []);
  assert.equal(rideHintos([stand], [started, to('ride', 130 - HINTO_MIN_SECONDS)]).length, 1);
});

test('the summary is the whole trip: walked distance counts, walked stands are no hintos', () => {
  // Walk 120 m briskly (a fix every 30 m, so no stretch of it reads as standing), stand 30 s,
  // then ride 1 km and stand 30 s.
  const fixes = [];
  let s = 1;
  for (let m = 0; m <= 120; m += 30, s += 10) fixes.push(at(s, m));
  for (let i = 0; i < 30; i++, s++) fixes.push(at(s, 120));
  const boarded = s;
  for (let m = 220; m <= 1120; m += 100, s += 10) fixes.push(at(s, m));
  for (let i = 0; i < 30; i++, s++) fixes.push(at(s, 1120));
  const modes = [started, to('ride', boarded)];
  const all = summarize(fixes, [], T0, T0 + s * 1000);
  const trip = summarize(fixes, [], T0, T0 + s * 1000, modes);
  assert.equal(all.hintos.length, 2);
  assert.equal(trip.hintos.length, 1);
  assert.deepEqual(trip.hintos[0].at, at(0, 1120).at);
  assert.equal(Math.round(trip.distanceM), 1120);
  // Only which stands are hintos changes: the distance and the times stay the whole trip's.
  assert.equal(trip.distanceM, all.distanceM);
  assert.equal(trip.standingSeconds, all.standingSeconds);
  assert.equal(trip.movingSeconds, all.movingSeconds);
});

// ---------------------------------------------------------------- bearing

/** A repeatable stream of independent normal numbers (mulberry32 and Box-Muller). */
function gaussians(seed) {
  let state = seed;
  const uniform = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => Math.sqrt(-2 * Math.log(1 - uniform())) * Math.cos(2 * Math.PI * uniform());
}
/** The smallest angle between two bearings, in degrees. */
const angleBetween = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
/** Walk `bearingFn` along growing prefixes of the fixes, as the screen does, one call per fix. */
function headings(fixes, start = null) {
  const out = [];
  let heading = start;
  for (let i = 1; i <= fixes.length; i++) {
    heading = courseBearing(fixes.slice(0, i), heading);
    out.push(heading);
  }
  return out;
}

test('bearing: straight at 15 km/h gives the true heading in every direction', () => {
  const metresPerSecond = 15 / 3.6;
  const ride = (dx, dy) => {
    const fixes = [];
    for (let s = 0; s <= 30; s++)
      fixes.push(at(s, dx * s * metresPerSecond, dy * s * metresPerSecond));
    return courseBearing(fixes, null);
  };
  assert.ok(Math.abs(ride(1, 0) - 90) < 0.5);
  assert.ok(Math.abs(ride(-1, 0) - 270) < 0.5);
  assert.ok(Math.abs(ride(0, 1) - 0) < 0.5 || Math.abs(ride(0, 1) - 360) < 0.5);
  assert.ok(Math.abs(ride(0, -1) - 180) < 0.5);
});

test('bearing: a 15 km/h ride with 2 m of noise stays within 10 degrees of the true heading', () => {
  // The first seed tried (6.8 degrees); over 200 seeds about 7% of 90 s rides stray past 10 once.
  const noise = gaussians(1);
  const metresPerSecond = 15 / 3.6;
  const fixes = [];
  for (let s = 0; s <= 90; s++) {
    fixes.push(at(s, s * metresPerSecond + 2 * noise(), 2 * noise()));
  }
  const all = headings(fixes);
  const worst = Math.max(...all.slice(11).map((h) => angleBetween(h, 90)));
  assert.ok(worst < 10, `worst error ${worst.toFixed(1)} degrees`);
});

test('bearing: a 90 degree corner at 20 km/h reaches the new direction within 10 s', () => {
  const metresPerSecond = 20 / 3.6;
  const fixes = [];
  for (let s = 0; s <= 30; s++) fixes.push(at(s, s * metresPerSecond));
  for (let s = 1; s <= 20; s++) fixes.push(at(30 + s, 30 * metresPerSecond, s * metresPerSecond));
  const all = headings(fixes);
  const bearingAt = (secondsPastCorner) => all[30 + secondsPastCorner];
  assert.ok(angleBetween(bearingAt(0), 90) < 1);
  assert.ok(angleBetween(bearingAt(10), 0) < 10, `${bearingAt(10)} 10 s after the corner`);
  assert.ok(angleBetween(bearingAt(20), 0) < 1);
});

test('bearing: standing still with 8 m of noise per axis keeps the heading it had', () => {
  // Two minutes at a fix a second, independent noise of 8 m per axis, and a creep of 0.1 m/s. The
  // seed is the first one tried; it is not picked.
  const noise = gaussians(1);
  const fixes = [];
  for (let s = 0; s <= 120; s++) fixes.push(at(s, 0.1 * s + 8 * noise(), 8 * noise()));
  const all = headings(fixes, 77);
  let turns = 0;
  let before = 77;
  for (const heading of all) {
    if (angleBetween(heading, before) > 10) turns++;
    before = heading;
  }
  assert.ok(turns <= 1, `${turns} turns over 10 degrees`);
});

test('bearing: with too few fixes in the window, or a half short of two, the heading is the previous', () => {
  // Three fixes in the window, however far apart they are.
  assert.equal(courseBearing([at(0, 0), at(5, 50), at(10, 100)], 7), 7);
  // Four fixes, but one in the older half.
  assert.equal(courseBearing([at(0, 0), at(8, 80), at(9, 90), at(10, 100)], 7), 7);
  // Two and two: a heading.
  assert.ok(Math.abs(courseBearing([at(0, 0), at(1, 0), at(9, 100), at(10, 100)], 7) - 90) < 0.5);
  assert.equal(courseBearing([], 45), 45);
  assert.equal(courseBearing([at(0, 0)], null), null);
});

test('bearing: the halves must sit 20 m apart, and only fixes from the last 10 s count', () => {
  const halves = (apartM) => [at(0, 0), at(1, 0), at(9, apartM), at(10, apartM)];
  assert.equal(BEARING_WINDOW_S, 10);
  assert.equal(courseBearing(halves(19), 7), 7);
  assert.ok(Math.abs(courseBearing(halves(20.5), 7) - 90) < 0.5);
  // A fix 14 s old is outside the window: the four recent ones are all standing.
  const stale = [at(0, 0), at(11, 100), at(12, 100), at(13, 100), at(14, 100)];
  assert.equal(courseBearing(stale, 7), 7);
  // A fix exactly 10 s old is inside it.
  const edge = [at(0, 0), at(1, 0), at(9, 30), at(10, 30)];
  assert.ok(Math.abs(courseBearing(edge, 7) - 90) < 0.5);
  assert.equal(courseBearing([at(0, 0), at(1, 0), at(11, 30), at(12, 30)], 7), 7);
});
