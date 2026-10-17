import * as z from 'zod/mini';

import {
  rawDirectionRowSchema,
  toUnnamedDirectionRow,
  type UnnamedDirectionRow,
} from '@/features/routes/model/direction-schema';
import { lineStringSchema } from '@/features/routes/model/geojson-schema';
import {
  nameDirections,
  type DirectionDrawing,
  type DirectionRow,
  type LineStringGeoJSON,
} from '@/features/routes/model/routes';

import { listHotspots } from './hotspots-read';
import { parsed, readAll } from './read-all';
import { getSupabase } from './supabase';

/**
 * Readers of the live tables, for the editor. They live in studio/, apart
 * from the types in routes/model/routes.ts and routes/model/hotspots.ts, on
 * purpose: the public map imports those types but reads the published map
 * instead (published-map/api/fetch-index.ts), and ESLint forbids the public
 * shell importing studio/. So Supabase's address can never land in a chunk
 * both pages share; check-build.mjs proves it stays out of the public
 * page's build too.
 *
 * This is the boundary where the database's names become the glossary's
 * (CONTEXT.md): every row is parsed with the raw schema of its table and
 * translated by the model's own `to…` function, so no `route_variant_id` or
 * `stop_id` reaches a panel. A row the schema cannot read is said, naming the
 * field.
 *
 * Each returns nothing when the build has no Supabase (withDrawing, which must
 * return a drawing, throws), so the studio shows its config banner rather than
 * a load error on top of it.
 *
 * Each reads its table in pages (read-all.ts): Supabase answers at most 1,000
 * rows a request and does not say when it cut, and the links table passes
 * 1,000 at about forty routes. The publish script pages the same way.
 *
 * The hotspot readers (hotspots and their links) are hotspots-read.ts's; the
 * pager and `parsed`, the row parser every reader shares, are read-all.ts's.
 */

/**
 * A direction as the editor lists it, with its parent route embedded: every
 * column but the drawing. `control_points` and `segments` are half of every
 * row, so they are read only when a direction is opened (withDrawing): a list
 * of every column measured 25 MB a load at 1,000 directions.
 *
 * Named columns, not `*`: a column added later is left out of the list until
 * it is named here, which is the point — the list stays as light as it is.
 */
// One literal, not pieces joined: the client reads the row's type off it.
//
// `overview`, not `shape` (0009): the line thinned at 5 m, about a quarter of
// it. The list draws it and a tap finds it; a direction's full line is read
// when it is lit or opened (lineOf, withDrawing), and before a hotspot's links
// are worked out (linesOf). The full `shape` in the list measured 15–27 MB at a
// thousand directions.
//
// `signboards` (0010): a few file names, for the trip card's Signboard and the
// editor's own (SignboardEditor).
export const DIRECTION_SELECT =
  'id, route_id, direction_name, origin_terminal, destination_terminal, overview, reversed, confidence, updated_at, borrowed_from, borrowed_part, borrowed_m, signboards, route:route(*)';
/** The rest of a direction: its drawing, and its full line. */
const DRAWING_SELECT = 'control_points, segments, shape';

/** A row as the list reads it (DIRECTION_SELECT): its overview where its line will go, or its line on a database before 0009. */
const listedRowSchema = z.extend(z.omit(rawDirectionRowSchema, { shape: true }), {
  overview: z.optional(z.nullable(lineStringSchema)),
  shape: z.optional(z.nullable(lineStringSchema)),
});
type ListedRow = z.infer<typeof listedRowSchema>;

/** A direction's id and full line, as lines are read on their own. */
const lineRowSchema = z.object({ id: z.string(), shape: z.nullable(lineStringSchema) });

/**
 * A listed row as the editor holds it, before nameDirections: the glossary's
 * names, and `shape` holding what the list carried for it (`line` when the
 * caller knows better: the save hands back the line it just wrote).
 */
export function unnamedFromListed(
  raw: unknown,
  line?: LineStringGeoJSON | null,
): UnnamedDirectionRow {
  const [row] = parsed(listedRowSchema, [raw], 'direction');
  const { overview, shape, ...rest } = row;
  return toUnnamedDirectionRow({ ...rest, shape: line ?? overview ?? shape ?? null });
}

/**
 * Every saved direction of every route, with the generated names filled in
 * from the hotspots at each route's ends. Public: RLS allows anyone to read.
 */
