import type { MapLibreMap } from 'maplibre-gl';

import { RouteCardLayer } from '@/features/routes/map/route-card-layer';
import type { RouteCardsState } from '@/features/routes/map/use-route-cards';
import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import {
  StudioHotspotCard,
  type AddWay,
  type DraftTrip,
  type useDeleteActions,
  type useDrawing,
  type useFollow,
} from '@/features/studio';

import { PlaygroundDraftTrip } from './playground-draft-trip';
import { StudioTrip } from './studio-trip';

interface PlaygroundCardsProps {
  map: MapLibreMap | null;
  draw: ReturnType<typeof useDrawing>;
  saved: ReturnType<typeof useSavedRoutes<DirectionRow>>;
  hotspots: ReturnType<typeof useSavedHotspots<HotspotRow>>;
  /** What useRouteCards keeps. */
  routeCards: RouteCardsState<DirectionRow, HotspotRow>;
  canEdit: boolean;
  /** A computer's screen: a trip opens in the left panel. */
  isWideScreen: boolean;
  /** The left panel area's host for the route line detail. */
  leftPanel: HTMLElement | null;
  /** A route that is a draft only, open from its draft (useDraftTrip). */
  draftTrip: DraftTrip | null;
  opening: ReturnType<typeof useFollow>['opening'];
  deletes: ReturnType<typeof useDeleteActions>;
  onAddOtherWay: (routeId: string, how: AddWay) => void;
}

/**
 * The Playground's cards, the public map's (RouteCardLayer), with the studio's own trip and
 * hotspot card in its slots; and a draft-only route's detail, which stands in their place. None
 * while a line is drawn.
 */
export function PlaygroundCards({
  map,
  draw,
  saved,
  hotspots,
  routeCards,
  canEdit,
  isWideScreen,
  leftPanel,
  draftTrip,
  opening,
  deletes,
  onAddOtherWay,
}: PlaygroundCardsProps) {
  const { cards, camera } = routeCards;
  if (draw.drawing) return null;
  return (
    <>
      <RouteCardLayer
        map={map}
        saved={saved}
        hotspots={hotspots}
        routeCards={routeCards}
        renderTrip={(trip) => (
          <StudioTrip
            trip={trip}
            map={map}
            draw={draw}
            saved={saved}
            hotspots={hotspots}
            canEdit={canEdit}
            isWideScreen={isWideScreen}
            leftPanel={leftPanel}
            opening={opening}
            deletes={deletes}
            onCloseAll={cards.closeAll}
            onAddOtherWay={onAddOtherWay}
          />
        )}
        // Keyed on the box, not only the place: the editor's card is for one box.
        renderPlace={(place) => (
          <StudioHotspotCard
            key={place.hotspot.id}
            hotspot={place.hotspot}
            map={map}
            saved={saved}
            hotspots={hotspots}
            draw={draw}
            height={place.height}
            canEdit={canEdit}
            clearOfOpen={camera.clearOfOpen}
            onPickOnPlaceCard={camera.pickOnPlaceCard}
            onOpenTrip={place.openTrip}
            onDeleteHotspot={deletes.onDeleteHotspot}
            onCloseAll={cards.closeAll}
            onClose={place.close}
          />
        )}
      />
      {draftTrip && isWideScreen && leftPanel && (
        <PlaygroundDraftTrip
          map={map}
          trip={draftTrip}
          saved={saved}
          hotspots={hotspots}
          draw={draw}
          canEdit={canEdit}
          leftPanel={leftPanel}
          opening={opening}
        />
      )}
    </>
  );
}
