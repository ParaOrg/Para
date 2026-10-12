import * as z from 'zod/mini';

import type { LngLat } from '@/shared/utils/geo';

/**
 * The GeoJSON the rows carry: a point for a hotspot, a polygon for its box, a
 * line string for a direction's line. Each schema validates what enters the
 * app (the published index and its line files, the studio's rows) and is the
 * one definition of the type (ticket 08 of the restructure follow-ups,
 * 2026-10-07). A coordinate is [lng, lat], shared/utils/geo's LngLat.
 *
 * zod/mini, the tree-shakeable API, throughout the schemas: the classic one
 * weighed 24 kB gzipped on the public page (check-build.mjs's zod ceiling),
 * and these schemas need nothing it adds. Its functions wrap where the
 * classic API chains: z.nullable(x) for x.nullable(), z.pipe(x, z.transform(f))
 * for x.transform(f).
 */
/** One coordinate: two finite numbers, as z.tuple([z.number(), z.number()]) reads it. */
const isLngLat = (c: unknown): c is LngLat =>
  Array.isArray(c) && c.length === 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]);

export const lngLatSchema = z.custom<LngLat>(isLngLat, { message: 'Not a [lng, lat] pair' });

/**
 * A run of coordinates — a line's, or one ring of a polygon's — checked in one
 * loop and kept as it came. The index of 5,000 directions carries 337,500
 * pairs: read pair by pair through z.array(z.tuple(…)) they cost the opening
 * some 200 ms of the main thread and a copy of every pair (scale-test's
 * budget, 2026-10-12); the loop reads them in a third of that and copies
 * nothing, and refuses exactly what the tuple refused.
 */
const isLngLats = (cs: unknown): cs is LngLat[] => Array.isArray(cs) && cs.every(isLngLat);

const lngLatsSchema = z.custom<LngLat[]>(isLngLats, { message: 'Not a list of [lng, lat] pairs' });

export const lineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: lngLatsSchema,
});
export type LineStringGeoJSON = z.infer<typeof lineStringSchema>;

export const pointSchema = z.object({
  type: z.literal('Point'),
  coordinates: lngLatSchema,
});
export type PointGeoJSON = z.infer<typeof pointSchema>;

export const polygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(lngLatsSchema),
});
export type PolygonGeoJSON = z.infer<typeof polygonSchema>;
