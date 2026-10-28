import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';

import { directionRows } from './direction-rows';
import { hotspotDraftBase, routeDraftState, stateForNewLine } from './draft-reads';
import { claimDraft, updateDraft, type DraftKind, type ReviewResult } from './drafts';
import { hotspotPayloadOf } from './hotspot-draft-state';
import type { SaveHotspotInput } from './hotspots-write';
import {
  hintuanLinksFor,
  withDirectionEmptied,
  withDirectionSaved,
  withSignboards,
} from './route-draft-edits';
import { routePayloadOf, servedRouteOf, type DraftBase } from './route-draft-state';
import type { SaveInput } from './routes-write';

// The studio's saves as drafts (0022): each builds the subject's whole state —
// a route with every direction and each direction's complete link set, or a
// hotspot with all its links — and stores it in `draft`. Nothing here writes
// route, route_variant, stop or route_stop: only approve_draft does, in one
// transaction, after checking nobody changed the approved rows since
// `base_revision` was read. The state is read in draft-reads.ts and built by
// the pure functions in route-draft-state.ts, route-draft-edits.ts and
// hotspot-draft-state.ts.

/**
 * The draft stored: a first one claimed with its base, a kept one replaced if
 * nobody changed it since it was read. A claim that finds another editor's
 * draft made meanwhile answers `revision_mismatch`, as a changed draft does:
 * the payload was built without it and is not stored.
 */
async function storeDraft(
  kind: DraftKind,
  base: DraftBase,
  payload: Record<string, unknown>,
): Promise<ReviewResult> {
  if (base.draft) return updateDraft(base.draft.id, base.draft.revision, payload);
  const claimed = await claimDraft(kind, base.subjectId, base.isNew, base.baseRevision, payload);
  if (claimed.code === 'ok' && claimed.created === false) {
    // A new subject's id is this form's own: a draft already under it is this
    // form's earlier save whose answer was lost, so it is brought up to date.
    if (base.isNew && claimed.draft)
      return updateDraft(claimed.draft.id, claimed.draft.revision, payload);
    return { code: 'revision_mismatch', draft: claimed.draft };
  }
  return claimed;
}

export interface RouteDraftSaved {
  result: ReviewResult;
  routeId: string;
  directionId: string;
}

/** A direction's save, as a draft of its whole route. */
export async function saveRouteDraft(
  input: SaveInput,
  hotspots: readonly HotspotRow[],
  /** A new route's id, kept by the form across retries. */
  newRouteId: string = crypto.randomUUID(),
): Promise<RouteDraftSaved> {
  const state = input.routeId
    ? await routeDraftState(input.routeId)
    : await stateForNewLine(input, newRouteId);
  const loop = state.directions.length === 0 ? input.isLoop : state.route.is_loop;
  const { shape } = directionRows({ ...input, isLoop: loop }, state.subjectId);
  const links = hintuanLinksFor(shape.coordinates, hotspots, servedRouteOf(state, input));
  const next = withDirectionSaved(state, input, links);
  const result = await storeDraft('route', next.state, routePayloadOf(next.state));
  return { result, routeId: state.subjectId, directionId: next.directionId };
}

/** A direction's delete, as a draft of its route with that direction emptied. */
export async function deleteDirectionDraft(direction: DirectionRow): Promise<ReviewResult> {
  const state = withDirectionEmptied(await routeDraftState(direction.routeId), direction.id);
  return storeDraft('route', state, routePayloadOf(state));
}

/**
 * A direction's signboard list, as a draft of its route. The files themselves
 * are uploaded as before (signboards.ts): a file only the draft lists is in
 * the bucket but unlisted, which the publish never copies.
 */
export async function signboardsDraft(
  direction: Pick<DirectionRow, 'id' | 'routeId'>,
  names: readonly string[],
): Promise<ReviewResult> {
  const state = withSignboards(await routeDraftState(direction.routeId), direction.id, names);
  return storeDraft('route', state, routePayloadOf(state));
}

/**
 * A hotspot's save, as a draft of the hotspot with all its links. A new
 * hotspot gets its id here; its station line, which the panel does not edit,
 * is carried from the draft kept for it or the approved row.
 */
export async function saveHotspotDraft(
  input: SaveHotspotInput,
  /** A new hotspot's id, kept by the form across retries. */
  newHotspotId: string = crypto.randomUUID(),
): Promise<{ result: ReviewResult; hotspotId: string }> {
  if (!input.hotspotId) {
    const hotspotId = newHotspotId;
    const result = await storeDraft(
      'hotspot',
      { subjectId: hotspotId, isNew: true, baseRevision: null, draft: null },
      hotspotPayloadOf(input, null),
    );
    return { result, hotspotId };
  }
  const hotspotId = input.hotspotId;
  const { base, line } = await hotspotDraftBase(hotspotId);
  const result = await storeDraft('hotspot', base, hotspotPayloadOf(input, line));
  return { result, hotspotId };
}

/** What a stored draft says: the map is unchanged until it is approved. */
export const DRAFTED = 'Saved as a draft. The map changes once it is approved.';

/** A draft save's or take-down's refusal in the editor's words; null when it went through. */
export function draftRefusal(r: ReviewResult): string | null {
  switch (r.code) {
    case 'ok':
    case 'taken_down':
      return null;
    case 'revision_mismatch':
    case 'already_pending':
      return 'Someone else changed this draft since you opened it. Close this and open it again to see their version.';
    case 'conflict':
      return 'This changed on the map since you opened it. Close this and open it again.';
    case 'subject_gone':
      return 'This was deleted since you opened it.';
    case 'blocked':
      return 'A route still ends here, so it cannot come off the map.';
    case 'busy':
      return 'Another save was in progress. Try again.';
    case 'bad_payload':
    case 'payload_incomplete':
      return 'The draft was refused as incomplete. Nothing was saved.';
    default:
      return `Nothing was saved (${r.code}).`;
  }
}
