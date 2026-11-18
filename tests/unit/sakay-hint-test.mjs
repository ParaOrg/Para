// When a recording on Lakad offers "Switch to Sakay?" (src/features/contribute/recorder/sakay-hint.ts):
// a jeepney on EDSA is offered it after a minute, a walker never is, a jeepney crawling in traffic
// is not until it speeds up, and once offered it waits for the next stretch.
//
// The tracks are made up: a straight run north along EDSA from Cubao (a public road; no recorded
// ride), at a set speed, one fix a second, with a fixed pattern of metre-scale wander standing in
// for a phone's error. No real contribution is used.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/sakay-hint-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SAKAY_HINT, isSakayHintDue } from '../../src/features/contribute/recorder/sakay-hint.ts';

const CUBAO = [121.0526, 14.6196];
const M_PER_DEG_LAT = 110_574;
const M_PER_DEG_LNG = 111_320 * Math.cos((CUBAO[1] * Math.PI) / 180);
const START = 1_800_000_000_000;

/** The same wander every run: up to `metres` each way, never random. */
const wander = (i, metres) => [metres * Math.sin(i * 1.7), metres * Math.cos(i * 2.3)];

/**
 * A track of fixes, one a second: legs of { seconds, kmh } run north one after another from
 * Cubao, starting at `from` ms after START, each fix wandering up to `noiseM` metres.
 */
function track(legs, { noiseM = 0, from = 0 } = {}) {
  const fixes = [];
  let northM = 0;
  let second = 0;
  for (const { seconds, kmh } of legs) {
    for (let s = 0; s < seconds; s += 1) {
      const [east, north] = wander(second, noiseM);
      fixes.push({
        time: START + from + second * 1000,
        at: [CUBAO[0] + east / M_PER_DEG_LNG, CUBAO[1] + (northM + north) / M_PER_DEG_LAT],
        accuracyM: 10,
      });
      northM += kmh / 3.6;
      second += 1;
    }
  }
  return fixes;
}

/** Whether the hint is due at each second of `fixes`, on Lakad since START, never yet offered. */
const dueAt = (fixes, input = {}) =>
  fixes.map((_, i) =>
    isSakayHintDue({
      fixes: fixes.slice(0, i + 1),
      mode: 'walk',
      modeSince: START,
      askedAt: null,
      ...input,
    }),
  );

const firstDue = (fixes, input) => dueAt(fixes, input).indexOf(true);

test('its numbers are the owner’s: about 15 km/h for a minute', () => {
  assert.equal(SAKAY_HINT.speedKmh, 15);
  assert.equal(SAKAY_HINT.forMs, 60_000);
});

test('a jeepney on EDSA at 30 km/h, recorded on Lakad, is offered Sakay after a minute', () => {
  const jeepney = track([{ seconds: 120, kmh: 30 }], { noiseM: 8 });
  assert.equal(firstDue(jeepney), 60);
  assert.ok(dueAt(jeepney).slice(60).every(Boolean), 'and stays due while it rides');
});

test('a walker at 5 km/h, wandering 8 m either way, is never offered Sakay', () => {
  const walker = track([{ seconds: 600, kmh: 5 }], { noiseM: 8 });
  assert.equal(firstDue(walker), -1);
});

test('a brisk walker at 7 km/h is not either', () => {
  assert.equal(firstDue(track([{ seconds: 300, kmh: 7 }], { noiseM: 5 })), -1);
});

test('a jeepney crawling in traffic is not offered it until it speeds up for a minute', () => {
  // Stop and go at walking pace: from a phone, it can't be told from a walk.
  const crawl = [];
  for (let i = 0; i < 9; i += 1) crawl.push({ seconds: 15, kmh: 10 }, { seconds: 5, kmh: 0 });
  const jeepney = track([...crawl, { seconds: 90, kmh: 25 }], { noiseM: 6 });
  const crawlEnds = 9 * 20;
  assert.equal(dueAt(jeepney).slice(0, crawlEnds).indexOf(true), -1);
  const due = firstDue(jeepney);
  assert.ok(due > crawlEnds && due <= crawlEnds + 60, `due at ${due}`);
});

test('a jeepney that stops for a passenger now and then still counts as riding', () => {
  const legs = [];
  for (let i = 0; i < 4; i += 1) legs.push({ seconds: 40, kmh: 30 }, { seconds: 10, kmh: 0 });
  assert.equal(firstDue(track(legs, { noiseM: 6 })), 60);
});

test('on Sakay, nothing is offered', () => {
  const jeepney = track([{ seconds: 120, kmh: 30 }]);
  assert.equal(firstDue(jeepney, { mode: 'ride' }), -1);
});

test('a switch back to Lakad mid-ride waits a full minute on Lakad before offering', () => {
  const jeepney = track([{ seconds: 180, kmh: 30 }]);
  const switchedAt = START + 100_000;
  assert.equal(firstDue(jeepney, { modeSince: switchedAt }), 160);
});

test('fixes more than 20 s apart are no stretch to judge by', () => {
  const before = track([{ seconds: 30, kmh: 30 }]);
  const after = track([{ seconds: 90, kmh: 30 }], { from: 30_000 + 25_000 });
  const fixes = [...before, ...after];
  // The first full minute with no gap in it ends 60 s after the gap.
  assert.equal(firstDue(fixes), before.length + 60);
});

test('once offered and ignored, it waits for a slower minute and a new stretch', () => {
  const legs = [
    { seconds: 120, kmh: 30 },
    { seconds: 90, kmh: 0 },
    { seconds: 90, kmh: 30 },
  ];
  const fixes = track(legs);
  const askedAt = START + 60_000;
  const due = dueAt(fixes, { askedAt });
  assert.equal(due.slice(61, 210).indexOf(true), -1, 'not again while the same stretch lasts');
  // Due again once the last minute averages 15 km/h: half stopped, half at 30 km/h.
  assert.equal(due.indexOf(true, 210), 240, 'again once a new fast minute follows the stop');
});
