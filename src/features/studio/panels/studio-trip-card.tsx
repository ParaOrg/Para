import { TripCard } from '@/features/routes/cards/trip-card';
import { tripFacts } from '@/features/routes/cards/trip-facts';
import type { OpenTrip } from '@/features/routes/map/route-card-slots';
import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import { isDrawn, isLoop, type DirectionRow } from '@/features/routes/model/routes';

import { LockedDraft } from './locked-draft';
import { TripCardExtras } from './trip-card-extras';
import type { useDeleteActions } from './use-delete-actions';
import { useDraftLock } from './use-draft-lock';
import { signboardUrl } from '../data/signboards';
import type { Drawing } from '../drawing/use-drawing';
import type { useFollow } from '../drawing/use-follow';

type Saved = ReturnType<typeof useSavedRoutes<DirectionRow>>;
type Hotspots = ReturnType<typeof useSavedHotspots<HotspotRow>>;

interface StudioTripCardProps {
  /** The open trip, as RouteCardLayer hands it to the page. */
  trip: OpenTrip<DirectionRow, HotspotRow>;
  saved: Pick<Saved, 'directions' | 'selected' | 'reload'>;
  hotspots: Pick<Hotspots, 'hotspots' | 'hotspotsAlong'>;
  draw: Pick<Drawing, 'load' | 'startExtend'>;
  canEdit: boolean;
  opening: ReturnType<typeof useFollow>['opening'];
  onDelete: ReturnType<typeof useDeleteActions>['onDelete'];
  /** The other way is not drawn yet: SWITCH starts drawing it, for an editor. */
  onDrawOtherWay: () => void;
  /** Closes every card: Edit and Extend start a drawing. */
  onCloseAll: () => void;
}

/**
 * The tapped direction as the public map's trip card, as it opens there, with the editor's facts
 * and its Edit, Extend and Delete under its tiles.
 */
export function StudioTripCard({
  trip,
  saved,
  hotspots,
  draw,
  canEdit,
  opening,
  onDelete,
  onDrawOtherWay,
  onCloseAll,
}: StudioTripCardProps) {
  const { direction, timeline, ride, picking } = trip;
  // Another editor's draft of this route: it can be looked at, not changed.
  const { lock, retry } = useDraftLock('route', direction.routeId);
  const isEditable = canEdit && !lock;
  // The other way still an undrawn slot: a button says so, as well as ⇅ on the ends card.
  const canDrawOtherWay =
    isEditable && tripFacts(direction, saved.directions, timeline).isOtherWayUndrawn;
  return (
    <TripCard
      direction={direction}
      directions={trip.directions}
      timeline={timeline}
      livery={trip.livery}
      onSwitch={trip.switchTrip}
      onDrawOtherWay={isEditable ? onDrawOtherWay : undefined}
      onClose={trip.leaveTrip}
      picked={ride.pickedId}
      pickedMetres={trip.pickedMetres}
      pickedCode={ride.pickedCode}
      start={ride.startId}
      startCode={ride.startCode}
      onSetStart={picking?.setStart}
      onRemoveStart={picking?.removeStart}
      walk={trip.walk}
      onPick={picking?.pick}
      onEnd={picking?.end}
      endPicked={ride.endPicked}
      dockRef={trip.tripDock}
      height={trip.height}
      onOtherRoute={trip.otherRoute}
      signboardUrl={signboardUrl}
      extras={
        <TripCardExtras
          direction={direction}
          directions={saved.directions}
          hotspots={hotspots.hotspots}
          hotspotsAlong={hotspots.hotspotsAlong}
          canEdit={isEditable}
          notice={
            canEdit &&
            lock && (
              <LockedDraft
                kind="route"
                subjectId={direction.routeId}
                lock={lock}
                onRetry={retry}
                onSettled={() => void saved.reload()}
              />
            )
          }
          onEdit={() => {
            const v = saved.selected;
            if (!v) return;
            onCloseAll();
            void opening(v, draw.load, { isToEdit: true });
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
                  onCloseAll();
                  void opening(v, draw.startExtend);
                }
              : undefined
          }
          onDrawOtherWay={canDrawOtherWay ? onDrawOtherWay : undefined}
          onSignboardsChanged={() => void saved.reload()}
        />
      }
    />
  );
}
