// A ride's Commute Information (src/features/contribute/history/ride-details.ts) and the trip's
// time in words (common/format.ts tripTimeText).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/ride-details-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rideDetailsOf } from '../../src/features/contribute/history/ride-details.ts';
import { tripTimeText } from '../../src/features/contribute/common/format.ts';

const T0 = Date.UTC(2026, 0, 25, 0, 0, 0);
const RIDE = {
  version: 2,
  id: '11111111-0000-4000-8000-000000000001',
  status: 'saved',
  startedAt: T0,
  stoppedAt: T0 + (4 * 3600 + 30 * 60 + 40) * 1000,
  savedAt: T0 + 5 * 3600 * 1000,
  gaps: [],
  modes: [{ time: T0, to: 'ride' }],
  startPointName: 'Cubao via Marcos Highway',
  endPointName: 'Cogeo',
  description: '',
  rideKind: 'Jeep',
  farePhp: 30,
  distanceM: 12_700,
};
const FACTS = { distanceM: 12_700, isWalkOnly: false, trail: null };

const rowsOf = (recording, facts = FACTS) =>
  Object.fromEntries(rideDetailsOf(recording, facts).map((row) => [row.label, row.value]));

test('a ride with everything known: the five rows, in the frame order', () => {
  assert.deepEqual(
    rideDetailsOf(RIDE, FACTS).map((row) => row.label),
    ['Transport mode', 'Fare', 'Distance', 'Time', 'Date'],
  );
  assert.deepEqual(rowsOf(RIDE), {
    'Transport mode': 'Jeep',
    Fare: '₱30',
    Distance: '12.7 km',
    Time: '4 hr 30 mins and 40 secs',
    Date: 'Jan 25, 2026',
  });
});

test('a fare is spoken in pesos, and centavos show', () => {
  const fare = rideDetailsOf({ ...RIDE, farePhp: 13.5 }, FACTS).find((row) => row.label === 'Fare');
  assert.deepEqual(fare, { label: 'Fare', value: '₱13.50', spoken: '13.50 pesos' });
});

test('nothing known is no row: no vehicle, no fare, no distance yet', () => {
  const rows = rowsOf({ ...RIDE, rideKind: null, farePhp: undefined, distanceM: undefined }, null);
  assert.deepEqual(Object.keys(rows), ['Time', 'Date']);
});

test('a free ride says ₱0, not nothing', () => {
  assert.equal(rowsOf({ ...RIDE, farePhp: 0 }).Fare, '₱0');
});

test('walked the whole way: Lakad, whatever vehicle was picked', () => {
  const walked = { ...RIDE, modes: [{ time: T0, to: 'walk' }] };
  assert.equal(rowsOf(walked, { ...FACTS, isWalkOnly: true })['Transport mode'], 'Lakad (walking)');
});

test('an upload from another phone: the distance the database kept', () => {
  const elsewhere = { ...RIDE, farePhp: undefined, distanceM: undefined };
  assert.equal(rowsOf(elsewhere, { ...FACTS, distanceM: 850 }).Distance, '850 m');
});

test('the trip time in words, zero parts left out', () => {
  assert.equal(tripTimeText(4 * 3600 + 30 * 60 + 40), '4 hr 30 mins and 40 secs');
  assert.equal(tripTimeText(12 * 60), '12 mins');
  assert.equal(tripTimeText(61), '1 min and 1 sec');
  assert.equal(tripTimeText(3600 + 5), '1 hr and 5 secs');
  assert.equal(tripTimeText(0.4), '0 secs');
  assert.equal(tripTimeText(-3), '0 secs');
});

test('an upload from another phone keeps the fare it was sent with', async () => {
  const { mergeHistory } = await import('../../src/features/contribute/history/history-merge.ts');
  const upload = {
    id: '22222222-0000-4000-8000-000000000002',
    startedAt: T0,
    stoppedAt: T0 + 600_000,
    startPointName: 'Cubao',
    endPointName: 'Cogeo',
    description: '',
    rideKind: 'Jeep',
    distanceM: 12_700,
    walkM: null,
    rideM: null,
    farePhp: 30,
  };
  const [withFare] = mergeHistory([], [upload]);
  assert.equal(rowsOf(withFare).Fare, '₱30');
  const [noFare] = mergeHistory([], [{ ...upload, farePhp: null }]);
  assert.equal(noFare.farePhp, undefined);
  assert.equal(rowsOf(noFare).Fare, undefined);
});