export async function listDirections(): Promise<DirectionRow[]> {
  const client = getSupabase();
  if (!client) return [];
  // Read as unknown and parsed, as every row here is: the client's guess at
  // the embedded route (a list) is not what the foreign key makes it (one row).
  const list = () =>
    readAll<unknown>((from, to) =>
      client
        .from('route_variant')
        .select(DIRECTION_SELECT, { count: 'exact' })
        .order('updated_at', { ascending: false })
        .order('id')
        .range(from, to),
    );
  const [listedRaw, hotspots] = await Promise.all([list(), listHotspots()]);
  const listed: ListedRow[] = parsed(listedRowSchema, listedRaw, 'direction');
  // A drawn row saved before 0009 and not backfilled has no overview yet: its
  // full line stands in, read for those rows alone.
  const missing = listed.some((r) => r.overview === null)
    ? await unsummarised()
    : new Map<string, LineStringGeoJSON>();
  const rows = listed.map(({ overview, shape, ...r }) =>
    toUnnamedDirectionRow({ ...r, shape: overview ?? shape ?? missing.get(r.id) ?? null }),
  );
  return nameDirections(rows, hotspots);
}

/** The full lines of the drawn rows that have no overview yet, by id. */
async function unsummarised(): Promise<Map<string, LineStringGeoJSON>> {
  const client = getSupabase();
  if (!client) return new Map();
  const rawRows = await readAll<unknown>((from, to) =>
    client
      .from('route_variant')
      .select('id, shape', { count: 'exact' })
      .is('overview', null)
      .not('shape', 'is', null)
      .order('id')
      .range(from, to),
  );
  const rows = parsed(lineRowSchema, rawRows, 'direction line');
  return new Map(rows.flatMap((r) => (r.shape ? [[r.id, r.shape] as const] : [])));
}

/** One direction's full line: what the list's overview stands for. */
export async function lineOf(id: string): Promise<LineStringGeoJSON | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client.from('route_variant').select('shape').eq('id', id).single();
  if (error) throw new Error(error.message);
  return z.parse(z.nullable(lineStringSchema), data.shape);
}

/** How many ids one read of full lines names: its request line stays short. */
const LINES_PER_READ = 50;

/**
 * These directions with their full lines: the few a hotspot's outline
 * reaches, before its links are worked out on them, read LINES_PER_READ at
 * a time. A hotspot's link `sequence` is an index into the full line, so an
 * overview must never be what it is counted on.
 */
export async function linesOf<T extends DirectionRow>(directions: readonly T[]): Promise<T[]> {
  const client = getSupabase();
  if (!client || directions.length === 0) return [...directions];
  const ids = directions.map((v) => v.id);
  const reads = [];
  for (let i = 0; i < ids.length; i += LINES_PER_READ) {
    reads.push(
      client
        .from('route_variant')
        .select('id, shape')
        .in('id', ids.slice(i, i + LINES_PER_READ)),
    );
  }
  const byId = new Map<string, LineStringGeoJSON | null>();
  for (const { data, error } of await Promise.all(reads)) {
    if (error) throw new Error(error.message);
    for (const r of parsed(lineRowSchema, data, 'direction line')) byId.set(r.id, r.shape);
  }
  return directions.map((v) => ({
    ...v,
    shape: byId.has(v.id) ? (byId.get(v.id) ?? null) : v.shape,
  }));
}

/**
 * The direction with its drawing, read when it is opened to edit, extend or
 * follow: one small request for the one row, in place of every row's drawing
 * on every load.
 */
export async function withDrawing(v: DirectionRow): Promise<DirectionDrawing> {
  const client = getSupabase();
  if (!client) throw new Error('Supabase is not configured');
  const { data, error } = await client
    .from('route_variant')
    .select(DRAWING_SELECT)
    .eq('id', v.id)
    .single();
  if (error) throw new Error(error.message);
  // Read as unknown: the drawing columns are stored as given and no schema
  // for a segment exists yet, so the generated Json type proves nothing here.
  const controlPoints: unknown = data.control_points;
  const segments: unknown = data.segments;
  return {
    ...v,
    shape: z.parse(z.nullable(lineStringSchema), data.shape),
    controlPoints: Array.isArray(controlPoints)
      ? (controlPoints as DirectionDrawing['controlPoints'])
      : [],
    segments: Array.isArray(segments) ? (segments as DirectionDrawing['segments']) : [],
  };
}
