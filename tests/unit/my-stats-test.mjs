// The stats row as fetchMyStats reads it (myStatsOf in src/features/contribute/api/fetch-my-stats.ts):
// the row get_my_stats answers before contribution_fare is applied reads too, its fares and new
// vehicle kinds as 0, so the Account page does not hinge on the order the owner applies them in.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/my-stats-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { myStatsOf } from '../../src/features/contribute/api/fetch-my-stats.ts';

/** The row account_stats alone answers. */
const accountStatsRow = {
  rides: 3,
  distance_m: 15000,
  moving_s: 9000,
  standing_s: 1500,
  walk_m: 800,
  ride_m: 9201,
  walk_s: 600,
  ride_s: 6401,
  hinto_s: 360,
  marks: 6,
  jeep_rides: 2,
  bus_rides: 1,
  train_rides: 0,
  ferry_rides: 0,
  tricycle_rides: 0,
  other_rides: 0,
  active_days: 2,
  first_ride_at: '2026-10-30T23:00:00+00:00',
  longest_ride_m: 5000,
  longest_ride_moving_s: 3000,
  routes_helped: 1,
  hintuans_helped: 1,
};

test('a row from before contribution_fare reads, its fares and new kinds as 0', () => {
  const stats = myStatsOf([accountStatsRow]);
  assert.ok(stats);
  assert.equal(stats.rides, 3);
  assert.deepEqual(
    [stats.ridesByVehicle.jeep, stats.ridesByVehicle.eJeep, stats.ridesByVehicle.uvExpress],
    [2, 0, 0],
  );
  assert.deepEqual([stats.farePhpTotal, stats.fareRecordings], [0, 0]);
  assert.equal(stats.firstRideAt, Date.parse('2026-10-30T23:00:00+00:00'));
  assert.deepEqual(stats.longestRide, { distanceM: 5000, movingSeconds: 3000 });
});

test('a row with contribution_fare reads its fares and new kinds', () => {
  const stats = myStatsOf([
    {
      ...accountStatsRow,
      e_jeep_rides: 4,
      uv_express_rides: 1,
      fare_php_total: 75.5,
      fare_recordings: 3,
    },
  ]);
  assert.ok(stats);
  assert.deepEqual([stats.ridesByVehicle.eJeep, stats.ridesByVehicle.uvExpress], [4, 1]);
  assert.deepEqual([stats.farePhpTotal, stats.fareRecordings], [75.5, 3]);
});

test('no row, or one missing a column account_stats always has, is not read', () => {
  assert.equal(myStatsOf([]), null);
  assert.equal(myStatsOf(null), null);
  const { rides: _rides, ...noRides } = accountStatsRow;
  assert.equal(myStatsOf([noRides]), null);
});
