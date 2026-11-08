import type { MapLibreMap } from 'maplibre-gl';
import { createPortal } from 'react-dom';

import type { LngLat } from '@/shared/utils/geo';

import { useMapMarker, useMarkerElement } from './use-map-marker';
import { TimelineDot } from '../cards/timeline-dot';

import './hintuan-pin.css';

interface LandmarkPinProps {
  map: MapLibreMap;
  /** The landmark's point, where its search took the camera. */
  at: LngLat;
}

/**
 * Where a landmark search landed (.scratch/place-search, ticket 06): the picked hintuan's circle
 * (HintuanPin's filled TimelineDot, popped by the same sheet) in Content/primary, a neutral that
 * reads as neither Start's green nor End's red. A look for now; the owner designs it. It takes no
 * taps, so a tap on it reaches the line or the box beneath, and it names nothing: the landmark's
 * name is the "routes near here" panel's heading, which is open for as long as the pin is. The
 * caller keys it on the landmark, so another pick pops a fresh circle.
 */
export function LandmarkPin({ map, at }: LandmarkPinProps) {
  const el = useMarkerElement('landmark-pin', 'hintuan-pin');
  useMapMarker(map, el, at, { anchor: 'center' });
  return createPortal(<TimelineDot rail="bg-content-primary" selected isTucked={false} />, el);
}
