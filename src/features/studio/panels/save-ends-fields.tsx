import type { Ref } from 'react';

import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import type { LngLat } from '@/shared/utils/geo';

import { NewPlaceForm } from './new-place-form';
import { PlacePicker } from './place-picker';
import type { Place } from './places';

interface SaveEndsFieldsProps {
  places: Place[];
  /** The place picked at each end, if any. */
  headPlace: Place | undefined;
  tailPlace: Place | undefined;
  /** The end a new place is being made for, if any. */
  making: 'Head' | 'Tail' | null;
  /** The line's end nearer the route's head, and the other. */
  nearHead: LngLat | undefined;
  nearTail: LngLat | undefined;
  hotspots: HotspotRow[];
  directions: DirectionRow[];
  /** The ends belong to the route, so a return trip and a retried new route keep them. */
  isLocked: boolean;
  headRef: Ref<HTMLSelectElement>;
  tailRef: Ref<HTMLSelectElement>;
  onHeadChange: (placeKey: string) => void;
  onTailChange: (placeKey: string) => void;
  onPlaceSaved: (place: HotspotRow) => void;
  onPlaceCancel: () => void;
}

/**
 * A route's two ends on the sidebar, labelled as the studio says them: Origin (the head) and
 * Destination (the tail). And the form that makes a new place for one.
 */
export function SaveEndsFields({
  places,
  headPlace,
  tailPlace,
  making,
  nearHead,
  nearTail,
  hotspots,
  directions,
  isLocked,
  headRef,
  tailRef,
  onHeadChange,
  onTailChange,
  onPlaceSaved,
  onPlaceCancel,
}: SaveEndsFieldsProps) {
  return (
    <>
      <PlacePicker
        label="Origin"
        places={places}
        value={headPlace?.key ?? ''}
        isDisabled={isLocked}
        onChange={onHeadChange}
        ref={headRef}
        testId="save-head"
      />
      <PlacePicker
        label="Destination"
        places={places}
        value={tailPlace?.key ?? ''}
        isDisabled={isLocked}
        onChange={onTailChange}
        ref={tailRef}
        testId="save-tail"
      />

      {making && nearHead && nearTail && (
        <NewPlaceForm
          key={making}
          end={making}
          centre={making === 'Head' ? nearHead : nearTail}
          defaultKind={making === 'Head' ? 'terminal' : 'hintuan'}
          hotspots={hotspots}
          directions={directions}
          onSaved={onPlaceSaved}
          onCancel={onPlaceCancel}
        />
      )}
    </>
  );
}
