import type { MapLibreMap } from 'maplibre-gl';
import { useState } from 'react';

import type { LngLat } from '@/shared/utils/geo';

import { checkSpots } from './check-spots';
import { fitToLine } from './fit-to-line';
import type { OsmRoute } from './osm-route-schema';
import { seedPoints, type RouteLine } from './seed-points';
import type { Drawing } from '../drawing/use-drawing';

/** The part of a drawing the start needs. */
export type StartableDrawing = Pick<Drawing, 'drawing' | 'startWithPoints' | 'line'>;

/** A route's empty slot a picker was opened for: the drawing it starts fills that slot. */
export interface StartSlot {
  routeId: string;
}

interface UseOsmRouteStartOptions {
  map: MapLibreMap | null;
  draw: StartableDrawing;
  /** Says something in the Playground's toast. */
  setNotice: (text: string | null) => void;
  /** Hears a drawing begun into a slot, with the line it was seeded from. */
  onSlotStart?: (routeId: string, line: readonly LngLat[]) => void;
}

/** The route a drawing came from, and the part of its line it was seeded with. */
interface OsmStart {
  route: OsmRoute;
  part: RouteLine;
}

/**
 * "Start from OSM route" (.scratch/osm-route-start/plan.md): the picker's open state, and a drawing
 * begun from an OSM route, its control points seeded from the route's line (seed-points.ts) as an
 * upload's are (useContributionStart). Held only while that drawing lasts; nothing is saved by it.
 */
export function useOsmRouteStart({ map, draw, setNotice, onSlotStart }: UseOsmRouteStartOptions) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [slot, setSlot] = useState<StartSlot | null>(null);
  const [start, setStart] = useState<OsmStart | null>(null);
  // The drawing ended (saved, cancelled): so did where it came from.
  if (!draw.drawing && start) setStart(null);
  // A drawing begun elsewhere while a slot's picker was open leaves that slot: the picker must not
  // come back afterwards still filling it.
  if (draw.drawing && !start && slot) {
    setSlot(null);
    setIsPickerOpen(false);
  }

  /** Begins the drawing from a route, or one half of one that goes out and back. */
  const begin = (route: OsmRoute, part: RouteLine = route) => {
    if (draw.drawing) {
      setNotice('Finish or cancel the drawing in progress first, then start again.');
      return;
    }
    fitToLine(map, part.line);
    setIsPickerOpen(false);
    setStart({ route, part });
    draw.startWithPoints(seedPoints(part), slot?.routeId ?? null);
    if (slot) onSlotStart?.(slot.routeId, part.line);
  };

  return {
    isPickerOpen,
    /** The slot the picker is open for; null for a new route. */
    slot,
    /** Opens the picker for a new route, or, given one, for a route's empty slot. */
    openPicker: (forSlot: StartSlot | null = null) => {
      setSlot(forSlot);
      setIsPickerOpen(true);
    },
    closePicker: () => setIsPickerOpen(false),
    route: start?.route ?? null,
    /** The places to check in the drawing as it stands (check-spots.ts). */
    spots: start ? checkSpots(draw.line, start.part) : [],
    begin,
    forget: () => setStart(null),
  };
}

export type OsmRouteStart = ReturnType<typeof useOsmRouteStart>;
