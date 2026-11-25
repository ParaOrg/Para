import * as z from 'zod/mini';

/** The studio's search files (scripts/search/search-file.mjs builds them), by source. */
export const STORE_FILES = {
  osm: '/data/search/v1/osm.json',
  overture: '/data/search/v1/overture.json',
} as const;

export type StoreSource = keyof typeof STORE_FILES;

/** Each file's place: its name, its category's index in `categories`, and where it is. */
const rowSchema = z.tuple([z.string(), z.number(), z.number(), z.number()]);

export const storeFileSchema = z.looseObject({
  schema: z.literal(1),
  license: z.string(),
  /** "© OpenStreetMap contributors" or "© Overture Maps Foundation". */
  attribution: z.string(),
  categories: z.array(z.string()),
  places: z.array(rowSchema),
});

export type StoreFile = z.infer<typeof storeFileSchema>;
