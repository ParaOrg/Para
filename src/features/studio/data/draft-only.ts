import * as z from 'zod/mini';

import {
  rawDirectionRowSchema,
  toUnnamedDirectionRow,
} from '@/features/routes/model/direction-schema';
import { hotspotRowSchema } from '@/features/routes/model/hotspot-schema';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import { nameDirections, type DirectionRow } from '@/features/routes/model/routes';

import { parsed } from './read-all';
import type { DraftRow } from './review-schema';
import { routeStateFromDraft } from './route-draft-state';

// A draft with no approved row yet, a new route or a new hotspot, as the rows
// the studio opens a subject by: built from the draft's payload, so the
// sidebar opens on it as on an approved one. A save builds on the draft
// (draft-reads.ts), so these are only how the sidebar finds it.

/** The parts of a hotspot draft's payload its row is made from (drafts.ts hotspotDraftPayload). */
const hotspotDraftStopSchema = z.object({ stop: z.looseObject({}) });

/**
 * Every direction of each route drafted with no approved route, named from the hotspots at its
 * ends, its empty slot too: a return trip fills it. Drafts whose route is approved are left out:
 * the approved rows open those.
 */
export function draftOnlyDirections(
  drafts: readonly DraftRow[],
  approvedRouteIds: ReadonlySet<string>,
  hotspots: readonly HotspotRow[],
): DirectionRow[] {
  const rows = readable(
    drafts.filter((d) => d.kind === 'route' && !approvedRouteIds.has(d.subject_id)),
    (d) => {
      const { route, routeCode, directions } = routeStateFromDraft(d);
      const raw = directions.map((v) => ({
        id: v.id,
        route_id: d.subject_id,
        direction_name: v.direction_name ?? null,
        origin_terminal: v.origin_terminal ?? null,
        destination_terminal: v.destination_terminal ?? null,
        shape: v.shape,
        reversed: v.reversed,
        confidence: v.confidence ?? 'drawn',
        updated_at: d.updated_at,
        borrowed_from: v.borrowed_from ?? null,
        borrowed_part: v.borrowed_part ?? null,
        borrowed_m: v.borrowed_m ?? null,
        signboards: v.signboards,
        route: { id: d.subject_id, route_code: routeCode, ...route },
      }));
      return parsed(rawDirectionRowSchema, raw, 'drafted direction').map(toUnnamedDirectionRow);
    },
  );
  return nameDirections(rows, [...hotspots]);
}

/** Each hotspot drafted with no approved hotspot, as its draft has it. */
export function draftOnlyHotspots(
  drafts: readonly DraftRow[],
  approvedHotspotIds: ReadonlySet<string>,
): HotspotRow[] {
  return readable(
    drafts.filter((d) => d.kind === 'hotspot' && !approvedHotspotIds.has(d.subject_id)),
    (d) => {
      const { stop } = hotspotDraftStopSchema.parse(d.payload);
      const row = { line: null, ...stop, id: d.subject_id, created_at: d.created_at };
      return parsed(hotspotRowSchema, [row], 'drafted hotspot');
    },
  );
}

/**
 * Each draft's rows, read one draft at a time: a draft whose payload cannot be read is left out
 * with a warning, so one bad draft never keeps the studio from opening the rest.
 */
function readable<T>(drafts: readonly DraftRow[], rowsOf: (d: DraftRow) => T[]): T[] {
  return drafts.flatMap((d) => {
    try {
      return rowsOf(d);
    } catch (err) {
      console.warn(`Draft ${d.id} cannot be opened from its payload:`, err);
      return [];
    }
  });
}
