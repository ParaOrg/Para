import type { MapLibreMap } from 'maplibre-gl';
import { useCallback, useEffect, useMemo } from 'react';

import { MAP_PAINT } from '@/design-system/foundation/map-colours';
import { LAYERS } from '@/features/routes/map/layers';
import type { Hotspot } from '@/features/routes/model/hotspots';
import { isLoop, type DirectionRow } from '@/features/routes/model/routes';
import type { LngLat } from '@/shared/utils/geo';

import { ROUTE_COLOUR, isGeoJSON } from './draw-layers';
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

/** What the toolbar needs to end a line where something began. */
export interface LoopPlan {
  closeAt: LngLat;
  /** The way already drawn, which the toolbar's words name; null for a line that closes on its own first point. */
  other: 'papunta' | 'pabalik' | null;
}

/**
 * Lays the outbound line under a return trip being drawn, and says where the
 * loop closes. `routeId` is the route whose empty slot the drawing fills (null
 * for anything else), `slotReversed` which way that slot runs. `startReturnTrip`
 * begins that drawing with its first point already on the outbound line's last.
 *
 * A new route, or a loop being edited, has no other way to join: it closes on
 * its own first point, so a line can go round and end where it began.
 */
export function useLoopClosing(
  map: MapLibreMap | null,
  draw: Drawing,
  routeId: string | null,
  slotReversed: boolean | null,
  directions: readonly DirectionRow[],
  hotspots: readonly Hotspot[],
): { loop: LoopPlan | null; startReturnTrip: (routeId: string) => void } {
  const { drawing, area, picking, start, addPoint, target, controlPoints, hasJoin } = draw;
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

  const editedLoop = target.directionId
    ? directions.find((v) => v.id === target.directionId)
    : undefined;
  // A line drawn up to a kept borrowed end (Extend) ends on another line, never a loop.
  const ownStart =
    !!drawing &&
    !area &&
    !picking &&
    !routeId &&
    !hasJoin() &&
    (target.directionId === null ? target.routeId === null : !!editedLoop && isLoop(editedLoop));
  const first = controlPoints[0];
  // A copy: the drawing finds its points by identity, so the stored one would be taken for itself.
  if (ownStart && first)
    return { loop: { closeAt: [first[0], first[1]], other: null }, startReturnTrip };

  const closeAt = outbound && loopClosingPoint(outbound);
  const other = slotReversed === false ? 'pabalik' : 'papunta';
  return { loop: closeAt ? { closeAt, other } : null, startReturnTrip };
}
