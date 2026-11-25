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

export const cellNameSchema = z.string().check(z.regex(/^\d+-\d+$/));

/** One cell as the index lists it: what a phone needs to fetch it and know when it changed. */
export const cellEntrySchema = z.object({
  cell: cellNameSchema,
  count: z.number(),
  bytes: z.number(),
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
  extract_at: z.string().check(z.minLength(1)),
  cell_deg: z.number(),
  kinds: z.array(establishmentKindSchema),
  cells: z.array(cellEntrySchema),
});
export type EstablishmentIndex = z.infer<typeof establishmentIndexSchema>;

/** A row: [OSM id, kind, lng, lat], then its name (or null) and its extras when it has any. */
export type EstablishmentRow =
  | [string, EstablishmentKind, number, number]
  | [string, EstablishmentKind, number, number, string | null]
  | [string, EstablishmentKind, number, number, string | null, { brand?: string; atm?: true }];

const isExtras = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  Object.entries(value).every(
    ([key, v]) => (key === 'brand' && typeof v === 'string') || (key === 'atm' && v === true),
  );

/**
 * A row's check for a set of kinds, written by hand: a tuple of four to six whose fifth is a name
 * or null and whose sixth is the extras. Written out rather than with zod's tuples and unions,
 * which the page's opening zod chunk would otherwise carry for these readers. The Overture files
 * (overture-file-schema.ts) check theirs with it too.
 */
export function isRowOf(kinds: readonly string[]) {
  return (row: unknown): boolean => {
    if (!Array.isArray(row) || row.length < 4 || row.length > 6) return false;
    const [id, kind, lng, lat, name, extras]: unknown[] = row;
    return (
      typeof id === 'string' &&
      typeof kind === 'string' &&
      kinds.includes(kind) &&
      typeof lng === 'number' &&
      typeof lat === 'number' &&
      (row.length < 5 || name === null || typeof name === 'string') &&
      (row.length < 6 || isExtras(extras))
    );
  };
}

const isOsmRow = isRowOf(establishmentKindSchema.options);
const isRow = (row: unknown): row is EstablishmentRow => isOsmRow(row);

export const establishmentCellSchema = z.object({
  schema: z.literal(1),
  cell: cellNameSchema,
  attribution: z.string().check(z.minLength(1)),
  establishments: z.array(z.custom<EstablishmentRow>(isRow)).check(z.minLength(1)),
});
export type EstablishmentCell = z.infer<typeof establishmentCellSchema>;
