import type { DirectionDrawing, DirectionRow } from '@/features/routes/model/routes';

import { assertNotAnothersDraft } from './draft-guard';
import { draftOf } from './drafts';
import { STUDIO_DRAFTS } from './flags';
import { drawingOf, withDrawing } from './live';
import type { DraftRow } from './review-schema';
import { routeStateFromDraft } from './route-draft-state';

/** Said when the editor's own draft has emptied the direction they asked to edit. */
export const EMPTIED_IN_DRAFT =
  'Your draft of this route deletes this direction. Review it in Drafts, or discard the draft there to edit the approved line.';

/**
 * The drawing Edit route opens: the editor's own draft of the route when they
 * have one, else the approved row. Saving builds on the draft (draft-reads.ts
 * routeDraftState), so opening the approved line instead would save it over
 * the draft's redraw. Another editor's draft is refused, as a save on it is.
 * Extend and Follow read the approved row (withDrawing): a borrowed line names
 * an approved direction.
 */
export async function drawingToEdit(
  v: DirectionRow,
  /** How the route's draft is read: through the query cache, so the save form starts from it. */
  readDraft: (routeId: string) => Promise<DraftRow | null> = (routeId) => draftOf('route', routeId),
): Promise<DirectionDrawing> {
  if (!STUDIO_DRAFTS) return withDrawing(v);
  const kept = await readDraft(v.routeId);
  await assertNotAnothersDraft(kept);
  const drafted = kept && routeStateFromDraft(kept).directions.find((d) => d.id === v.id);
  if (!drafted) return withDrawing(v);
  const drawing = drawingOf(v, drafted);
  if (drawing.controlPoints.length === 0) throw new Error(EMPTIED_IN_DRAFT);
  return drawing;
}
