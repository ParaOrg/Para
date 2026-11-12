import * as z from 'zod/mini';

import { indexDirectionSchema, indexOutlineSchema, indexSchema, type Index } from './index-schema';
import { MAP_FILE_SCHEMA, MAP_FILE_TOO_NEW } from './map-file';
import { hotspotLinkSchema, hotspotSchema } from '../model/hotspot-schema';

/** The index as this app could read it, and how many of its rows it skipped. */
export interface ReadIndex extends Index {
  /** The rows left out because this app cannot read them, and the links that pointed at them. */
  skipped: number;
}

const idOf = (row: unknown): unknown =>
  typeof row === 'object' && row !== null && 'id' in row ? row.id : undefined;

/** The rows `schema` can read, and the ids of those it cannot. */
function readable(rows: readonly unknown[], schema: z.ZodMiniType) {
  const kept: unknown[] = [];
  const skippedIds = new Set<unknown>();
  for (const row of rows) {
    if (schema.safeParse(row).success) kept.push(row);
    else skippedIds.add(idOf(row));
  }
  return { kept, skippedIds, skipped: rows.length - kept.length };
}

const linkEndsSchema = z.object({ route_variant_id: z.unknown(), stop_id: z.unknown() });

/** What to do with a row this app cannot read: leave it out, or refuse the whole file. */
export type UnreadableRows = 'skip' | 'refuse';

/**
 * A file read off `url` as the index of shape `schema`, its overviews as the
 * lines the map draws first. The refusals, in order: not a map at all
 * (whatever number it carries), a shape this app does not know (the banner's
 * message, MAP_FILE_TOO_NEW), another shape than asked for, and a row the
 * schema cannot read.
 *
 * With `rows` 'skip', a row this app cannot read is left out, not the whole
 * map with it: a direction of a mode added since this app was built, a
 * hotspot of a kind it does not know. The links that point at a skipped row
 * go with it, and a file with no direction left is still refused. That is
 * for the file the network answers with, which is the newest there is. A
 * copy kept from an earlier visit is read with 'refuse', so one with such a
 * row is passed over for an older copy that reads whole (fetch-index.ts).
 *
 * Skipping covers a value the app has never seen, in a field it knows; a
 * field that changes its meaning still needs a new shape (map-file.ts).
 */
export function parseIndex(
  raw: unknown,
  url: string,
  schema: number,
  rows: UnreadableRows = 'refuse',
): ReadIndex {
  const outline = indexOutlineSchema.safeParse(raw);
  if (!outline.success) throw new Error(`${url} is not a published map`);
  const { schema: shape } = outline.data;
  // A file with no shape is the first one.
  const shapeNumber = typeof shape === 'number' ? shape : 1;
  if (shapeNumber > MAP_FILE_SCHEMA) throw new Error(MAP_FILE_TOO_NEW);
  if (shape !== schema) throw new Error(`${url} is shape ${shapeNumber}, not the index`);

  const directions = readable(outline.data.variants, indexDirectionSchema);
  const hotspots = readable(outline.data.stops, hotspotSchema);
  const links = readable(outline.data.links, hotspotLinkSchema);
  const linked = links.kept.filter((link) => {
    const ends = linkEndsSchema.safeParse(link);
    return (
      ends.success &&
      !directions.skippedIds.has(ends.data.route_variant_id) &&
      !hotspots.skippedIds.has(ends.data.stop_id)
    );
  });
  const hasNoDirection = outline.data.variants.length > 0 && directions.kept.length === 0;
  const parsed = indexSchema.safeParse(
    rows === 'refuse' || hasNoDirection
      ? raw
      : { ...outline.data, variants: directions.kept, stops: hotspots.kept, links: linked },
  );
  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    const at = issue?.path.map(String).join('.') ?? '';
    throw new Error(
      `${url} has a row this app cannot read: ${at} ${issue?.message ?? ''}`.trimEnd(),
    );
  }
  const skipped =
    rows === 'refuse'
      ? 0
      : directions.skipped + hotspots.skipped + outline.data.links.length - linked.length;
  return { ...parsed.data, skipped };
}

/**
 * The published index as read from a file's text already fetched, at `url`: the same refusals as
 * the page's own load. For a reader that fetches it another way (the contributor app's).
 */
export function readIndexFile(raw: unknown, url: string): ReadIndex {
  return parseIndex(raw, url, MAP_FILE_SCHEMA, 'skip');
}
