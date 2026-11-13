// A ride's summary card: what it says (src/features/contribute/history/ride-summary.ts), how its
// names break into lines (wrap-lines.ts) and the file it is saved as
// (share-ride-summary.ts summaryFileName), and the bytes the app's share sheet gets (native-share.ts).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/ride-summary-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rideSummaryOf } from '../../src/features/contribute/history/ride-summary.ts';
import { wrapLines } from '../../src/features/contribute/history/wrap-lines.ts';
import { pathEnds } from '../../src/features/contribute/history/draw-summary-trail.ts';
import { summaryFileName } from '../../src/features/contribute/history/share-ride-summary.ts';
import { blobToBase64 } from '../../src/features/contribute/native/native-share.ts';
import { readFileSync } from 'node:fs';

const T0 = Date.UTC(2026, 0, 25, 0, 0, 0);
const RIDE = {
  version: 2,
  id: '11111111-0000-4000-8000-000000000001',
  status: 'saved',
  startedAt: T0,
  stoppedAt: T0 + (1 * 3600 + 12 * 60) * 1000,
  savedAt: T0 + 2 * 3600 * 1000,
  gaps: [],
  modes: [{ time: T0, to: 'ride' }],
  startPointName: 'Cubao',
  endPointName: 'Cogeo',
  description: '',
  rideKind: 'Jeep',
  distanceM: 12_740,
};

test('a jeep ride says where it went, how far, how long and in what', () => {
  const summary = rideSummaryOf(RIDE, { distanceM: 12_740, isWalkOnly: false, trail: null });
  assert.deepEqual(summary, {
    title: 'Cubao',
    to: 'Cogeo',
    mode: 'Jeep',
    distance: { value: '12.7', unit: 'km' },
    time: '1h 12m',
    date: 'Jan 25, 2026',
  });
});

test('a walk says Lakad, and a ride with no vehicle picked says nothing for it', () => {
  const walk = { ...RIDE, rideKind: null, modes: [{ time: T0, to: 'walk' }] };
  assert.equal(rideSummaryOf(walk, null).mode, 'Lakad');
  assert.equal(rideSummaryOf({ ...RIDE, rideKind: null }, null).mode, '');
});

test('a distance not read yet is left off, and a ride never stopped has no time', () => {
  const unread = { ...RIDE, distanceM: undefined, stoppedAt: null };
  const summary = rideSummaryOf(unread, null);
  assert.equal(summary.distance, null);
  assert.equal(summary.time, '0h 0m');
});

test('names break at words and the last line is cut with an ellipsis', () => {
  const measure = (s) => s.length * 10; // ten pixels a character
  // Three lines' worth in two: the second keeps what fits and ends in an ellipsis.
  assert.deepEqual(wrapLines('Cubao via Marcos Highway', 120, 2, measure), [
    'Cubao via',
    'Marcos…',
  ]);
  assert.deepEqual(wrapLines('Cubao', 120, 2, measure), ['Cubao']);
  assert.deepEqual(wrapLines('   ', 120, 2, measure), []);
  // One word longer than the line is cut to fit, so it never runs off the card's edge.
  assert.deepEqual(wrapLines('Pinagdanlayan', 50, 1, measure), ['Pina…']);
  assert.deepEqual(wrapLines('Pinagdanlayan Farmers', 100, 2, measure), ['Pinagdanl…', 'Farmers']);
  // An emoji is two units long here and is dropped whole, never left as half a pair.
  assert.deepEqual(wrapLines('🚌🚌🚌', 50, 1, measure), ['🚌🚌…']);
});

test('the file is dated by the ride’s day in Manila', () => {
  // 23:30 on Jan 24 in UTC is already Jan 25 in Manila.
  assert.equal(summaryFileName(Date.UTC(2026, 0, 24, 23, 30)), 'para-ride-2026-01-25.png');
});

test('a sketch path gives back where it begins and ends', () => {
  assert.deepEqual(pathEnds('M12 30L40.5 22L88 7'), { first: [12, 30], last: [88, 7] });
  assert.equal(pathEnds(''), null);
});

test("the app's share sheet gets every byte of a picture bigger than one piece", async () => {
  const bytes = Uint8Array.from({ length: 100_000 }, (_, i) => (i * 7) % 256);
  const base64 = await blobToBase64(new Blob([bytes], { type: 'image/png' }));
  assert.equal(base64, Buffer.from(bytes).toString('base64'));
});

test("the file name passes the plugin's own check on names", () => {
  const java = readFileSync(
    'android/app/src/main/java/ph/para/contributor/ShareImagePlugin.java',
    'utf8',
  );
  const [, pattern] = java.match(/fileName\.matches\("([^"]+)"\)/);
  assert.match(summaryFileName(T0), new RegExp(`^${pattern.replaceAll('\\\\', '\\')}$`));
});
