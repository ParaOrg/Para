import type { MapLibreMap } from 'maplibre-gl';
import { createPortal } from 'react-dom';

import type { useGazeHush } from '@/features/locator';
import { OverviewPill } from '@/features/routes/map/overview-pill';
import type { useCardCamera } from '@/features/routes/map/use-card-camera';
import type { useCardStack } from '@/features/routes/map/use-card-stack';
import { useEmptyMapTap } from '@/features/routes/map/use-empty-map-tap';
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
  type useStudioTrip,
} from '@/features/studio';
import { useEscape } from '@/shared/hooks/use-escape';

interface PlaygroundTripProps {
  map: MapLibreMap | null;
  draw: ReturnType<typeof useDrawing>;
  saved: ReturnType<typeof useSavedRoutes<DirectionRow>>;
  hotspots: ReturnType<typeof useSavedHotspots<HotspotRow>>;
  cards: ReturnType<typeof useCardStack<DirectionRow, HotspotRow>>;
  camera: ReturnType<typeof useCardCamera<DirectionRow, HotspotRow>>;
  trip: ReturnType<typeof useStudioTrip>;
  canEdit: boolean;
  /** A computer's screen: the route line detail in the left panel area, not the trip card. */
  isWideScreen: boolean;
  /** Where the detail goes: the left panel area's host, hidden on the studio's other maps. */
  leftPanel: HTMLElement | null;
  opening: ReturnType<typeof useFollow>['opening'];
  deletes: ReturnType<typeof useDeleteActions>;
  hush: ReturnType<typeof useGazeHush>['hush'];
  onDrawReturnTrip: (routeId: string) => void;
}

/**
 * The open trip: on a phone the public map's trip card with the editor's extras; on a
 * computer the route line detail in the left panel area, with Overview over the map's top left.
 * Escape, or a tap on the empty map, leaves the detail:
 * back to the list or the place's card it came from, else closed. Keyed on the route: switching
 * direction keeps it and its colour.
 */
export function PlaygroundTrip({
  map,
  draw,
  saved,
  hotspots,
  cards,
  camera,
  trip,
  canEdit,
  isWideScreen,
  leftPanel,
  opening,
  deletes,
  hush,
  onDrawReturnTrip,
}: PlaygroundTripProps) {
  const { closeAll, tripLivery, height } = cards;
  const { ride, tripDock, switchTrip, otherRoute, backFromTrip, pickOnTrip, endOnTrip } = camera;
  const { timeline } = trip;
  const isOpen = !draw.drawing && !!saved.selected && !!tripLivery && !!timeline;
  const isDetail = isWideScreen && isOpen;
  // Back to the list or the place's card the trip was opened from; opened on its own, closed.
  const isFromCard = cards.choosing || !!hotspots.selected;
  const back = hush((isFromCard ? backFromTrip : null) ?? closeAll);
  // On the studio's other maps the host is hidden and the detail waits: their Escape and taps
  // are theirs, as a sheet left open under an inert page leaves them (BottomSheet).
  const leave = () => {
    if (leftPanel && getComputedStyle(leftPanel).display !== 'none') back();
  };
  useEmptyMapTap(map, isDetail ? leave : null);
  useEscape(leave, isDetail);

  const handleDrawOtherWay = () => {
    const routeId = saved.selected?.routeId;
    if (!routeId) return;
    closeAll();
    onDrawReturnTrip(routeId);
  };
  // Over a list, the Overview stands among the list's controls instead (PlaygroundListControls).
  const overview = isDetail && (
    <div className="absolute top-4 left-4 z-10">
      <OverviewPill {...camera.overviewButton} map={map} />
    </div>
  );
  if (!saved.selected || !timeline || !tripLivery || draw.drawing) return overview || null;
  if (isWideScreen) {
    const selected = saved.selected;
    return (
      <>
        {overview}
        {leftPanel &&
          createPortal(
            <StudioRouteLineDetail
              key={selected.routeId}
              map={map}
              direction={selected}
              saved={saved}
              hotspots={hotspots}
              draw={draw}
              timeline={timeline}
              canEdit={canEdit}
              opening={opening}
              onDelete={deletes.onDelete}
              onShow={(v) => (v.routeId === selected.routeId ? switchTrip(v) : otherRoute(v))}
              onDrawOtherWay={handleDrawOtherWay}
              onClose={closeAll}
            />,
            leftPanel,
          )}
      </>
    );
  }
  return (
    <StudioTripCard
      key={saved.selected.routeId}
      direction={saved.selected}
      saved={saved}
      hotspots={hotspots}
      draw={draw}
      timeline={timeline}
      livery={tripLivery}
      ride={ride}
      tripDock={tripDock}
      height={height}
      canEdit={canEdit}
      opening={opening}
      onDelete={deletes.onDelete}
      onBackToList={hush(backFromTrip)}
      onSwitch={switchTrip}
      onDrawOtherWay={handleDrawOtherWay}
      onClose={closeAll}
      onPick={pickOnTrip}
      onEnd={endOnTrip}
    />
  );
}
