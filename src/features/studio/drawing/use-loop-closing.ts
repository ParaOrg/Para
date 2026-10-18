import type { GeoJSONSource, MapLibreMap, Source } from 'maplibre-gl';
import { useCallback, useEffect, useMemo } from 'react';

import { MAP_PAINT } from '@/design-system/foundation/map-colours';
import { LAYERS } from '@/features/routes/map/layers';
import type { Hotspot } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import type { LngLat } from '@/shared/utils/geo';

import { ROUTE_COLOUR } from './draw-layers';
import { loopClosingPoint, outboundFeatures, outboundFor, returnTripStart } from './loop-closing';
import type { Drawing } from './use-drawing';

/*
 * Closing a route's loop while its other way is drawn: the return trip starts
 * on the outbound line's last point, the outbound shows faintly under the
 * drawing with its two ends marked, and the toolbar can end the line on the
 * outbound's first point. The rules are loop-closing.ts's; this lays them on
 * the map and hands the studio what it needs.
 */

const OUTBOUND_SRC = 'draw-outbound';
const OUTBOUND_LINE = 'draw-outbound-line';
const OUTBOUND_START = 'draw-outbound-start';
const OUTBOUND_END = 'draw-outbound-end';

const isGeoJSON = (source: Source | undefined): source is GeoJSONSource =>
  source?.type === 'geojson';

/** The outbound line's source and layers, laid once, under the drawing's own. */
function addOutboundLayers(map: MapLibreMap): void {
  if (map.getSource(OUTBOUND_SRC)) return;
  map.addSource(OUTBOUND_SRC, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });
  const under = map.getLayer(LAYERS.drawCasing) ? LAYERS.drawCasing : undefined;
  map.addLayer(
    {
      id: OUTBOUND_LINE,
      type: 'line',
      source: OUTBOUND_SRC,
      filter: ['==', ['get', 'role'], 'line'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ROUTE_COLOUR, 'line-width': 5, 'line-opacity': 0.3 },
    },
    under,
  );
  // Where it began (the loop closes here): a ring. Where it ended (the return trip
  // starts here): a dot. Shape tells them apart, not colour.
  map.addLayer(
    {
      id: OUTBOUND_START,
      type: 'circle',
      source: OUTBOUND_SRC,
      filter: ['==', ['get', 'role'], 'start'],
      paint: {
        'circle-radius': 10,
        'circle-color': MAP_PAINT['Paint/casing'],
        'circle-opacity': 0.7,
        'circle-stroke-color': ROUTE_COLOUR,
        'circle-stroke-width': 3,
        'circle-stroke-opacity': 0.6,
      },
    },
    under,
  );
  map.addLayer(
    {
      id: OUTBOUND_END,
      type: 'circle',
      source: OUTBOUND_SRC,
      filter: ['==', ['get', 'role'], 'end'],
      paint: {
        'circle-radius': 7,
        'circle-color': ROUTE_COLOUR,
        'circle-opacity': 0.6,
        'circle-stroke-color': MAP_PAINT['Paint/casing'],
        'circle-stroke-width': 2,
      },
    },
    under,
  );
}

/** What the toolbar needs to end a return trip on the outbound's first point. */
export interface LoopPlan {
  closeAt: LngLat;
  /** The way already drawn, which the toolbar's words name. */
  other: 'papunta' | 'pabalik';
}

/**
 * Lays the outbound line under a return trip being drawn, and says where the
 * loop closes. `routeId` is the route whose empty slot the drawing fills (null
 * for anything else), `slotReversed` which way that slot runs. `startReturnTrip`
 * begins that drawing with its first point already on the outbound line's last.
 */
export function useLoopClosing(
  map: MapLibreMap | null,
  draw: Drawing,
  routeId: string | null,
  slotReversed: boolean | null,
  directions: readonly DirectionRow[],
  hotspots: readonly Hotspot[],
): { loop: LoopPlan | null; startReturnTrip: (routeId: string) => void } {
  const { drawing, area, picking, start, addPoint } = draw;
  const outbound = useMemo(
    () =>
      drawing && !area && !picking && routeId ? outboundFor(directions, routeId, hotspots) : null,
    [drawing, area, picking, routeId, directions, hotspots],
  );

  useEffect(() => {
    if (!map) return;
    addOutboundLayers(map);
    const source = map.getSource(OUTBOUND_SRC);
    if (isGeoJSON(source)) source.setData(outboundFeatures(outbound));
  }, [map, outbound]);

  const startReturnTrip = useCallback(
    (forRouteId: string) => {
      start(forRouteId);
      const first = returnTripStart(outboundFor(directions, forRouteId, hotspots) ?? []);
      if (first) void addPoint(first);
    },
    [start, addPoint, directions, hotspots],
  );

  const closeAt = outbound && loopClosingPoint(outbound);
  const other = slotReversed === false ? 'pabalik' : 'papunta';
  return { loop: closeAt ? { closeAt, other } : null, startReturnTrip };
}
