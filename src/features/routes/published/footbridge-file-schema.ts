import * as z from 'zod/mini';

import { lngLatSchema } from '../model/geojson-schema';

/**
 * The OpenStreetMap footbridge file the map draws (`/data/footbridges.v1.json`, built by
 * scripts/landmarks/build.sh with scripts/footbridges/; .scratch/footbridges), as one contract:
 * the reader parses the file with it. A footbridge is the footways on one bridge, each a line, and
 * the elevators and steps that lead up to it. Optional fields the file leaves out read here as
 * their empty value.
 */

const accessPointSchema = z.object({
  kind: z.enum(['elevator', 'steps']),
  point: lngLatSchema,
});
export type FootbridgeAccess = z.infer<typeof accessPointSchema>;

const footbridgeSchema = z.pipe(
  z.object({
    /** The lowest OpenStreetMap way id among its footways: `w` and the number. */
    id: z.string().check(z.regex(/^w\d+$/)),
    name: z.optional(z.string().check(z.minLength(1))),
    covered: z.optional(z.literal(true)),
    lines: z.array(z.array(lngLatSchema).check(z.minLength(2))).check(z.minLength(1)),
    access: z.optional(z.array(accessPointSchema)),
  }),
  z.transform(({ name, covered, access, ...footbridge }) => ({
    ...footbridge,
    name: name ?? null,
    isCovered: covered === true,
    access: access ?? [],
  })),
);
export type Footbridge = z.infer<typeof footbridgeSchema>;

export const footbridgeFileSchema = z.object({
  schema: z.literal(1),
  license: z.string(),
  /** The credit the map shows: "© OpenStreetMap contributors". */
  attribution: z.string(),
  footbridges: z.array(footbridgeSchema),
});
export type FootbridgeFile = z.infer<typeof footbridgeFileSchema>;
