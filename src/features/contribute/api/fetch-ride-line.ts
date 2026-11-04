import * as z from 'zod/mini';

import type { LngLat } from '@/shared/utils/geo';

import { requireClient } from './require-client';
import { answerError } from './upload-contribution';

const lineRowsSchema = z.array(
  z.object({
    line: z.nullable(
      z.object({
        type: z.literal('LineString'),
        coordinates: z.array(z.tuple([z.number(), z.number()])),
      }),
    ),
  }),
);

/**
 * The line Para keeps of one of the signed-in account's uploads: its whole trail, thinned as it
 * was sent (pack-recording.ts), for a ride whose fixes this phone does not have. Null when the
 * upload kept none (too short a ride). Row security lets an account read only its own.
 */
export async function fetchRideLine(rideId: string): Promise<LngLat[] | null> {
  const client = await requireClient();
  const { data, error, status } = await client
    .from('contribution')
    .select('line')
    .eq('id', rideId)
    .limit(1);
  if (error) throw answerError(error, status);
  return lineRowsSchema.parse(data)[0]?.line?.coordinates ?? null;
}
