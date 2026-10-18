import { lineLength } from '../../src/shared/utils/geo.ts';
import { indexSchema } from '../../src/features/routes/published/index-schema.ts';
import { MAP_FILE_SCHEMA } from '../../src/features/routes/published/map-file.ts';
import { EVERY_LINE, FERRY, withoutLines } from './withoutLines.mjs';

/** The data's licence, written into the file itself. See README.md, "Data and licence". */
export const LICENSE = 'ODbL-1.0';
export const ATTRIBUTION =
  'Route data © ParaPo contributors, ODbL (https://opendatacommons.org/licenses/odbl/1-0/). ' +
  'Derived from OpenStreetMap, © OpenStreetMap contributors.';

/** map.json's shape, the one before the index: fixed, since installed apps read it as it is. */
export const MAP_SCHEMA = 1;
/** The old index's shape, before the train lines: fixed, as map.json's. */
export const INDEX_V2_SCHEMA = 2;
/** The index with the trains but not the ferry: fixed. */
export const INDEX_V3_SCHEMA = 3;
/** The index with every line but no loops: fixed. */
export const INDEX_V4_SCHEMA = 4;
/** The index the app reads now, loops in: its own MAP_FILE_SCHEMA. */
export const INDEX_V5_SCHEMA = MAP_FILE_SCHEMA;

/** Says why a file cannot be published. The publish prints it and stops. */
export class ShapeError extends Error {}

/** Whether a published direction belongs to a loop. Judged on the row as the publish builds it, not on the reader's schema, which now accepts a loop. */
export function isLoopRow(v) {
  return (
    v.route?.is_loop === true || v.route?.head_stop_id == null || v.route?.tail_stop_id == null
  );
}

/**
 * The map without its loops: every direction of a loop and every link to
 * one, for the shapes an app installed before loops reads
 * (src/features/routes/published/map-file.ts). Its schema rejects a route
 * with no ends, and refuses the whole index for one. The stops stay: the
 * line files' orange stretches are keyed by every hotspot in the index, and
 * a terminal box a loop uses is a place on the map either way. Same shape of
 * answer as withoutLines.
 */
export function withoutLoops({ variants, stops, links }) {
  const directionIds = new Set(variants.filter(isLoopRow).map((v) => v.id));
  return {
    variants: variants.filter((v) => !directionIds.has(v.id)),
    stops,
    links: links.filter((l) => !directionIds.has(l.route_variant_id)),
    ids: { variants: directionIds, stops: new Set() },
  };
}

/**
 * Every shape's rows from the whole map. Throws if any of shapes 1 to 4
 * would still hold a loop: an installed app reading one would refuse the
 * whole map (the same row, in a file it has no schema for).
 */
export function shapesOf(all) {
  const v4 = withoutLoops(all);
  const v3 = withoutLines(v4, FERRY);
  const old = withoutLines(v4, EVERY_LINE);
  for (const [name, rows] of [
    ['shape 4', v4],
    ['shape 3', v3],
    ['shapes 1 and 2', old],
  ]) {
    const leaked = rows.variants.filter(isLoopRow);
    if (leaked.length) {
      throw new ShapeError(
        `FAIL  ${name} would hold ${leaked.length} loop direction(s) (${leaked[0].id}): an installed app would refuse the whole map. Not publishing.`,
      );
    }
  }
  return { v5: all, v4, v3, old };
}

/**
 * The index's rows: each line's overview in place of the line, under its own
 * key — the reader knows an overview when it sees one.
 */
export function indexRowsOf(rows, { overviews, boardsOf }) {
  return {
    variants: rows.variants.map(({ shape, ...v }) => {
      const { route, ...rest } = v;
      // Its signboards only when it has some: a direction without keeps the shape it had.
      const signboards = boardsOf.get(v.id);
      return {
        ...rest,
        overview: overviews.get(v.id) ?? null,
        metres: shape ? Math.round(lineLength(shape.coordinates) * 100) / 100 : null,
        ...(signboards ? { signboards } : {}),
        route,
      };
    }),
    stops: rows.stops,
    links: rows.links,
  };
}

/**
 * A file's text. The terms travel inside each file, so no copy can arrive
 * without them. Read back as the app reads it (index-schema.ts) before it
 * is written: a file the reader would refuse is never published. map.json
 * carries whole lines as `shape`, the one shape the index schema does not
 * describe; its rows are the index's own, checked there.
 */
export function stampFile(schema, publishedAt, rows) {
  const file = {
    schema,
    published_at: publishedAt,
    license: LICENSE,
    attribution: ATTRIBUTION,
    ...rows,
  };
  if (schema !== MAP_SCHEMA) {
    const read = indexSchema.safeParse(file);
    if (!read.success) {
      const [issue] = read.error.issues;
      throw new ShapeError(
        `FAIL  shape ${schema}: not an index the app reads: ${issue.path.join('.')} ${issue.message}`,
      );
    }
  }
  return JSON.stringify(file) + '\n';
}

/**
 * Every file's text, all built before any is written, so a failure in a
 * later shape leaves the earlier files as they were.
 */
export function buildFiles(all, publishedAt, indexContext) {
  const { v4, v3, old } = shapesOf(all);
  const body = { variants: old.variants, stops: old.stops, links: old.links };
  return {
    left: { v4, v3, old },
    map: stampFile(MAP_SCHEMA, publishedAt, body),
    v2: stampFile(INDEX_V2_SCHEMA, publishedAt, indexRowsOf(old, indexContext)),
    v3: stampFile(INDEX_V3_SCHEMA, publishedAt, indexRowsOf(v3, indexContext)),
    v4: stampFile(INDEX_V4_SCHEMA, publishedAt, indexRowsOf(v4, indexContext)),
    v5: stampFile(INDEX_V5_SCHEMA, publishedAt, indexRowsOf(all, indexContext)),
  };
}
