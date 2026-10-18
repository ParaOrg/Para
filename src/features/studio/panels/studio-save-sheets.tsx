import type { ComponentProps } from 'react';

import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';

import { HotspotPanel } from './hotspot-panel';
import { SavePanel } from './save-panel';
import type { SaveTarget } from './use-save-target';
import type { Drawing } from '../drawing/use-drawing';

type Saved = ReturnType<typeof useSavedRoutes<DirectionRow>>;
type Hotspots = ReturnType<typeof useSavedHotspots<HotspotRow>>;

interface StudioSaveSheetsProps {
  /** Whether Done has opened the save form. */
  isSaving: boolean;
  draw: Drawing;
  saved: Pick<Saved, 'directions'>;
  hotspots: Pick<Hotspots, 'hotspots' | 'linkedDirectionIds' | 'reload'>;
  target: Pick<SaveTarget, 'editing' | 'parentRoute' | 'slotReversed'>;
  onSaved: ComponentProps<typeof SavePanel>['onSaved'];
  onSavedHotspot: ComponentProps<typeof HotspotPanel>['onSaved'];
  onCancel: () => void;
}

/**
 * The save form while saving: a hotspot's panel for an area trace, a route's
 * for a line.
 */
export function StudioSaveSheets({
  isSaving,
  draw,
  saved,
  hotspots,
  target,
  onSaved,
  onSavedHotspot,
  onCancel,
}: StudioSaveSheetsProps) {
  // The hotspot being edited, when the area trace came from a saved one.
  const editingHotspot = draw.area?.hotspotId
    ? (hotspots.hotspots.find((s) => s.id === draw.area?.hotspotId) ?? null)
    : null;

  return (
    <>
      {isSaving && draw.drawing && draw.area && (
        <HotspotPanel
          draw={draw}
          existing={editingHotspot}
          existingLinks={editingHotspot ? hotspots.linkedDirectionIds(editingHotspot.id) : []}
          directions={saved.directions}
          hotspots={hotspots.hotspots}
          onSaved={onSavedHotspot}
          onCancel={onCancel}
          // A row written before its links failed becomes the outline's own
          // (adoptHotspot): ✕, Done and Save again, or a reload, update it.
          onWritten={draw.adoptHotspot}
        />
      )}

      {isSaving && draw.drawing && !draw.area && (
        <SavePanel
          draw={draw}
          existing={target.editing}
          route={target.parentRoute}
          slotReversed={target.slotReversed}
          hotspots={hotspots.hotspots}
          directions={saved.directions}
          onSaved={onSaved}
          onPlaceSaved={() => void hotspots.reload()}
          onCancel={onCancel}
        />
      )}
    </>
  );
}
