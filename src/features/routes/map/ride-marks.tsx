import type { MapLibreMap } from 'maplibre-gl';

import { EndTitles } from './end-titles';
import { HintuanPin } from './hintuan-pin';
import { StationLabels } from './station-labels';
import type { RouteCardsState } from './use-route-cards';
import type { useSavedHotspots } from './use-saved-hotspots';
import type { useSavedRoutes } from './use-saved-routes';
import type { Hotspot } from '../model/hotspots';
import type { Direction } from '../model/routes';

interface RideMarksProps<V extends Direction, S extends Hotspot> {
  map: MapLibreMap | null;
  saved: ReturnType<typeof useSavedRoutes<V>>;
  hotspots: ReturnType<typeof useSavedHotspots<S>>;
  routeCards: RouteCardsState<V, S>;
}

/**
 * What the lit routes and the open trip mark on the map, as markers: each lit ride's ends, the
 * trip's hintuans along its line, the picked hintuan's circle and the start's. Drawn in this order,
 * as markers stack in the order they are added.
 */
export function RideMarks<V extends Direction, S extends Hotspot>({
  map,
  saved,
  hotspots,
  routeCards,
}: RideMarksProps<V, S>) {
  const { cards, camera, rides, timeline, options } = routeCards;
  const { ride } = camera;
  const { tripLivery, litLivery } = cards;
  if (!map) return null;

  return (
    <>
      {/* Each lit ride's ends, named over their circles; with no trip open, a tail opens its. */}
      <EndTitles map={map} rides={rides} livery={litLivery} onPick={camera.openPlace} />
      {/*
        The open trip's hintuans along its line, a train's stations and a jeepney's hintuans
        alike, each named (RouteLineLabel). Where picking is on, a tap picks one as its row on the
        trip card does, the map gliding in to it.
      */}
      {saved.selected && tripLivery && timeline && (
        <StationLabels
          map={map}
          selected={saved.selected}
          hotspots={hotspots.hotspots}
          rows={timeline.between}
          livery={tripLivery}
          pickedId={ride.pickedId}
          startId={ride.startId}
          endPicked={ride.endPicked}
          hasRide={ride.ridden !== null}
          onPick={options.isRidePickingOn ? camera.pickOnTrip : undefined}
        />
      )}
      {/*
        Keyed on the pick: another hintuan pops a fresh circle. Its name, tapped, lets the pick go
        and takes the camera back where it was, as its row tapped again does.
      */}
      {ride.pinAt && tripLivery && (
        <HintuanPin
          key={ride.pickedId}
          map={map}
          at={ride.pinAt}
          label={ride.pickedLabel}
          code={ride.pickedCode}
          livery={tripLivery}
          onPick={options.isRidePickingOn ? () => ride.pick(ride.pickedId) : undefined}
        />
      )}
      {/* The ride's start, picked by Set as start: its own circle, Start's pill beside it. */}
      {ride.startPinAt && tripLivery && (
        <HintuanPin
          key={`start:${ride.startId}`}
          map={map}
          at={ride.startPinAt}
          label={ride.startLabel}
          code={ride.startCode}
          livery={tripLivery}
          marks="start"
          onPick={ride.removeStart}
        />
      )}
    </>
  );
}
