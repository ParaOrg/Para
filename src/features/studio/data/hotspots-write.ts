import { ringCentroid, ringToPolygon, type Ring } from '@/features/routes/geo/ring';
import {
  hotspotRowSchema,
  toLinkRow,
  type RawHotspotLink,
} from '@/features/routes/model/hotspot-schema';
import {
  normaliseName,
  type PointGeoJSON,
  type HotspotKind,
  type HotspotRow,
} from '@/features/routes/model/hotspots';
import { directionLine, isLoop, type DirectionRow } from '@/features/routes/model/routes';
import { hintuansAlong } from '@/features/routes/model/timeline';
import { roundLngLat } from '@/shared/utils/geo';

import { linksThrough, terminalLinks } from './hotspots-geometry';
import { parsed, readAll } from './read-all';
import { requireSupabase } from './supabase';

const blankToNull = (s: string) => (s.trim() === '' ? null : s.trim());

export interface SaveHotspotInput {
  hotspotId: string | null;
  kind: HotspotKind;
  /** What is written on the ground. Required. */
  name: string;
  /** What people say. Blank means "the same as the name". */
  informal: string;
  /** Other names for the same place, already split and cleaned (parseAliases). */
  aliases: string[];
  note: string;
  ring: Ring;
  /** Terminal only: the directions the owner ticked. Ignored for a hintuan. */
  directionIds?: string[];
  /** Every saved direction — needed to compute hintuan links and sequences. */
  directions: DirectionRow[];
}

/**
 * The stop row a save writes, from the panel's input, and its ring as stored:
 * names normalised, corners rounded, the point at the outline's middle. Pure,
 * shared by the live save and the draft (draft-save.ts).
 */
export function hotspotColumns(input: SaveHotspotInput) {
  if (input.ring.length < 3) throw new Error('A hotspot needs at least three corners');

  // Names are normalised here, not in the database: a stray double space
  // would otherwise make "SM  Fairview" a second group, and the terminal
  // uniqueness index (0014) compares what is stored.
  const name = normaliseName(input.name);
  const informal = normaliseName(input.informal);
  if (!name) throw new Error('A hotspot needs a name');
  // Six decimals, about 0.1 m, as a direction's points are saved: a traced
  // corner carries 15 or more, and the publish script rounds them anyway.
  const ring = input.ring.map(roundLngLat);
  const point: PointGeoJSON = { type: 'Point', coordinates: roundLngLat(ringCentroid(ring)) };
  const row = {
    name,
    informal: informal && informal.toLowerCase() !== name.toLowerCase() ? informal : null,
    aliases: input.aliases,
    kind: input.kind,
    note: blankToNull(input.note),
    area: ringToPolygon(ring),
    point,
  };
  return { row, ring };
}

/**
 * A hotspot's route links, as saveHotspot works them out: computed for a
 * hintuan, chosen for a terminal, except that an ikot's are computed for both
 * (terminalLinks). Either way the sequence is where the direction first meets
 * the outline (0 when a ticked terminal route never actually enters it — still
 * a valid, ordered link).
 */
export function hotspotLinks(
  input: SaveHotspotInput,
  ring: Ring,
  line: string | null,
): { directionId: string; sequence: number }[] {
  return input.kind === 'hintuan'
    ? linksThrough(ring, input.directions, line)
    : terminalLinks(ring, input.directionIds ?? [], input.directions);
}

/**
 * Create or update a hotspot and replace its route links. Writes require a
 * signed-in editor; any editor may change any row (0015); RLS enforces it on
 * both tables.
 *
 * Two steps, not one transaction, as a direction's save is (save-route.ts):
 * `onWritten` hears of the row the moment it is in, so a retry after the
 * links failed updates that row instead of inserting a second box on the
 * same ground.
 */
