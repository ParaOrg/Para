import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { APP_MOVE } from '@/features/routes/map/map-view';
import type { useCardCamera } from '@/features/routes/map/use-card-camera';
import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import { hotspotRing, type HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import type { SheetHeight } from '@/shared/ui/bottom-sheet';

import { CardActions } from './card-actions';
import { HotspotCard } from './hotspot-card';
import type { useDeleteActions } from './use-delete-actions';
import { useFetchHotspotToEdit } from '../data/use-hotspot-to-edit-query';
import type { Drawing } from '../drawing/use-drawing';
import { DraftLockNotice } from '../review/draft-lock-notice';
import { useDraftLock } from '../review/use-draft-lock';

type Saved = ReturnType<typeof useSavedRoutes<DirectionRow>>;
type Hotspots = ReturnType<typeof useSavedHotspots<HotspotRow>>;
type Camera = ReturnType<typeof useCardCamera<DirectionRow, HotspotRow>>;

interface StudioHotspotCardProps {
  /** The open hotspot: `hotspots.selected`, known to be there. */
  hotspot: HotspotRow;
  map: MapLibreMap | null;
  saved: Pick<Saved, 'directions' | 'selected' | 'highlight' | 'showCard' | 'highlightCard'>;
  hotspots: Pick<Hotspots, 'hotspots' | 'selected' | 'linkedDirectionIds' | 'show'>;
  draw: Pick<Drawing, 'loadArea'>;
  height: SheetHeight;
  canEdit: boolean;
  /**
   * On a computer an editor's tap opens the hotspot straight into its editing sidebar; the card
   * shows only when it cannot: another editor's draft, or the draft could not be read.
   */
  opensInSidebar: boolean;
  clearOfOpen: Camera['clearOfOpen'];
  onPickOnPlaceCard: Camera['pickOnPlaceCard'];
  onOpenTrip: Camera['openTrip'];
  onDeleteHotspot: ReturnType<typeof useDeleteActions>['onDeleteHotspot'];
  /** Closes every card (Edit starts a drawing). */
  onCloseAll: () => void;
  onClose: () => void;
}

/**
 * A hotspot's card, its routes as RouteCards; it stays behind the trip
 * picked from them, hidden, for the trip's ‹, and the editor's Edit and Delete
 * on it.
 */
export function StudioHotspotCard({
  hotspot,
  map,
  saved,
  hotspots,
  draw,
  height,
  canEdit,
  opensInSidebar,
  clearOfOpen,
  onPickOnPlaceCard,
  onOpenTrip,
  onDeleteHotspot,
  onCloseAll,
  onClose,
}: StudioHotspotCardProps) {
  // Another editor's draft of this hotspot: it can be looked at, not changed.
  const { lock, retry } = useDraftLock('hotspot', hotspot.id);
  // Edit opens the editor's own draft of the box when there is one: a save builds on it.
  const fetchToEdit = useFetchHotspotToEdit();
  const [hasEditFailed, setHasEditFailed] = useState(false);
  // A draft that could not be read for Edit is not opened over: the card says it could not check.
  const held = lock ?? (hasEditFailed ? { state: 'unknown' as const } : null);
  // One Edit at a time: StrictMode runs the sidebar's opening effect twice.
  const isEditing = useRef(false);
  const handleEdit = async () => {
    const s = hotspots.selected;
    if (!s || isEditing.current) return;
    isEditing.current = true;
    let opened: HotspotRow;
    try {
      opened = (await fetchToEdit(s)).hotspot;
    } catch {
      setHasEditFailed(true);
      return;
    } finally {
      isEditing.current = false;
    }
    onCloseAll();
    // A RouteCard picked on the way here, on this card or in the list, took in
    // its routes whole and left the box a few pixels across: the outline opens
    // on the box, in close enough to take its corners. Already that close, the
    // map stays where it is.
    if (map && map.getZoom() < 16) map.flyTo({ center: s.point.coordinates, zoom: 16 }, APP_MOVE);
    draw.loadArea(opened.kind, opened.id, hotspotRing(opened));
  };
  // Not behind a trip: a card hidden there is waiting for the trip's ‹, not opened.
  const isToSidebar = opensInSidebar && canEdit && !saved.selected;
  const canOpenInSidebar = isToSidebar && held === null;
  const openInSidebar = useEffectEvent(() => void handleEdit());
  // The drawing and the map's camera are outside React: started once the draft is known to be free.
  useEffect(() => {
    // handleEdit sets state only after its read resolves, never in the effect's own turn.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (canOpenInSidebar) openInSidebar();
  }, [canOpenInSidebar]);
  // While the draft is checked and read, nothing: the sidebar is on its way.
  if (isToSidebar && (held === null || held.state === 'checking')) return null;

  return (
    <HotspotCard
      routeCards={{
        selected: saved.highlight?.where === 'hotspot' ? saved.highlight.card : null,
        onSelect: onPickOnPlaceCard,
        onShown: saved.showCard,
      }}
      hidden={!!saved.selected}
      height={height}
      hotspot={hotspot}
      linkedDirectionIds={hotspots.linkedDirectionIds(hotspot.id)}
      directions={saved.directions}
      onSelectDirection={onOpenTrip}
      hotspots={hotspots.hotspots}
      // Another box: the map goes there, the box clear of the card on
      // show, as on the public map.
      onPickSibling={(id) => {
        saved.highlightCard(null);
        hotspots.show(id, clearOfOpen);
      }}
      actions={
        canEdit &&
        (held ? (
          <DraftLockNotice
            lock={held}
            onRetry={() => {
              setHasEditFailed(false);
              retry();
            }}
          />
        ) : (
          <CardActions
            editLabel={hotspot.kind === 'terminal' ? 'Edit terminal' : 'Edit hintuan'}
            onEdit={() => {
              setHasEditFailed(false);
              void handleEdit();
            }}
            onDelete={() => {
              if (hotspots.selected) void onDeleteHotspot(hotspots.selected);
            }}
          />
        ))
      }
      onClose={onClose}
    />
  );
}
