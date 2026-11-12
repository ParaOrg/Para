import { indexOutlineSchema, indexSchema, type Index } from './index-schema';
import { MAP_FILE_SCHEMA, MAP_FILE_TOO_NEW } from './map-file';

/**
 * A file read off `url` as the index of shape `schema`, its overviews as the
 * lines the map draws first. The refusals, in order: not a map at all
 * (whatever number it carries), a shape this app does not know (the banner's
 * message, MAP_FILE_TOO_NEW), another shape than asked for, and a row the
 * schema cannot read.
 */
export function parseIndex(raw: unknown, url: string, schema: number): Index {
  const outline = indexOutlineSchema.safeParse(raw);
  if (!outline.success) throw new Error(`${url} is not a published map`);
  const { schema: shape } = outline.data;
  // A file with no shape is the first one.
  const shapeNumber = typeof shape === 'number' ? shape : 1;
  if (shapeNumber > MAP_FILE_SCHEMA) throw new Error(MAP_FILE_TOO_NEW);
  if (shape !== schema) throw new Error(`${url} is shape ${shapeNumber}, not the index`);
  const parsed = indexSchema.safeParse(raw);
  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    const at = issue?.path.map(String).join('.') ?? '';
    throw new Error(
      `${url} has a row this app cannot read: ${at} ${issue?.message ?? ''}`.trimEnd(),
    );
  }
  return parsed.data;
}

/**
 * The published index as read from a file's text already fetched, at `url`: the same refusals as
 * the page's own load. For a reader that fetches it another way (the contributor app's).
 */
export function readIndexFile(raw: unknown, url: string): Index {
  return parseIndex(raw, url, MAP_FILE_SCHEMA);
}
