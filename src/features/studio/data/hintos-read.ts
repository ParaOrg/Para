import * as z from 'zod/mini';

import { pointInRing } from '@/features/routes/geo/ring';
import { bboxOf, type LngLat } from '@/shared/utils/geo';

import { requireSupabase } from './supabase';

/** Hintos read from one box's rectangle: a hintuan's box is small, so this is never reached by a real one. */
const HINTO_LIMIT = 5000;

const hintoPlaceSchema = z.object({
  contribution_id: z.string(),
  lat: z.number(),
  lng: z.number(),
});

/**
 * The uploads with a hinto inside the box: the rectangle around it is asked
 * of the database, the box itself decided here. Each upload once.
 */
export async function fetchContributionsWithHintoIn(box: readonly LngLat[]): Promise<string[]> {
  const [west, south, east, north] = bboxOf(box);
  const { data, error } = await requireSupabase()
    .from('hinto')
    .select('contribution_id, lat, lng')
    .gte('lat', south)
    .lte('lat', north)
    .gte('lng', west)
    .lte('lng', east)
    .limit(HINTO_LIMIT + 1);
  if (error) throw new Error(`The hintos in the box could not be read: ${error.message}`);
  if (data.length > HINTO_LIMIT)
    throw new Error('The box holds too many hintos to link. Draw it smaller.');
  const inside = z
    .array(hintoPlaceSchema)
    .parse(data)
    .filter((h) => pointInRing([h.lng, h.lat], [...box]));
  return [...new Set(inside.map((h) => h.contribution_id))];
}
