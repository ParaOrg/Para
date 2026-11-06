import * as z from 'zod/mini';

import { lngLatSchema } from '../model/geojson-schema';

/**
 * The OpenStreetMap landmark file place search reads (`/data/landmarks.v1.json`, built by
 * scripts/landmarks/build.sh; .scratch/place-search, step 2), as one contract: the reader parses
 * the file with it. The file says `extract_at` and `license_note`; the app says extractAt and
 * licenseNote. A landmark without aliases leaves the field out; the app always has the list.
 */

/** What the owner listed (decision 6), in the order the file keeps them. */
export const landmarkKindSchema = z.enum([
  'mall',
  'school',
  'university',
  'hospital',
  'church',
  'market',
  'station',
  'barangay',
  'street',
]);
export type LandmarkKind = z.infer<typeof landmarkKindSchema>;

const landmarkSchema = z.pipe(
  z.object({
    /** The OpenStreetMap id: `n`, `w` or `r` and the number. */
    id: z.string().check(z.regex(/^[nwr]\d+$/)),
    name: z.string().check(z.minLength(1)),
    kind: landmarkKindSchema,
    point: lngLatSchema,
    aliases: z.optional(z.array(z.string())),
  }),
  z.transform(({ aliases, ...landmark }) => ({ ...landmark, aliases: aliases ?? [] })),
);
export type Landmark = z.infer<typeof landmarkSchema>;

export const landmarkFileSchema = z.pipe(
  z.looseObject({
    schema: z.literal(1),
    license: z.string(),
    /** The credit shown beside any landmark: "© OpenStreetMap contributors". */
    attribution: z.string(),
    license_note: z.string(),
    source: z.string(),
    extract_at: z.string(),
    landmarks: z.array(landmarkSchema),
  }),
  z.transform(({ license_note, extract_at, ...rest }) => ({
    ...rest,
    licenseNote: license_note,
    extractAt: extract_at,
  })),
);
export type LandmarkFile = z.infer<typeof landmarkFileSchema>;
