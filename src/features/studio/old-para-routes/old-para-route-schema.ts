import * as z from 'zod/mini';

import { lngLatSchema } from '@/features/routes/model/geojson-schema';

/*
 * The studio's old Para route files (scripts/old-para-routes/old-para-route-file.mjs writes them;
 * the spec is .scratch/old-para-routes/spec.md): an index of the old Para app's community routes,
 * and one file per route with a line, read when an editor picks it.
 */

/** The modes, as the files name them. */
export const oldParaModeSchema = z.enum(['jeepney', 'uv', 'bus']);

export type OldParaMode = z.infer<typeof oldParaModeSchema>;

const endSchema = z.nullable(lngLatSchema);

/** One index row: [Para ID, mode, name, verified, loop, one way, start, end, metres, gaps, coarse line]. */
const indexRowSchema = z.tuple([
  z.string(),
  oldParaModeSchema,
  z.string(),
  z.boolean(),
  z.boolean(),
  z.boolean(),
  endSchema,
  endSchema,
  z.nullable(z.number()),
  z.number(),
  z.nullable(z.array(lngLatSchema)),
]);

const headerShape = { schema: z.literal(1) };

export const oldParaRouteIndexSchema = z.pipe(
  z.looseObject({ ...headerShape, routes: z.array(indexRowSchema) }),
  z.transform(({ routes }) =>
    routes.map(
      ([paraId, mode, name, isVerified, isLoop, isOneway, start, end, lengthM, gaps, coarse]) => ({
        paraId,
        mode,
        name,
        isVerified,
        isLoop,
        isOneway,
        start,
        end,
        lengthM,
        gapCount: gaps,
        /** The line for "near the map's centre", null for a route the old app has no line for. */
        coarse,
      }),
    ),
  ),
);

export type OldParaRouteSummary = z.infer<typeof oldParaRouteIndexSchema>[number];

/** A gap in the line: the index of the point before it, and the metres across. */
const gapSchema = z.tuple([z.number(), z.number()]);

export const oldParaRouteSchema = z.pipe(
  z.looseObject({
    ...headerShape,
    para_id: z.string(),
    /** The old app's own row id, for tracing a route back to its backup. */
    old_id: z.string(),
    name: z.string(),
    mode: oldParaModeSchema,
    verified: z.boolean(),
    loop: z.boolean(),
    oneway: z.boolean(),
    start: endSchema,
    end: endSchema,
    length_m: z.nullable(z.number()),
    gaps: z.array(gapSchema),
    line: z.array(lngLatSchema),
  }),
  z.transform((route) => ({
    paraId: route.para_id,
    oldId: route.old_id,
    name: route.name,
    mode: route.mode,
    isVerified: route.verified,
    isLoop: route.loop,
    isOneway: route.oneway,
    start: route.start,
    end: route.end,
    lengthM: route.length_m,
    line: route.line,
    gaps: route.gaps.map(([after, metres]) => ({ after, metres })),
  })),
);

export type OldParaRoute = z.infer<typeof oldParaRouteSchema>;
