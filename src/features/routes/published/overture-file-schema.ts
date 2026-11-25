import * as z from 'zod/mini';

import { cellEntrySchema, cellNameSchema, isRowOf } from './establishment-file-schema';

/*
 * The Overture place files as one contract (.scratch/establishments, step E3c): the index
 * (`/data/overture/v1/index.json`) and its cells (`/data/overture/v1/<cell>.json`), in the
 * establishment files' shape (establishment-file-schema.ts) but under Overture's licences and
 * with Overture's kinds, built monthly by scripts/landmarks/build.sh (scripts/overture/).
 */

export const overtureKindSchema = z.enum([
  'restaurant',
  'fast_food',
  'cafe',
  'clinic',
  'dentist',
  'school',
  'college',
  'convenience',
  'supermarket',
  'pharmacy',
  'laundry',
]);
export type OvertureKind = z.infer<typeof overtureKindSchema>;

export const overtureIndexSchema = z.object({
  schema: z.literal(1),
  license: z.literal('CDLA-Permissive-2.0 AND Apache-2.0 AND CC0-1.0'),
  /** The credit shown while the places are: "© Overture Maps Foundation". */
  attribution: z.string().check(z.minLength(1)),
  license_note: z.string().check(z.minLength(1)),
  source: z.string().check(z.minLength(1)),
  /** Overture's release, such as 2026-11-18.0. */
  release: z.string().check(z.minLength(1)),
  cell_deg: z.number(),
  kinds: z.array(overtureKindSchema),
  cells: z.array(cellEntrySchema),
});
export type OvertureIndex = z.infer<typeof overtureIndexSchema>;

/** A row: [Overture id, kind, lng, lat], then its name and, when it has one, its brand. */
export type OvertureRow =
  | [string, OvertureKind, number, number]
  | [string, OvertureKind, number, number, string | null]
  | [string, OvertureKind, number, number, string | null, { brand?: string }];

const isOvertureRow = isRowOf(overtureKindSchema.options);
const isRow = (row: unknown): row is OvertureRow => isOvertureRow(row);

export const overtureCellSchema = z.object({
  schema: z.literal(1),
  cell: cellNameSchema,
  attribution: z.string().check(z.minLength(1)),
  establishments: z.array(z.custom<OvertureRow>(isRow)).check(z.minLength(1)),
});
export type OvertureCell = z.infer<typeof overtureCellSchema>;
