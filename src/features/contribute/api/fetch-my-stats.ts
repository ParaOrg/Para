import type { SupabaseClient } from '@supabase/supabase-js';
import * as z from 'zod/mini';

import { AccountError } from './account-problem';
import { requireClient } from './require-client';
import { UploadError } from './upload-problem';

const statsRowSchema = z.pipe(
  z.object({
    rides: z.number(),
    distance_m: z.number(),
    moving_s: z.number(),
    standing_s: z.number(),
    walk_m: z.number(),
    ride_m: z.number(),
    walk_s: z.number(),
    ride_s: z.number(),
    hinto_s: z.number(),
    marks: z.number(),
    jeep_rides: z.number(),
    bus_rides: z.number(),
    train_rides: z.number(),
    ferry_rides: z.number(),
    tricycle_rides: z.number(),
    other_rides: z.number(),
    active_days: z.number(),
    first_ride_at: z.nullable(z.string()),
    longest_ride_m: z.nullable(z.number()),
    longest_ride_moving_s: z.nullable(z.number()),
    routes_helped: z.number(),
    hintuans_helped: z.number(),
  }),
  z.transform((row) => ({
    rides: row.rides,
    distanceM: row.distance_m,
    movingSeconds: row.moving_s,
    standingSeconds: row.standing_s,
    walkM: row.walk_m,
    rideM: row.ride_m,
    walkSeconds: row.walk_s,
    rideSeconds: row.ride_s,
    hintoSeconds: row.hinto_s,
    marks: row.marks,
    ridesByVehicle: {
      jeep: row.jeep_rides,
      bus: row.bus_rides,
      train: row.train_rides,
      ferry: row.ferry_rides,
      tricycle: row.tricycle_rides,
      other: row.other_rides,
    },
    activeDays: row.active_days,
    firstRideAt: row.first_ride_at === null ? null : Date.parse(row.first_ride_at),
    longestRide:
      row.longest_ride_m === null || row.longest_ride_moving_s === null
        ? null
        : { distanceM: row.longest_ride_m, movingSeconds: row.longest_ride_moving_s },
    routesHelped: row.routes_helped,
    hintuansHelped: row.hintuans_helped,
  })),
);

/**
 * The signed-in contributor's lifetime numbers, their rides older than 24 months included. Rides
 * saved before the walk and ride split count in neither walkM nor rideM, so the two can add up to
 * less than distanceM. Nothing about a ride an editor hid.
 */
export type MyStats = z.infer<typeof statsRowSchema>;

/** The signed-in contributor's own stats, from get_my_stats. Needs signal. */
export async function fetchMyStats(): Promise<MyStats> {
  let client;
  try {
    client = await requireClient();
  } catch (error) {
    if (error instanceof UploadError && error.problem === 'offline') {
      throw new AccountError('offline', error.message);
    }
    throw new AccountError('unavailable', String(error));
  }
  // TODO: typed rpc once account_stats is applied and database types are regenerated.
  const untyped: SupabaseClient = client;
  const { data, error, status } = await untyped.rpc('get_my_stats');
  if (error) {
    if (status === 0) throw new AccountError('offline', error.message);
    console.warn(`Para did not give the stats (HTTP ${status}):`, error.message);
    throw new AccountError('not-accepting', error.message);
  }
  const rows = z.array(statsRowSchema).safeParse(data);
  const [stats] = rows.success ? rows.data : [];
  if (!stats) throw new AccountError('not-accepting', 'The stats are not in the form expected.');
  return stats;
}
