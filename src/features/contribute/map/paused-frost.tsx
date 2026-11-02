import type { MapLibreMap } from 'maplibre-gl';

import { MapFrost } from './map-frost';
import type { MapWhere } from './map-where';
import { useFrostCentre } from './use-frost-centre';

export interface PausedFrostProps {
  map: MapLibreMap | null;
  /** The rider's dot, from the locator; null without a fix. */
  where: MapWhere | null;
  isFrosted: boolean;
}

/** The paused frost on the map, clearing round the rider's dot: its own chunk, loaded as a recording starts. */
export function PausedFrost({ map, where, isFrosted }: PausedFrostProps) {
  const centre = useFrostCentre(map, where, isFrosted);
  return <MapFrost isFrosted={isFrosted} centre={centre} />;
}
