import type { MapLibreMap } from 'maplibre-gl';

import { lookAt } from '@/features/routes/map/look-at';
import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import { isDrawn, isLoop, type DirectionRow } from '@/features/routes/model/routes';
import type { Timeline } from '@/features/routes/model/timeline';

import type { AddWay } from './add-way';
import { directionTabs } from './direction-tabs';
import { LockedDraft } from './locked-draft';
import { RouteLineActions } from './route-line-actions';
import { RouteLineDetail } from './route-line-detail';
import {
  otherDestinations,
  routeStatus,
  routeStops,
  routeSummaryFacts,
  transitLineFacts,
} from './route-line-facts';
import type { useDeleteActions } from './use-delete-actions';
import { useDraftLock } from './use-draft-lock';
import { useRouteExport } from './use-route-export';
import { signboardUrl } from '../data/signboards';
import type { Drawing } from '../drawing/use-drawing';
import type { useFollow } from '../drawing/use-follow';

type Saved = ReturnType<typeof useSavedRoutes<DirectionRow>>;
type Hotspots = ReturnType<typeof useSavedHotspots<HotspotRow>>;

interface StudioRouteLineDetailProps {
  map: MapLibreMap | null;
  /** The open direction: `saved.selected`, known to be there. */
  direction: DirectionRow;
  saved: { directions: readonly DirectionRow[] } & Pick<Saved, 'selected' | 'reload'>;
  hotspots: Pick<Hotspots, 'hotspots' | 'hotspotsAlong'>;
  draw: Pick<Drawing, 'load' | 'startExtend'>;
  /** The open direction's stops (useTripTimeline's). */
  timeline: Timeline;
  /** A signed-in editor; another editor's draft of the route still leaves it read-only. */
  canEdit: boolean;
  /**
   * A route that is a draft only, opened from the editor's draft: its Status reads Draft, and it
   * has no Extend, Delete or way to add, which work on approved rows.
   */
  isDraftOnly?: boolean;
  opening: ReturnType<typeof useFollow>['opening'];
  /** Absent on a draft only (isDraftOnly). */
  onDelete?: ReturnType<typeof useDeleteActions>['onDelete'];
  /** Another direction of the route, or another route, in this one's place. */
  onShow: (direction: DirectionRow) => void;
  /** Adds the route's undrawn way, as "+ Add route" picked; absent on a draft only. */
  onAddOtherWay?: (how: AddWay) => void;
  /** Closes the detail: Edit Route and Extend start a drawing. */
  onClose: () => void;
}

/**
 * The open direction as the studio's route line detail on a computer (RouteLineDetail), with the
 * editor's actions: Edit Route, Extend, Export and ⋮'s Delete; read-only (signed out, or another
 * editor's draft open) Export alone, under the locked draft's notice.
 */
export function StudioRouteLineDetail({
  map,
  direction,
  saved,
  hotspots,
  draw,
  timeline,
  canEdit,
  isDraftOnly = false,
  opening,
  onDelete,
  onShow,
  onAddOtherWay,
  onClose,
}: StudioRouteLineDetailProps) {
  const { lock, hasDraft, retry } = useDraftLock('route', direction.routeId);
  const isEditable = canEdit && !lock;
  const status = routeStatus(isDraftOnly, hasDraft);
  const routeDirections = saved.directions.filter((v) => v.routeId === direction.routeId);
  const exporter = useRouteExport({
    directions: routeDirections,
    hotspots: hotspots.hotspots,
    hotspotsAlong: hotspots.hotspotsAlong,
  });
  const startFromSelected = (start: typeof draw.load) => {
    const v = saved.selected;
    if (!v) return;
    onClose();
    void opening(v, start, start === draw.load ? { isToEdit: true } : undefined);
  };
  const handleStop = (id: string) => {
    const hotspot = hotspots.hotspots.find((s) => s.id === id);
    if (hotspot) lookAt(map, hotspot.point.coordinates);
  };
  const show = (id: string) => {
    const v = saved.directions.find((d) => d.id === id);
    if (v) onShow(v);
  };
  const lockNotice = canEdit && lock && (
    <LockedDraft
      kind="route"
      subjectId={direction.routeId}
      lock={lock}
      onRetry={retry}
      onSettled={() => void saved.reload()}
    />
  );
  return (
    <RouteLineDetail
      label={direction.name ?? direction.route?.name ?? 'Route'}
      notice={lockNotice}
      tabs={directionTabs(direction, saved.directions)}
      selectedId={direction.id}
      onSelect={show}
      onAddRoute={
        isEditable && !isDraftOnly && onAddOtherWay ? (_, how) => onAddOtherWay(how) : undefined
      }
      actions={
        <RouteLineActions
          exporter={exporter}
          onEdit={isEditable ? () => startFromSelected(draw.load) : undefined}
          onExtend={
            // An ikot has no end to go on from (use-follow.ts says so when one is picked); a draft
            // only has no approved line to go on from, and Edit Route extends its drawing.
            isEditable && !isDraftOnly && isDrawn(direction) && !isLoop(direction)
              ? () => startFromSelected(draw.startExtend)
              : undefined
          }
          onDelete={
            isEditable && onDelete && !isDraftOnly
              ? () => {
                  if (saved.selected) void onDelete(saved.selected);
                }
              : undefined
          }
        />
      }
      summary={routeSummaryFacts(direction, saved.directions, timeline, status)}
      facts={transitLineFacts(direction, saved.directions, timeline)}
      destinations={otherDestinations(direction, saved.directions)}
      onOpenDestination={show}
      signboards={(direction.signboards ?? []).map(signboardUrl)}
      stops={routeStops(timeline, isLoop(direction))}
      onStop={handleStop}
    />
  );
}
