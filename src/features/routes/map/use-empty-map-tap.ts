import type { MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import { useEffect, useRef } from 'react';

import { resolveTap, tapTargets } from './tap';

/**
 * The maps whose empty taps a page answers itself (useEmptyMapTap), each while it does. One page
 * answers for a map at a time: a second caller's cleanup would take the first one's claim.
 */
const answered = new WeakSet<MapLibreMap>();

const NO_LAYERS: readonly string[] = [];

/**
 * Whether a tap on `map` that lands on nothing is the page's to answer: the routes' and the
 * hotspots' taps (use-route-taps.ts, use-hotspot-taps.ts) then let nothing go for it.
 */
export function isEmptyTapAnswered(map: MapLibreMap): boolean {
  return answered.has(map);
}

/**
 * A tap on the map that lands on no route and no hotspot answered by `onEmptyTap`, while there is
 * one; null hands such a tap back to the routes' and the hotspots' own taps, which close what is
 * open. The public map's open trip, which has no ‹: the empty map tapped does what ‹ does, back to
 * the list or the place's card it was opened from (the owner's call), or, opened on its own, its
 * route listed with those sharing an end, where one runs its way.
 */
export function useEmptyMapTap(
  map: MapLibreMap | null,
  onEmptyTap: (() => void) | null,
  /** Layers a page draws and answers itself (the studio's drafts): a tap on one is not empty. */
  ownLayers: readonly string[] = NO_LAYERS,
): void {
  const latest = useRef(onEmptyTap);
  const layers = useRef(ownLayers);
  const isAnswering = onEmptyTap !== null;
  useEffect(() => {
    latest.current = onEmptyTap;
    layers.current = ownLayers;
  });
  useEffect(() => {
    if (!map || !isAnswering) return;
    answered.add(map);
    const handleClick = (e: MapMouseEvent) => {
      if (resolveTap(tapTargets(map, e.point, e.originalEvent)).kind !== 'none') return;
      const own = layers.current.filter((layer) => map.getLayer(layer));
      if (own.length > 0 && map.queryRenderedFeatures(e.point, { layers: own }).length > 0) return;
      latest.current?.();
    };
    map.on('click', handleClick);
    return () => {
      answered.delete(map);
      map.off('click', handleClick);
    };
  }, [map, isAnswering]);
}
