import type { MapLibreMap } from 'maplibre-gl';

import { EndTitles } from '@/features/routes/map/end-titles';
import { HintuanPin } from '@/features/routes/map/hintuan-pin';
import { StationLabels } from '@/features/routes/map/station-labels';
import type { useCardCamera } from '@/features/routes/map/use-card-camera';
import type { useCardStack } from '@/features/routes/map/use-card-stack';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import type { useStudioTrip } from '@/features/studio';

type Camera = ReturnType<typeof useCardCamera<DirectionRow, HotspotRow>>;
type Cards = ReturnType<typeof useCardStack<DirectionRow, HotspotRow>>;
type Trip = ReturnType<typeof useStudioTrip>;

interface PlaygroundMarksProps {
  map: MapLibreMap | null;
  isDrawing: boolean;
  /** The open trip, if any (`saved.selected`). */
  selected: DirectionRow | null;
  hotspots: HotspotRow[];
  rides: Trip['rides'];
  timeline: Trip['timeline'];
  ride: Camera['ride'];
  tripLivery: Cards['tripLivery'];
  litLivery: Cards['litLivery'];
  onPick: Camera['pickOnTrip'];
}

/** The trip's marks on the map: each lit ride's ends, the open trip's stations and its picked hintuans. */
export function PlaygroundMarks({
  map,
  isDrawing,
  selected,
  hotspots,
  rides,
  timeline,
  ride,
  tripLivery,
  litLivery,
  onPick,
}: PlaygroundMarksProps) {
  return (
    <>
      {/* Each lit ride's ends, named over their circles. */}
      {map && !isDrawing && <EndTitles map={map} rides={rides} livery={litLivery} />}
      {/*
        The open trip's hintuans along its line, a train's stations and a
        jeepney's alike, named (RouteLineLabel).
      */}
      {map && !isDrawing && selected && tripLivery && timeline && (
        <StationLabels
          map={map}
          selected={selected}
          hotspots={hotspots}
          rows={timeline.between}
          livery={tripLivery}
          pickedId={ride.pickedId}
          startId={ride.startId}
          endPicked={ride.endPicked}
          hasRide={ride.ridden !== null}
          onPick={onPick}
        />
      )}
      {/* Keyed on the pick: another hintuan pops a fresh circle. */}
      {map && !isDrawing && ride.pinAt && tripLivery && (
        <HintuanPin
          key={ride.pickedId}
          map={map}
          at={ride.pinAt}
          label={ride.pickedLabel}
          code={ride.pickedCode}
          livery={tripLivery}
        />
      )}
      {map && !isDrawing && ride.startPinAt && tripLivery && (
        <HintuanPin
          key={`start:${ride.startId}`}
          map={map}
          at={ride.startPinAt}
          label={ride.startLabel}
          code={ride.startCode}
          livery={tripLivery}
          marks="start"
        />
      )}
    </>
  );
}
