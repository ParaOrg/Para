import type { MapLibreMap } from 'maplibre-gl';

/** The maps whose hotspots take no tap (useHotspotTaps' `isTappable`). */
const untappable = new WeakSet<MapLibreMap>();

/**
 * Whether a tap on `map`'s hotspots, a box, its pin or its dot, is theirs. Not, and the tap reads
 * as if no hotspot were there (tapTargets): a route's under it, or the empty map's.
 */
export function areHotspotsTappable(map: MapLibreMap): boolean {
  return !untappable.has(map);
}

/** Says whether `map`'s hotspots take a tap, for tapTargets to read (areHotspotsTappable). */
export function setHotspotsTappable(map: MapLibreMap, isTappable: boolean): void {
  if (isTappable) untappable.delete(map);
  else untappable.add(map);
}
