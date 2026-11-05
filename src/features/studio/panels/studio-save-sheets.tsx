import { useQueryClient } from '@tanstack/react-query';
import type { ComponentProps } from 'react';

import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';

import { HotspotPanel } from './hotspot-panel';
import { SaveBesideFrame, SaveSheetFrame } from './save-frames';
import { SavePanel } from './save-panel';
import type { SaveTarget } from './use-save-target';
import { STUDIO_DRAFTS } from '../data/flags';
import { reviewKeys } from '../data/review-keys';
import { useHotspotToEditQuery } from '../data/use-hotspot-to-edit-query';
import { useRouteToEditQuery } from '../data/use-route-to-edit-query';
import { whyCannotSave } from '../drawing/toolbar-text';
import type { Drawing } from '../drawing/use-drawing';

type Saved = ReturnType<typeof useSavedRoutes<DirectionRow>>;
type Hotspots = ReturnType<typeof useSavedHotspots<HotspotRow>>;

interface StudioSaveSheetsProps {
  /** Whether Done has opened the save form. */
  isSaving: boolean;
  /**
   * A route's form stands beside the map the whole time its line is drawn,
   * rather than covering the map at Done (a computer's screen, signed in).
   */
  isBeside?: boolean;
  draw: Drawing;
  saved: Pick<Saved, 'directions'>;
  hotspots: Pick<Hotspots, 'hotspots' | 'linkedDirectionIds' | 'reload'>;
  target: Pick<SaveTarget, 'editing' | 'parentRoute' | 'slotReversed'>;
  onSaved: ComponentProps<typeof SavePanel>['onSaved'];
  onSavedHotspot: ComponentProps<typeof HotspotPanel>['onSaved'];
  /** A save stored as a draft (STUDIO_DRAFTS). */
  onDrafted?: (subjectId: string) => void;
  /** A route's draft published (STUDIO_DRAFTS). */
  onPublished?: (subjectId: string) => void;
  onCancel: () => void;
}

/**
 * The save form while saving: a hotspot's panel for an area trace, a route's
 * for a line, over the map; or a route's beside it the whole time it is drawn.
 */
export function StudioSaveSheets({
  isSaving,
  isBeside = false,
  draw,
  saved,
  hotspots,
  target,
  onSaved,
  onSavedHotspot,
  onDrafted,
  onPublished,
  onCancel,
}: StudioSaveSheetsProps) {
  // The hotspot being edited, when the area trace came from a saved one.
  const approvedHotspot = draw.area?.hotspotId
    ? (hotspots.hotspots.find((s) => s.id === draw.area?.hotspotId) ?? null)
    : null;
  // As the editor's own draft has it, when there is one: what the save builds on. The card's
  // Edit read it fresh into the cache just before, so it is here from the first render.
  const toEdit = useHotspotToEditQuery(approvedHotspot);
  const editingHotspot = toEdit.data?.hotspot ?? approvedHotspot;

  // The route's facts as the editor's own draft has them, when there is one: a save builds on
  // the draft, so the form must start from it (route-to-edit.ts).
  const approvedRoute = target.editing?.route ?? target.parentRoute;
  const routeToEdit = useRouteToEditQuery(approvedRoute);
  const draftedRoute = routeToEdit.data ?? approvedRoute;
  // Until the draft is read, Save would build on facts the form does not show: it waits.
  const draftNotRead =
    STUDIO_DRAFTS && approvedRoute && routeToEdit.isPending
      ? 'Reading your draft of this route…'
      : routeToEdit.isError
        ? 'Couldn’t read your draft of this route. Close this and open it again.'
        : null;
  // A draft saved here makes every cached draft stale: the next Edit or card reads afresh.
  const client = useQueryClient();
  const handleDrafted = (subjectId: string) => {
    client.removeQueries({ queryKey: reviewKeys.draftsOf() });
    onDrafted?.(subjectId);
  };
  // A publish makes every cached draft stale too: the draft it published is gone.
  const handlePublished = (subjectId: string) => {
    client.removeQueries({ queryKey: reviewKeys.draftsOf() });
    onPublished?.(subjectId);
  };
  const routeForm = {
    draw,
    existing: target.editing && draftedRoute ? { ...target.editing, route: draftedRoute } : null,
    route: target.parentRoute ? draftedRoute : null,
    slotReversed: target.slotReversed,
    hotspots: hotspots.hotspots,
    directions: saved.directions,
    onSaved,
    onDrafted: handleDrafted,
    onPublished: handlePublished,
    onPlaceSaved: () => void hotspots.reload(),
  };

  return (
    <>
      {isSaving && draw.drawing && draw.area && (
        <HotspotPanel
          // The form takes its fields once: started again if the read lands after it opened.
          key={toEdit.isSuccess ? 'read' : 'reading'}
          draw={draw}
          existing={editingHotspot}
          existingLinks={
            toEdit.data?.linkedDirectionIds ??
            (editingHotspot ? hotspots.linkedDirectionIds(editingHotspot.id) : [])
          }
          directions={saved.directions}
          hotspots={hotspots.hotspots}
          onSaved={onSavedHotspot}
          onDrafted={handleDrafted}
          onCancel={onCancel}
          // A row written before its links failed becomes the outline's own
          // (adoptHotspot): ✕, Done and Save again, or a reload, update it.
          onWritten={draw.adoptHotspot}
        />
      )}

      {isBeside && draw.drawing && !draw.area && (
        <SaveBesideFrame>
          <SavePanel
            // A new line is a new form: what was typed for the last one doesn't carry over. The
            // form takes the route's facts once, so it starts again when the draft is read (Edit
            // route reads it fresh into the cache, and a draft save drops the cached ones).
            key={`${draw.target.routeId}:${draw.target.directionId}:${routeToEdit.isSuccess ? 'read' : 'reading'}`}
            {...routeForm}
            saveBlocked={draftNotRead ?? whyCannotSave(draw)}
          />
        </SaveBesideFrame>
      )}

      {!isBeside && isSaving && draw.drawing && !draw.area && (
        <SaveSheetFrame>
          <SavePanel
            key={routeToEdit.isSuccess ? 'read' : 'reading'}
            {...routeForm}
            saveBlocked={draftNotRead}
            onCancel={onCancel}
          />
        </SaveSheetFrame>
      )}
    </>
  );
}
