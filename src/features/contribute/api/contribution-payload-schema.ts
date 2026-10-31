import * as z from 'zod/mini';

const isoTime = z.string();

const pointBatchSchema = z.object({
  seq: z.number(),
  first_at: isoTime,
  first_lat: z.number(),
  first_lng: z.number(),
  point_count: z.number(),
  dt_ms: z.array(z.number()),
  dlat: z.array(z.number()),
  dlng: z.array(z.number()),
  accuracy_m: z.array(z.number()),
});

const hintoRowSchema = z.object({
  seq: z.number(),
  started_at: isoTime,
  seconds: z.number(),
  lat: z.number(),
  lng: z.number(),
});

/** What `save_contribution` takes: one recording, whole, in the database's own names. */
export const contributionPayloadSchema = z.object({
  id: z.string(),
  format_version: z.number(),
  rules_version: z.number(),
  consent_version: z.number(),
  started_at: isoTime,
  ended_at: isoTime,
  sent_at: isoTime,
  vehicle: z.nullable(z.string()),
  start_name: z.string(),
  end_name: z.string(),
  description: z.string(),
  distance_m: z.number(),
  moving_s: z.number(),
  standing_s: z.number(),
  lost_s: z.number(),
  /** Walked (Lakad) and ridden (Sakay): they add up to distance_m and to moving_s + standing_s. */
  walk_m: z.number(),
  ride_m: z.number(),
  walk_s: z.number(),
  ride_s: z.number(),
  point_count: z.number(),
  events: z.array(z.object({ kind: z.string(), at: isoTime, to: z.optional(z.string()) })),
  gaps: z.array(z.object({ from: isoTime, to: isoTime, reasons: z.array(z.string()) })),
  line: z.nullable(
    z.object({
      type: z.literal('LineString'),
      coordinates: z.array(z.tuple([z.number(), z.number()])),
    }),
  ),
  west: z.nullable(z.number()),
  south: z.nullable(z.number()),
  east: z.nullable(z.number()),
  north: z.nullable(z.number()),
  batches: z.array(pointBatchSchema),
  hintos: z.array(hintoRowSchema),
});
export type ContributionPayload = z.infer<typeof contributionPayloadSchema>;
export type PointBatch = z.infer<typeof pointBatchSchema>;
