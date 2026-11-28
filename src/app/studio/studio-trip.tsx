import type { MapLibreMap } from 'maplibre-gl';

import type { OpenTrip } from '@/features/routes/map/route-card-slots';
import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import {
  StudioRouteLineDetail,
  StudioTripCard,
  type useDeleteActions,
  type useDrawing,
  type useFollow,
  type AddWay,
} from '@/features/studio';

import { LeftPanelDetail } from './left-panel-detail';

interface StudioTripProps {
  trip: OpenTrip<DirectionRow, HotspotRow>;
  map: MapLibreMap | null;
  draw: ReturnType<typeof useDrawing>;
  saved: ReturnType<typeof useSavedRoutes<DirectionRow>>;
  hotspots: ReturnType<typeof useSavedHotspots<HotspotRow>>;
  canEdit: boolean;
  /** A computer's screen: the route line detail in the left panel area, not the trip card. */
  isWideScreen: boolean;
  /** The left panel area's host for the route line detail. */
  leftPanel: HTMLElement | null;
  opening: ReturnType<typeof useFollow>['opening'];
  deletes: ReturnType<typeof useDeleteActions>;
  /** Closes every card: Edit, Extend and drawing the other way start a drawing. */
  onCloseAll: () => void;
  /** Adds the route's undrawn way: drawn by hand, or from a line picked ("+ Add route"). */
  onAddOtherWay: (routeId: string, how: AddWay) => void;
}

/**
 * The studio's trip (RouteCardLayer's `renderTrip`): on a phone the public map's trip card with
 * the editor's extras; on a computer the route line detail in the left panel area, beside the
 * map. Keyed on the route: switching direction keeps it and its colour.
 */
export function StudioTrip({
  trip,
  map,
  draw,
  saved,
  hotspots,
  canEdit,
  isWideScreen,
  leftPanel,
  opening,
  deletes,
  onCloseAll,
  onAddOtherWay,
}: StudioTripProps) {
  const { direction } = trip;
  const handleAddOtherWay = (how: AddWay) => {
    onCloseAll();
    onAddOtherWay(direction.routeId, how);
  };
  if (!isWideScreen)
    return (
      <StudioTripCard
        key={direction.routeId}
        trip={trip}
        saved={saved}
        hotspots={hotspots}
        draw={draw}
        canEdit={canEdit}
        opening={opening}
        onDelete={deletes.onDelete}
        onDrawOtherWay={() => handleAddOtherWay('draw')}
        onCloseAll={onCloseAll}
      />
    );
  if (!leftPanel) return null;
  return (
    <LeftPanelDetail leftPanel={leftPanel} onLeave={trip.leaveTrip}>
      <StudioRouteLineDetail
        key={direction.routeId}
        map={map}
        direction={direction}
        saved={saved}
        hotspots={hotspots}
        draw={draw}
        timeline={trip.timeline}
        canEdit={canEdit}
        opening={opening}
        onDelete={deletes.onDelete}
        onShow={(v) => (v.routeId === direction.routeId ? trip.switchTrip(v) : trip.otherRoute(v))}
        onAddOtherWay={handleAddOtherWay}
        onClose={onCloseAll}
      />
    </LeftPanelDetail>
  );
}
