// The app's notification says how far a ride has gone while the page sleeps, worked out natively
// (android/app/src/main/java/ph/para/contributor/RideDistance.java). It must say what the recording
// card says (keptFixes, hintosOf and pathLengthM in src/features/routes/model/ride-recording.ts):
// this compiles the Java and runs both on the same rides.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/ride-distance-test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { rideFixes, T0 } from './fixtures/contribution-ride.mjs';
import {
  hintosOf,
  keptFixes,
  pathLengthM,
} from '../../src/features/routes/model/ride-recording.ts';

const SOURCE = 'android/app/src/main/java/ph/para/contributor/RideDistance.java';
let classes;

before(() => {
  classes = mkdtempSync(join(tmpdir(), 'ride-distance-'));
  execFileSync('javac', ['-d', classes, SOURCE]);
});
after(() => rmSync(classes, { recursive: true, force: true }));

/** The card's distance, as the page works it out. */
const pageDistance = (fixes) => {
  const kept = keptFixes(fixes);
  return pathLengthM(kept, hintosOf(kept));
};

/** The notification's, as the Java works it out. */
const nativeDistance = (fixes) =>
  Number(
    execFileSync('java', ['-cp', classes, 'ph.para.contributor.RideDistance'], {
      input: fixes.map((f) => `${f.time} ${f.at[0]} ${f.at[1]} ${f.accuracyM}`).join('\n'),
      encoding: 'utf8',
    }).trim(),
  );

const M_PER_DEG_LAT = 111_320;
/** A fix `north` metres up the street at second `s`. */
const at = (s, north, accuracyM = 5) => ({
  time: T0 + s * 1000,
  at: [121.05, 14.7 + north / M_PER_DEG_LAT],
  accuracyM,
});

const RIDES = {
  'no fixes': [],
  'one fix': [at(0, 0)],
  'a straight walk': Array.from({ length: 60 }, (_, s) => at(s, s * 1.4)),
  // The shared fixture: a stand of two minutes, a jump, a repeated time, a fix in Taiwan.
  'the shared Fairview to Cubao ride': rideFixes(),
  'fixes too vague to count': [at(0, 0), at(1, 10, 80), at(2, 20), at(3, 30, 51)],
  // The first fix is wrong: three that agree with each other take over from it.
  'a wrong first fix, re-anchored': [
    { time: T0, at: [121.2, 14.9], accuracyM: 5 },
    at(1, 0),
    at(2, 8),
    at(3, 16),
    at(4, 24),
  ],
  // Out of order, as a phone sometimes hands them over.
  'fixes out of order': [at(2, 16), at(0, 0), at(1, 8), at(3, 24)],
  // Standing still, wandering a few metres, then moving off.
  'a stand, then moving off': [
    ...Array.from({ length: 30 }, (_, s) => at(s, (s % 3) * 2)),
    ...Array.from({ length: 30 }, (_, s) => at(30 + s, 10 + s * 8)),
  ],
};

for (const [name, fixes] of Object.entries(RIDES)) {
  test(`the notification says what the card says: ${name}`, () => {
    const page = pageDistance(fixes);
    const native = nativeDistance(fixes);
    // Doubles both ways; a millimetre is the same answer.
    assert.ok(Math.abs(page - native) < 0.001, `page ${page} m, native ${native} m`);
  });
}
