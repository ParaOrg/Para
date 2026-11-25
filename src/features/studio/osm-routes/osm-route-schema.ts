import * as z from 'zod/mini';

import { lngLatSchema } from '@/features/routes/model/geojson-schema';
import type { LngLat } from '@/shared/utils/geo';

/*
 * The studio's OSM route files (scripts/osm-routes/osm-route-file.mjs writes them; the plan is
 * .scratch/osm-route-start/plan.md): an index of OpenStreetMap's jeepney, UV, bus and rail routes
 * that reach the map's area, and one file per route, read when an editor picks it.
 */

/** The kinds the studio offers, as the file names them. */
export const osmRouteKindSchema = z.enum(['jeepney', 'uv', 'bus', 'rail']);

export type OsmRouteKind = z.infer<typeof osmRouteKindSchema>;

/** One index row: [id, kind, ref, name, from, to, network, version, last edit, gaps, stops, coarse line]. */
const indexRowSchema = z.tuple([
  z.number(),
  osmRouteKindSchema,
  z.string(),
  z.string(),
  z.string(),
  z.string(),
  z.string(),
  z.number(),
  z.string(),
  z.number(),
  z.number(),
  z.array(lngLatSchema),
]);

const headerShape = {
  schema: z.literal(1),
  license: z.string(),
  /** "© OpenStreetMap contributors". */
  attribution: z.string(),
  /** When the extract the files were built from was taken. */
  extract_at: z.string(),
};

export const osmRouteIndexSchema = z.pipe(
  z.looseObject({ ...headerShape, routes: z.array(indexRowSchema) }),
  z.transform(({ attribution, extract_at, routes }) => ({
    attribution,
    extractAt: extract_at,
    routes: routes.map(
      ([id, kind, ref, name, from, to, network, version, lastEdit, gaps, stops, coarse]) => ({
        id,
        kind,
        ref,
        name,
        from,
        to,
        network,
        version,
        lastEdit,
        gapCount: gaps,
        stopCount: stops,
        coarse,
      }),
    ),
  })),
);

export type OsmRouteIndex = z.infer<typeof osmRouteIndexSchema>;

export type OsmRouteSummary = OsmRouteIndex['routes'][number];

/** A stop OSM marks on the route: its role (stop, stop_entry_only, platform…), where, its name. */
const stopSchema = z.tuple([z.string(), z.number(), z.number(), z.string()]);

/** A gap in the line: the index of the point before it, and the metres across. */
const gapSchema = z.tuple([z.number(), z.number()]);

export const osmRouteSchema = z.pipe(
  z.looseObject({
    ...headerShape,
    id: z.number(),
    kind: osmRouteKindSchema,
    ref: z.string(),
    name: z.string(),
    from: z.string(),
    to: z.string(),
    network: z.string(),
    operator: z.string(),
    version: z.number(),
    last_edit: z.string(),
    /** Whether the line was cut to the map's area: it goes on outside it. */
    clipped: z.boolean(),
    /** The relation's own source, source:ref, note and fixme tags, as mapped. */
    provenance: z.record(z.string(), z.string()),
    gaps: z.array(gapSchema),
    stops: z.array(stopSchema),
    line: z.array(lngLatSchema),
  }),
  z.transform(({ last_edit, extract_at, gaps, stops, ...route }) => ({
    id: route.id,
    kind: route.kind,
    ref: route.ref,
    name: route.name,
    from: route.from,
    to: route.to,
    network: route.network,
    operator: route.operator,
    version: route.version,
    lastEdit: last_edit,
    extractAt: extract_at,
    attribution: route.attribution,
    isClipped: route.clipped,
    provenance: route.provenance,
    line: route.line,
    gaps: gaps.map(([after, metres]) => ({ after, metres })),
    stops: stops.map(([role, lng, lat, name]) => {
      const point: LngLat = [lng, lat];
      return { role, point, name };
    }),
  })),
);

export type OsmRoute = z.infer<typeof osmRouteSchema>;