export async function saveHotspot(
  input: SaveHotspotInput,
  onWritten?: (hotspotId: string) => void,
): Promise<HotspotRow> {
  const client = requireSupabase();
  const { row, ring } = hotspotColumns(input);

  const query = input.hotspotId
    ? client.from('stop').update(row).eq('id', input.hotspotId)
    : client.from('stop').insert(row);
  const { data, error } = await query.select('*').single();
  if (error) {
    // 0014 keys the index on the place: the informal name, else the ground
    // name. The old index name is matched too, for a database that has not
    // applied 0014.
    if (
      error.code === '23505' &&
      (error.message.includes('stop_terminal_place_unique') ||
        error.message.includes('stop_terminal_informal_unique'))
    ) {
      throw new Error(
        `There is already a terminal at "${row.informal || row.name}". A place has one terminal; draw the others as hintuans under the same name.`,
      );
    }
    throw new Error(error.message);
  }
  // The row comes back in the table's names; the app's hotspot is read off it
  // (hotspot-schema.ts: this file is the boundary, CONTEXT.md).
  const read = hotspotRowSchema.safeParse(data);
  if (!read.success) {
    const [issue] = read.error.issues;
    throw new Error(
      `The hotspot was saved but could not be read back: ${issue?.path.join('.')} ${issue?.message}`,
    );
  }
  const hotspot = read.data;
  onWritten?.(hotspot.id);

  const links: RawHotspotLink[] = hotspotLinks(input, ring, hotspot.line ?? null)
    .map((l) => ({ directionId: l.directionId, hotspotId: hotspot.id, sequence: l.sequence }))
    .map(toLinkRow);

  try {
    await replaceLinks(hotspot.id, links);
  } catch (err) {
    throw new Error(
      `The hotspot is saved, but its route links are not: ${err instanceof Error ? err.message : String(err)}. ` +
        'Press Save again to retry.',
      { cause: err },
    );
  }
  return hotspot;
}

/** Replace every link for one hotspot with the given set, as route_stop rows. */
async function replaceLinks(hotspotId: string, links: RawHotspotLink[]) {
  const client = requireSupabase();
  const del = await client.from('route_stop').delete().eq('stop_id', hotspotId);
  if (del.error) throw new Error(del.error.message);
  if (links.length === 0) return;
  const ins = await client.from('route_stop').insert(links);
  if (ins.error) throw new Error(ins.error.message);
}

/**
 * Delete one hotspot. Its links go with it (route_stop cascades). A delete
 * RLS will not let through is not an error to PostgREST, only no rows: the
 * rows are read back, and none is said.
 */
export async function deleteHotspot(hotspot: HotspotRow): Promise<void> {
  const { data, error } = await requireSupabase()
    .from('stop')
    .delete()
    .eq('id', hotspot.id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error(NOTHING_CHANGED);
}

/** What a write that matched no row says: the session ended, or the row is gone. */
export const NOTHING_CHANGED =
  'Nothing was changed: the session may have ended, or someone else already changed it. Sign in again and retry.';

/**
 * Keep every hintuan's list honest after a direction is saved: link it to each
 * hintuan it now passes under, unlink it from each it no longer does. Terminal
 * links are the owner's and are never touched here, except on an ikot, whose
 * terminals are places on it like any hintuan and are managed the same way.
 */
export async function syncHintuanLinks(direction: DirectionRow): Promise<void> {
  const client = requireSupabase();
  const loop = isLoop(direction);
  // Paged, as every table read is (read-all.ts): past 1,000 hintuans one
  // request would silently see a subset.
  const [hintuanRows, linked] = await Promise.all([
    readAll<unknown>((from, to) => {
      const stops = client.from('stop').select('*', { count: 'exact' });
      return (loop ? stops.in('kind', ['hintuan', 'terminal']) : stops.eq('kind', 'hintuan'))
        .not('area', 'is', null)
        .order('id')
        .range(from, to);
    }),
    // This direction's links as they stand: one small request.
    readAll<{ stop_id: string }>((from, to) =>
      client
        .from('route_stop')
        .select('stop_id', { count: 'exact' })
        .eq('route_variant_id', direction.id)
        .order('stop_id')
        .range(from, to),
    ),
  ]);
  const hintuans = parsed(hotspotRowSchema, hintuanRows, 'hotspot');
  if (hintuans.length === 0) return;

  // The same rule the save panel showed before Save was pressed. A link to a
  // hintuan this route does not stop at (servedBy) is one it no longer earns.
  const along = hintuansAlong(directionLine(direction), hintuans, direction.route);
  const keep: RawHotspotLink[] = along.map(({ hotspot, index }) =>
    toLinkRow({ directionId: direction.id, hotspotId: hotspot.id, sequence: index }),
  );
  const kept = new Set(keep.map((k) => k.stop_id));
  // Only the hintuan links this direction has and no longer earns — usually
  // none. Listing every hintuan the line does not pass would make a request
  // line that grows with the map past what the gateway accepts.
  const isManaged = new Set(hintuans.map((h) => h.id));
  const drop = linked.map((l) => l.stop_id).filter((id) => isManaged.has(id) && !kept.has(id));

  if (drop.length > 0) {
    const del = await client
      .from('route_stop')
      .delete()
      .eq('route_variant_id', direction.id)
      .in('stop_id', drop);
    if (del.error) throw new Error(del.error.message);
  }
  if (keep.length > 0) {
    const up = await client
      .from('route_stop')
      .upsert(keep, { onConflict: 'route_variant_id,stop_id' });
    if (up.error) throw new Error(up.error.message);
  }
}
