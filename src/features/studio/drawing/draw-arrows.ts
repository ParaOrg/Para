import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useMemo, useRef } from 'react';

import { MAP_COLOURS } from '@/design-system/foundation/map-colours';
import { flowChevrons, type FlowClock } from '@/features/routes/map/direction-arrows';
import { useLayerReady } from '@/features/routes/map/layers';
import type { LngLat, Segment } from '@/shared/utils/geo';

import { DRAW_LINE_WIDTH, HIT_LAYER, isGeoJSON } from './draw-layers';
import type { AreaTarget } from './drawing-types';

/**
 * Which way the line being drawn goes: the public map's moving chevrons
 * (flowChevrons), on its drawn stretches, routed and Draw's (straight or
 * curved) alike. A stand-in waiting for the router has none, not being road
 * yet; a hotspot has none, having no way. Snap's preview and Draw's line to
 * the cursor are other sources, with none: they are offered, not drawn.
 */

const SRC = 'draw-arrows';
export const ARROW_LAYER = 'draw-arrow-chevrons';

/** Cut to the drawn line's own width, which does not change with the zoom. */
const drawAcross = () => DRAW_LINE_WIDTH;

/**
 * The runs of drawn segments, each one line in drawing order: a chevron's
 * spacing carries on across a join instead of starting afresh at every point.
 * Empty for a hotspot.
 */
export function drawnRuns(
  segments: readonly (Segment | undefined)[],
  area: AreaTarget | null,
  isStandIn: (segment: Segment) => boolean = () => false,
): LngLat[][] {
  if (area) return [];
  const runs: LngLat[][] = [];
  let run: LngLat[] | null = null;
  for (const s of segments) {
    if (!s || s.coordinates.length < 2 || isStandIn(s)) {
      run = null;
      continue;
    }
    if (!run) {
      run = [...s.coordinates];
      runs.push(run);
    } else {
      run.push(...s.coordinates.slice(1));
    }
  }
  return runs;
}

/**
 * Chevrons flowing along the drawing's drawn stretches, from its first point
 * to its last. An edit carries the flow on from where it was rather than
 * starting the chevrons again from the line's start.
 */
export function useDrawArrows(
  map: MapLibreMap | null,
  segments: readonly (Segment | undefined)[],
  area: AreaTarget | null,
  isStandIn: (segment: Segment) => boolean,
): void {
  const runs = useMemo(() => drawnRuns(segments, area, isStandIn), [segments, area, isStandIn]);
  const clock = useRef<FlowClock>({ flowed: 0 });
  // Over the line, under its hit area and points: the drawing's layers come first.
  const isHitReady = useLayerReady(map, HIT_LAYER);

  useEffect(() => {
    if (!map || !isHitReady || map.getSource(SRC)) return;
    map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer(
      {
        id: ARROW_LAYER,
        type: 'fill',
        source: SRC,
        paint: { 'fill-color': MAP_COLOURS['Map/RouteLine/Arrow/Rest'] },
      },
      HIT_LAYER,
    );
  }, [map, isHitReady]);

  useEffect(() => {
    const src = map?.getSource(SRC);
    if (!map || !isHitReady || !isGeoJSON(src)) return;
    return flowChevrons(map, src, runs, drawAcross, clock.current);
  }, [map, isHitReady, runs]);
}
