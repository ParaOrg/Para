import type { MapLibreMap } from 'maplibre-gl';
import { createPortal } from 'react-dom';

import { useTripTimeline } from '@/features/routes/cards/use-trip-timeline';
import { useEmptyMapTap } from '@/features/routes/map/use-empty-map-tap';
import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import {
  StudioRouteLineDetail,
  type useDeleteActions,
  type useDrawing,
  type useFollow,
  type useOpenDraft,
} from '@/features/studio';
import { useEscape } from '@/shared/hooks/use-escape';

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
  deletes: ReturnType<typeof useDeleteActions>;
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
  deletes,
}: PlaygroundDraftTripProps) {
  const { direction, directions, show, close } = trip;
  const timeline = useTripTimeline(direction, hotspots);
  // On the studio's other maps the host is hidden and the detail waits (PlaygroundTrip).
  const leave = () => {
    if (getComputedStyle(leftPanel).display !== 'none') close();
  };
  useEmptyMapTap(map, leave);
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
      // A draft only offers neither Delete nor the other way (isDraftOnly): both need approved rows.
      onDelete={deletes.onDelete}
      onDrawOtherWay={close}
      onShow={show}
      onClose={close}
    />,
    leftPanel,
  );
}
