import * as z from 'zod/mini';

// A route's columns and its draft payload as the studio reads them: the
// approved rows (route, route_variant, route_stop) and 0022's payload v1.

const linkSchema = z.object({ stop_id: z.string(), stop_sequence: z.number() });
export const directionColumnsSchema = z.object({
  id: z.string(),
  reversed: z.boolean(),
  direction_name: z.optional(z.nullable(z.string())),
  origin_terminal: z.optional(z.nullable(z.string())),
  destination_terminal: z.optional(z.nullable(z.string())),
  control_points: z.unknown(),
  segments: z.unknown(),
  shape: z.unknown(),
  overview: z.unknown(),
  confidence: z.optional(z.string()),
  borrowed_from: z.optional(z.nullable(z.string())),
  borrowed_part: z.optional(z.nullable(z.string())),
  borrowed_m: z.optional(z.nullable(z.number())),
  signboards: z.optional(z.nullable(z.array(z.string()))),
});
const routeColumnsSchema = z.object({
  signboard: z.nullable(z.string()),
  mode: z.string(),
  fare_note: z.nullable(z.string()),
  via: z.nullable(z.string()),
  head_stop_id: z.nullable(z.string()),
  tail_stop_id: z.nullable(z.string()),
  is_loop: z.boolean(),
});
export const liveRouteSchema = z.extend(routeColumnsSchema, {
  id: z.string(),
  revision: z.number(),
  route_code: z.optional(z.nullable(z.string())),
});
export const liveLinkSchema = z.extend(linkSchema, { route_variant_id: z.string() });
export const routePayloadSchema = z.object({
  version: z.literal(1),
  route: routeColumnsSchema,
  route_code: z.optional(z.nullable(z.string())),
  directions: z.array(z.extend(directionColumnsSchema, { links: z.array(linkSchema) })),
});
