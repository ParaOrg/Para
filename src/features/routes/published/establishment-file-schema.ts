import * as z from 'zod/mini';

/*
 * The establishment files as one contract (.scratch/establishments, step E3a): the index
 * (`/data/establishments/v1/index.json`) and its cells (`/data/establishments/v1/<cell>.json`),
 * built monthly by scripts/landmarks/build.sh. The unit checks parse every committed file with
 * these; the readers come with the steps that draw and search them (E3b, E3d).
 */

export const establishmentKindSchema = z.enum([
  'atm',
  'bank',
  'pawnshop',
  'remittance',
  'pharmacy',
  'convenience',
  'supermarket',
  'restaurant',
  'fast_food',
  'cafe',
  'fuel',
  'clinic',
  'laundry',
  'toilets',
  'police',
]);
export type EstablishmentKind = z.infer<typeof establishmentKindSchema>;

const cellNameSchema = z.string().check(z.regex(/^\d+-\d+$/));

/** One cell as the index lists it: what a phone needs to fetch it and know when it changed. */
const cellEntrySchema = z.object({
  cell: cellNameSchema,
  count: z.number().check(z.int(), z.positive()),
  bytes: z.number().check(z.int(), z.positive()),
  /** The first 16 hex digits of the cell file's SHA-256: changes whenever the file does. */
  hash: z.string().check(z.regex(/^[0-9a-f]{16}$/)),
});

export const establishmentIndexSchema = z.object({
  schema: z.literal(1),
  license: z.literal('ODbL-1.0'),
  /** The credit shown wherever an establishment is: "© OpenStreetMap contributors". */
  attribution: z.string().check(z.minLength(1)),
  license_note: z.string().check(z.minLength(1)),
  source: z.string().check(z.minLength(1)),
  extract_at: z.iso.datetime(),
  cell_deg: z.number().check(z.positive()),
  kinds: z.array(establishmentKindSchema),
  cells: z.array(cellEntrySchema),
});
export type EstablishmentIndex = z.infer<typeof establishmentIndexSchema>;

/** A row: [OSM id, kind, lng, lat], then its name (or null) and its extras when it has any. */
const rowSchema = z.union([
  z.tuple([z.string(), establishmentKindSchema, z.number(), z.number()]),
  z.tuple([z.string(), establishmentKindSchema, z.number(), z.number(), z.nullable(z.string())]),
  z.tuple([
    z.string(),
    establishmentKindSchema,
    z.number(),
    z.number(),
    z.nullable(z.string()),
    z.object({ brand: z.optional(z.string()), atm: z.optional(z.literal(true)) }),
  ]),
]);

export const establishmentCellSchema = z.object({
  schema: z.literal(1),
  cell: cellNameSchema,
  attribution: z.string().check(z.minLength(1)),
  establishments: z.array(rowSchema).check(z.minLength(1)),
});
export type EstablishmentCell = z.infer<typeof establishmentCellSchema>;
