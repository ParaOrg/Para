import type { GeoJSONSource, LineLayerSpecification, MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';

import type { LngLat } from '@/shared/utils/geo';

import { LAYERS, layerAbove, useLayerReady } from './layers';
import { litWidth } from './line-style';
import { LIT_LINE } from './livery-line';

/**
 * The rest of a lit ride past a picked hintuan: from there to where the trip
 * goes, drawn over the lit line in the trip card's Card/<livery>/surface-pale
 * (the owner's ask, 2026-10-12: "the remaining line should be surface-pale
 * of the selected colour"), the rest of the lit line staying as it is. The
 * ride already ends at the hintuan for the chevrons (useRideTo's `ridden`,
 * Ride.flow); this is the way not ridden, told apart by its colour. It sits
 * right above the lit line and under everything else drawn on it — the
 * green hintuan stretches, the chevrons, the end circles — so the trip's far
 * end still closes in its circle, and the picked hintuan's own circle
 * (HintuanPin, a DOM marker) stands over it all. Nothing picked, no
 * features: the source is empty and the layer draws nothing. The dots along
 * the rest ring in the same pale (StationLabels; the owner's ask the same
 * evening, with a screenshot of them still in the line's colour).
 *
 * The way not ridden was drawn at rest once (useRideTo, until the owner's
 * "now I don't want to cut the route", 2026-09-30), in the resting blue in
 * its white casing; this is a shade of the trip's own, no casing, at the lit
 * line's width.
 *
 * Painted so that the resting line's GL program draws it, compiled at load
 * (saved-routes-layers.ts): a colour for the layer, a width of the zoom
 * alone, and no opacity of the feature state. A program of its own would be
 * compiled at the tap that picks the first hintuan, 5-50 ms of a cheap
 * phone's main thread and up to a second of the suites' (warm-programs.ts);
 * gl-programs-test holds it to that program.
 */

const SRC = 'ride-rest';
/** The rest's layer: useRideColours paints its colour from the look, as it does the chevrons' and the end circles'. */
export const REST_LAYER = 'ride-rest-line';

/**
 * The rest's layer, as added: the lit line's width, with square ends — the
 * paint starts where the pick is and stops at the line's end, under its
 * circle — in the selected blue until a look says otherwise.
 */
export const RIDE_REST_LAYER = {
  id: REST_LAYER,
  type: 'line',
  source: SRC,
  layout: { 'line-cap': 'butt', 'line-join': 'round' },
  paint: {
    'line-color': LIT_LINE.pale,
    // A new colour with the trip it goes with, in its frame: no fade from the last card's.
    'line-color-transition': { duration: 0, delay: 0 },
    'line-width': litWidth(),
  },
} as const satisfies LineLayerSpecification;

/**
 * The rest's source and layer, added to `map` right above the lit line,
 * which must be there: what useRideRest adds, apart so a unit check can read
 * it (map-sources-test).
 */
export function addRideRest(
  map: Pick<MapLibreMap, 'addSource' | 'addLayer' | 'getLayersOrder'>,
): void {
  map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  // Before the layer drawn right after the lit line, whichever that is by
  // now — the hintuan stretches, or the routes' hit area — so what the other
  // hooks draw on the lit line stays above this, whichever hook adds first.
  map.addLayer(RIDE_REST_LAYER, layerAbove(map, LAYERS.routesLit));
}

/**
 * Whether `rest` (useRideTo's `ridden.rest`) is drawn: a line needs two
 * points. The one rule for the layer and for the dots along the rest
 * (StationLabels), so a dot is paled only where the pale is drawn under it.
 */
export function restDrawn(rest: LngLat[] | null): rest is LngLat[] {
  return !!rest && rest.length > 1;
}

/** Draws `rest`, the line from the picked hintuan to the end (useRideTo's `ridden.rest`); nothing for null. */
export function useRideRest(map: MapLibreMap | null, rest: LngLat[] | null): void {
  // Over the lit line: this waits for the line hook's layers (useLayerReady),
  // whichever hook the page calls first.
  const litReady = useLayerReady(map, LAYERS.routesLit);
  useEffect(() => {
    if (!map || map.getSource(SRC) || !litReady) return;
    addRideRest(map);
  }, [map, litReady]);

  useEffect(() => {
    const src = map?.getSource<GeoJSONSource>(SRC);
    if (!src) return;
    src.setData({
      type: 'FeatureCollection',
      features: restDrawn(rest)
        ? [
            {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: rest },
            },
          ]
        : [],
    });
  }, [map, rest, litReady]);
}
