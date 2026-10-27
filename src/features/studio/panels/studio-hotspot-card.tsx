import type { MapLibreMap } from 'maplibre-gl';

import { HotspotCard } from '@/features/routes/cards/hotspot-card';
import { APP_MOVE } from '@/features/routes/map/map-view';
import type { useCardCamera } from '@/features/routes/map/use-card-camera';
import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import { hotspotRing, type HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import type { SheetHeight } from '@/shared/ui/bottom-sheet';

import { CardActions } from './card-actions';
import type { useDeleteActions } from './use-delete-actions';
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
  clearOfOpen,
  onPickOnPlaceCard,
  onOpenTrip,
  onDeleteHotspot,
  onCloseAll,
  onClose,
}: StudioHotspotCardProps) {
  // Another editor's draft of this hotspot: it can be looked at, not changed.
  const { lock, retry } = useDraftLock('hotspot', hotspot.id);
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
        (lock ? (
          <DraftLockNotice lock={lock} onRetry={retry} />
        ) : (
          <CardActions
            editLabel={hotspot.kind === 'terminal' ? 'Edit terminal' : 'Edit hintuan'}
            onEdit={() => {
              const s = hotspots.selected;
              if (!s) return;
              onCloseAll();
              // A RouteCard picked on the way here, on this card or in
              // the list, took in its routes whole and left the box a
              // few pixels across: the outline opens on the box, in
              // close enough to take its corners. Already that close,
              // the map stays where it is.
              if (map && map.getZoom() < 16)
                map.flyTo({ center: s.point.coordinates, zoom: 16 }, APP_MOVE);
              draw.loadArea(s.kind, s.id, hotspotRing(s));
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
