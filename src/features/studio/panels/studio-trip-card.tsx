import { TripCard } from '@/features/routes/cards/trip-card';
import type { useCardCamera } from '@/features/routes/map/use-card-camera';
import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { Livery } from '@/features/routes/model/liveries';
import { isDrawn, isLoop, type DirectionRow } from '@/features/routes/model/routes';
import type { Timeline } from '@/features/routes/model/timeline';
import type { SheetHeight } from '@/shared/ui/bottom-sheet';

import { TripCardExtras } from './trip-card-extras';
import type { useDeleteActions } from './use-delete-actions';
import { signboardUrl } from '../data/signboards';
import type { Drawing } from '../drawing/use-drawing';
import type { useFollow } from '../drawing/use-follow';
import { DraftLockNotice } from '../review/draft-lock-notice';
import { useDraftLock } from '../review/use-draft-lock';

type Saved = ReturnType<typeof useSavedRoutes<DirectionRow>>;
type Hotspots = ReturnType<typeof useSavedHotspots<HotspotRow>>;
type Camera = ReturnType<typeof useCardCamera<DirectionRow, HotspotRow>>;

interface StudioTripCardProps {
  /** The open trip: `saved.selected`, known to be there. */
  direction: DirectionRow;
  saved: Pick<Saved, 'directions' | 'selected' | 'fullIds' | 'reload'>;
  hotspots: Pick<Hotspots, 'hotspots' | 'hotspotsAlong'>;
  draw: Pick<Drawing, 'load' | 'startExtend'>;
  timeline: Timeline;
  livery: Livery;
  /** The ride picked on the trip (useCardCamera's). */
  ride: Camera['ride'];
  tripDock: Camera['tripDock'];
  height: SheetHeight;
  canEdit: boolean;
  opening: ReturnType<typeof useFollow>['opening'];
  onDelete: ReturnType<typeof useDeleteActions>['onDelete'];
  onBackToList: Camera['backFromTrip'];
  onSwitch: Camera['switchTrip'];
  /** The other way is not drawn yet: SWITCH starts drawing it, for an editor. */
  onDrawOtherWay: () => void;
  onClose: () => void;
  onPick: Camera['pickOnTrip'];
  onEnd: Camera['endOnTrip'];
}

/**
 * The tapped direction as the public map's trip card, the editor's facts
 * and its Edit, Extend and Delete under its tiles.
 */
export function StudioTripCard({
  direction,
  saved,
  hotspots,
  draw,
  timeline,
  livery,
  ride,
  tripDock,
  height,
  canEdit,
  opening,
  onDelete,
  onBackToList,
  onSwitch,
  onDrawOtherWay,
  onClose,
  onPick,
  onEnd,
}: StudioTripCardProps) {
  // Another editor's draft of this route: it can be looked at, not changed.
  const { lock, retry } = useDraftLock('route', direction.routeId);
  const isEditable = canEdit && !lock;
  return (
    <TripCard
      direction={direction}
      directions={saved.directions}
      timeline={timeline}
      livery={livery}
      onBackToList={onBackToList}
      onSwitch={onSwitch}
      onDrawOtherWay={isEditable ? onDrawOtherWay : undefined}
      onClose={onClose}
      picked={ride.pickedId}
      pickedMetres={saved.fullIds.has(direction.id) ? ride.rideTo?.metres : undefined}
      pickedCode={ride.pickedCode}
      start={ride.startId}
      startCode={ride.startCode}
      onSetStart={ride.setStart}
      onRemoveStart={ride.removeStart}
      onPick={onPick}
      onEnd={onEnd}
      endPicked={ride.endPicked}
      dockRef={tripDock}
      height={height}
      signboardUrl={signboardUrl}
      extras={
        <TripCardExtras
          direction={direction}
          directions={saved.directions}
          hotspots={hotspots.hotspots}
          hotspotsAlong={hotspots.hotspotsAlong}
          canEdit={isEditable}
          notice={canEdit && lock && <DraftLockNotice lock={lock} onRetry={retry} />}
          onEdit={() => {
            const v = saved.selected;
            if (!v) return;
            onClose();
            void opening(v, draw.load);
          }}
          onDelete={() => {
            if (saved.selected) void onDelete(saved.selected);
          }}
          onExtend={
            // An ikot has no end to go on from (use-follow.ts says so when one is picked).
            isDrawn(direction) && !isLoop(direction)
              ? () => {
                  const v = saved.selected;
                  if (!v) return;
                  onClose();
                  void opening(v, draw.startExtend);
                }
              : undefined
          }
          onSignboardsChanged={() => void saved.reload()}
        />
      }
    />
  );
}
