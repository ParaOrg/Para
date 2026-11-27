import type { MapLibreMap } from 'maplibre-gl';
import { createPortal } from 'react-dom';

import { useTripTimeline } from '@/features/routes/cards/use-trip-timeline';
import { useEmptyMapTap } from '@/features/routes/map/use-empty-map-tap';
import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import {
  DRAFT_LINES_HIT,
  StudioRouteLineDetail,
  type useDrawing,
  type useFollow,
  type useOpenDraft,
} from '@/features/studio';
import { useEscape } from '@/shared/hooks/use-escape';

const DRAFT_TAP_LAYERS = [DRAFT_LINES_HIT];

interface PlaygroundDraftTripProps {
  map: MapLibreMap | null;
  /** The route that is a draft only, open from its draft (useOpenDraft). */
  trip: NonNullable<ReturnType<typeof useOpenDraft>['trip']>;
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
 * edits it. Escape, or a tap on the empty map, closes it, as it closes an approved route's.
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
  // On the studio's other maps the host is hidden and the detail waits (PlaygroundTrip).
  const leave = () => {
    if (getComputedStyle(leftPanel).display !== 'none') close();
  };
  // A draft's dashed line is DraftLines' to open: a tap on it is not an empty one.
  useEmptyMapTap(map, leave, DRAFT_TAP_LAYERS);
  useEscape(leave, true);
  if (!timeline) return null;
  return createPortal(
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
    />,
    leftPanel,
  );
}
