import type { MapLibreMap } from 'maplibre-gl';

import { useTripTimeline } from '@/features/routes/cards/use-trip-timeline';
import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import {
  StudioRouteLineDetail,
  type DraftTrip,
  type useDrawing,
  type useFollow,
} from '@/features/studio';

import { LeftPanelDetail } from './left-panel-detail';

interface PlaygroundDraftTripProps {
  map: MapLibreMap | null;
  /** The route that is a draft only, open from its draft (useDraftTrip). */
  trip: DraftTrip;
  /** The approved map, reloaded when a draft is approved from the detail. */
  saved: Pick<ReturnType<typeof useSavedRoutes<DirectionRow>>, 'reload'>;
  hotspots: ReturnType<typeof useSavedHotspots<HotspotRow>>;
  draw: ReturnType<typeof useDrawing>;
  canEdit: boolean;
  /** Where the detail goes: the left panel area's host, hidden on the studio's other maps. */
  leftPanel: HTMLElement;
  opening: ReturnType<typeof useFollow>['opening'];
}

/**
 * A route that is a draft only, read in the route line detail on a computer before Edit Route
 * edits it. Escape closes it here; the empty map tapped and Back close it with the route cards
 * (useRouteCards' `ownCard`), as they leave an approved route's.
 */
export function PlaygroundDraftTrip({
  map,
  trip,
  saved,
  hotspots,
  draw,
  canEdit,
  leftPanel,
  opening,
}: PlaygroundDraftTripProps) {
  const { direction, directions, show, close } = trip;
  const timeline = useTripTimeline(direction, hotspots);
  if (!timeline) return null;
  return (
    <LeftPanelDetail leftPanel={leftPanel} onLeave={close}>
      <StudioRouteLineDetail
        key={direction.routeId}
        map={map}
        direction={direction}
        saved={{ directions, selected: direction, reload: saved.reload }}
        hotspots={hotspots}
        draw={draw}
        timeline={timeline}
        canEdit={canEdit}
        isDraftOnly
        opening={opening}
        onShow={show}
        onClose={close}
      />
    </LeftPanelDetail>
  );
}
