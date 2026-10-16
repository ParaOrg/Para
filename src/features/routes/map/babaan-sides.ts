import type { GeoJSONSource, MapLibreMap } from 'maplibre-gl';
import { useEffect, useMemo } from 'react';

import { bboxOf, bboxesOverlap, lineBounds } from '@/shared/utils/geo';

import { HOTSPOT_COLOUR } from './colours';
import { LAYERS, useLayerReady } from './layers';
import { rightOfLine } from '../geo/right-of-line';
import { ringToPolygon, type Ring } from '../geo/ring';
import { hotspotRing, type Hotspot } from '../model/hotspots';
import { travelLine } from '../model/ride';
import { isLineMode, type Direction } from '../model/routes';
import { inPassingOrder, listedAlong, passedAt } from '../model/timeline';

/**
 * The babaan side: on the chosen direction, each hintuan box it cuts across
 * is drawn again on the line's right only — the owner's rule: the babaan is
 * on the right of the road in the direction of travel, papunta and balikan
 * alike. A box beside the road is not cut (`rightOfLine` is null) and stays
 * as it is. The chosen direction only: with every route showing, a box
 * crossed by several lines would be cut into strips. Not for a train or the
 * ferry: a platform or a pier has no side of the road to get off on.
 *
 * TODO: the look is a placeholder until the owner designs it: the hintuan
 * green, stronger.
 */

const SRC = 'babaan-side';
const FILL = 'babaan-side-fill';
const EDGE = 'babaan-side-edge';
/** Under the route lines, over the boxes, as the boxes are (useSavedHotspots). */
const ROUTES_ABOVE = LAYERS.routesCasing;

/**
 * The babaan sides' source and layers, added to `map` under the routes'
 * casing, which must be there: what useBabaanSides adds, apart so a unit
 * check can read it (map-sources-test).
 */
export function addBabaanSides(map: Pick<MapLibreMap, 'addSource' | 'addLayer'>): void {
  map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer(
    {
      id: FILL,
      type: 'fill',
      source: SRC,
      paint: { 'fill-color': HOTSPOT_COLOUR.hintuan, 'fill-opacity': 0.55 },
    },
    ROUTES_ABOVE,
  );
  map.addLayer(
    {
      id: EDGE,
      type: 'line',
      source: SRC,
      layout: { 'line-join': 'round' },
      paint: { 'line-color': HOTSPOT_COLOUR.hintuan, 'line-width': 2 },
    },
    ROUTES_ABOVE,
  );
}

export function useBabaanSides(
  map: MapLibreMap | null,
  chosen: Direction | null,
  hotspots: readonly Hotspot[],
): void {
  const casingReady = useLayerReady(map, ROUTES_ABOVE);
  useEffect(() => {
    if (!map || map.getSource(SRC) || !casingReady) return;
    addBabaanSides(map);
  }, [map, casingReady]);

  const features = useMemo(() => babaanSideFeatures(chosen, hotspots), [chosen, hotspots]);

  useEffect(() => {
    const src = map?.getSource(SRC) as GeoJSONSource | undefined;
    src?.setData({ type: 'FeatureCollection', features });
  }, [map, features, casingReady]);
}

/**
 * The chosen direction's babaan sides, as the map draws them: each hintuan
 * box it passes and cuts across (hintuansAlong, rightOfLine), its half on
 * the line's right, in the order the line reaches them. None for a train or
 * the ferry, or with nothing chosen.
 *
 * The cut is asked first, and only of the boxes the line's own box reaches (a
 * metre wider, as rightOfLine pads its own); where along the line, of only
 * the boxes it cuts. It is worked out in the render of a trip tap, before its
 * card paints. Against placing every listed hintuan along the whole line and
 * then cutting, measured 27 -> 7 ms of Node at full speed on the first trip
 * of a visit (Bagong Silang Kanan 5 → Philcoa). In a browser at CPU 4x, on
 * three trips opened one after another (5 runs, medians [min-max], this
 * function and all it calls), measured 60 [46-70] -> 35 [28-41] ms on the
 * first, 26 -> 9 and 16 -> 9 ms on the next two: a cheap phone's first trip
 * of a visit gains about 25 ms. The same features in the same order: a box
 * the line's box misses is crossed by none of the line, nor by a carry, which
 * starts at an end inside the box; a box listed but not cut was dropped
 * either way; and the sort is stable, as hintuansAlong's is. babaan-side-test
 * holds the two against each other, word for word, on the committed map and
 * on made-up directions.
 */
export function babaanSideFeatures(chosen: Direction | null, hotspots: readonly Hotspot[]) {
  if (!chosen || isLineMode(chosen.route?.mode)) return [];
  const line = travelLine(chosen, hotspots);
  const reach = lineBounds(line);
  const cut: { hotspot: Hotspot; side: Ring; index: number; at: number }[] = [];
  for (const hotspot of hotspots) {
    if (!listedAlong(hotspot, chosen.route)) continue;
    const ring = hotspotRing(hotspot);
    if (!bboxesOverlap(reach, bboxOf(ring, 1))) continue;
    const side = rightOfLine(ring, line);
    const where = side && passedAt(line, ring, hotspot);
    if (side && where) cut.push({ hotspot, side, ...where });
  }
  return cut.sort(inPassingOrder).map(({ hotspot, side }) => ({
    type: 'Feature' as const,
    properties: { id: hotspot.id },
    geometry: ringToPolygon(side),
  }));
}
