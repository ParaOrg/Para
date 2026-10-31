import * as z from 'zod/mini';

import { VEHICLE_OF } from './pack-recording';
import { requireClient } from './require-client';
import { answerError } from './upload-contribution';
import { UploadError } from './upload-problem';
import { RIDE_KINDS, type RideKind } from '../storage/recording-schema';

/** One of the account's uploads, as the database holds it: whichever phone sent it. */
export interface AccountUpload {
  id: string;
  startedAt: number;
  stoppedAt: number;
  startPointName: string;
  endPointName: string;
  description: string;
  /** What was ridden, in the phone's names; null for none, or a vehicle this page does not know. */
  rideKind: RideKind | null;
  distanceM: number;
  /** Walked (Lakad) and ridden (Sakay), adding up to distanceM; null on uploads from before the split was kept. */
  walkM: number | null;
  rideM: number | null;
}

/** The phone's name for a vehicle as the database keeps it. */
const rideKindOf = (vehicle: string | null): RideKind | null =>
  RIDE_KINDS.find((kind) => VEHICLE_OF[kind] === vehicle) ?? null;

const MAX_UPLOADS = 500;

const uploadRowsSchema = z.array(
  z.object({
    id: z.string(),
    started_at: z.string(),
    ended_at: z.string(),
    start_name: z.nullable(z.string()),
    end_name: z.nullable(z.string()),
    description: z.nullable(z.string()),
    vehicle: z.nullable(z.string()),
    distance_m: z.number(),
    // Null on uploads from before the walk and ride split was kept.
    walk_m: z.nullable(z.number()),
    ride_m: z.nullable(z.number()),
  }),
);

/**
 * Every upload the signed-in account owns, newest first. Asked for by contributor: an editor's
 * session can read everyone's, and must see only its own here. It keeps the newest MAX_UPLOADS:
 * TODO paginate if an account ever sends more.
 */
export async function fetchAccountUploads(): Promise<AccountUpload[]> {
  const client = await requireClient();
  const { data: auth } = await client.auth.getSession();
  if (!auth.session) throw new UploadError('blocked', 'Listing uploads needs a signed-in account.');
  const { data, error, status } = await client
    .from('contribution')
    .select(
      'id, started_at, ended_at, start_name, end_name, description, vehicle, distance_m, walk_m, ride_m',
    )
    .eq('contributor_id', auth.session.user.id)
    .order('started_at', { ascending: false })
    .limit(MAX_UPLOADS);
  if (error) throw answerError(error, status);
  return uploadRowsSchema.parse(data).map((row) => ({
    id: row.id,
    startedAt: Date.parse(row.started_at),
    stoppedAt: Date.parse(row.ended_at),
    startPointName: row.start_name ?? '',
    endPointName: row.end_name ?? '',
    description: row.description ?? '',
    rideKind: rideKindOf(row.vehicle),
    distanceM: row.distance_m,
    walkM: row.walk_m,
    rideM: row.ride_m,
  }));
}
