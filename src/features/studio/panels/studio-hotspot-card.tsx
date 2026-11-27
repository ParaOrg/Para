import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

import { APP_MOVE } from '@/features/routes/map/map-view';
import type { useCardCamera } from '@/features/routes/map/use-card-camera';
import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import { hotspotRing, type HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import type { SheetHeight } from '@/shared/ui/bottom-sheet';

import { CardActions } from './card-actions';
import { HotspotCard } from './hotspot-card';
import { LockedDraft } from './locked-draft';
import type { useDeleteActions } from './use-delete-actions';
import { useDraftLock } from './use-draft-lock';
import { useFetchHotspotToEdit } from '../data/use-hotspot-to-edit-query';
import type { Drawing } from '../drawing/use-drawing';

type Saved = ReturnType<typeof useSavedRoutes<DirectionRow>>;
type Hotspots = ReturnType<typeof useSavedHotspots<HotspotRow>>;
type Camera = ReturnType<typeof useCardCamera<DirectionRow, HotspotRow>>;

interface StudioHotspotCardProps {
  /** The open hotspot: `hotspots.selected`, known to be there. */
  hotspot: HotspotRow;
  map: MapLibreMap | null;
  saved: Pick<Saved, 'directions' | 'selected' | 'highlight' | 'showCard' | 'highlightCard'>;
  hotspots: Pick<Hotspots, 'hotspots' | 'selected' | 'linkedDirectionIds' | 'show' | 'reload'>;
  draw: Pick<Drawing, 'loadArea'>;
  height: SheetHeight;
  canEdit: boolean;
  clearOfOpen: Camera['clearOfOpen'];
  onPickOnPlaceCard: Camera['pickOnPlaceCard'];
  onOpenTrip: Camera['openTripFromPlace'];
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
  // One Edit at a time: a second press while the draft is read is dropped.
  const isEditing = useRef(false);
  // A card closed, or another hotspot tapped, while the draft was read: that Edit is dropped.
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  const handleEdit = async () => {
    const s = hotspots.selected;
    if (!s || isEditing.current) return;
    isEditing.current = true;
    let opened: HotspotRow;
    try {
      opened = (await fetchToEdit(s)).hotspot;
    } catch {
      if (isMounted.current) setHasEditFailed(true);
      return;
    } finally {
      isEditing.current = false;
    }
    if (!isMounted.current) return;
    onCloseAll();
    // A RouteCard picked on the way here, on this card or in the list, took in
    // its routes whole and left the box a few pixels across: the outline opens
    // on the box, in close enough to take its corners. Already that close, the
    // map stays where it is.
    if (map && map.getZoom() < 16) map.flyTo({ center: s.point.coordinates, zoom: 16 }, APP_MOVE);
    draw.loadArea(opened.kind, opened.id, hotspotRing(opened));
  };
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
          <LockedDraft
            kind="hotspot"
            subjectId={hotspot.id}
            lock={held}
            onRetry={() => {
              setHasEditFailed(false);
              retry();
            }}
            onApproved={() => void hotspots.reload()}
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
