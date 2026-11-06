import type { MapLibreMap } from 'maplibre-gl';
import { createPortal } from 'react-dom';

import { useMapMarker, useMarkerElement } from '@/features/routes/map/use-map-marker';

import type { LastKnown } from './last-known';
import { LastKnownMark } from './last-known-mark';

interface LastKnownDotProps {
  map: MapLibreMap;
  place: LastKnown;
  /** The clock the pill reads, ticking while it shows. */
  now: number;
}

/**
 * Where the phone last was, greyed out, while location is off or no fix comes (LastKnownMark), as
 * a DOM marker like the locator's own dot. Display only: it is never ride data.
 */
export function LastKnownDot({ map, place, now }: LastKnownDotProps) {
  const el = useMarkerElement('last-known-location');
  // The mark's top at the place, lifted by half its dot (24 px) so the dot's middle is there.
  useMapMarker(map, el, place.at, { anchor: 'top', offset: [0, -12], dragsPass: true });
  return createPortal(<LastKnownMark time={place.time} now={now} />, el);
}
