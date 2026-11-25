import type { MapLibreMap } from 'maplibre-gl';
import { useState } from 'react';

import { bboxOf } from '@/shared/utils/geo';

import { checkSpots } from './check-spots';
import type { OsmRoute } from './osm-route-schema';
import { seedPoints, type RouteLine } from './seed-points';
import type { Drawing } from '../drawing/use-drawing';

/** The part of a drawing the start needs. */
type StartableDrawing = Pick<Drawing, 'drawing' | 'startWithPoints' | 'line'>;

interface UseOsmRouteStartOptions {
  map: MapLibreMap | null;
  draw: StartableDrawing;
  /** Says something in the Playground's toast. */
  setNotice: (text: string | null) => void;
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
export function useOsmRouteStart({ map, draw, setNotice }: UseOsmRouteStartOptions) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [start, setStart] = useState<OsmStart | null>(null);
  // The drawing ended (saved, cancelled): so did where it came from.
  if (!draw.drawing && start) setStart(null);

  /** Begins the drawing from a route, or one half of one that goes out and back. */
  const begin = (route: OsmRoute, part: RouteLine = route) => {
    if (draw.drawing) {
      setNotice('Finish or cancel the drawing in progress first, then start again.');
      return;
    }
    const [west, south, east, north] = bboxOf(part.line);
    map?.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 80, maxZoom: 17, duration: 0 },
    );
    setIsPickerOpen(false);
    setStart({ route, part });
    draw.startWithPoints(seedPoints(part));
  };

  return {
    isPickerOpen,
    openPicker: () => setIsPickerOpen(true),
    closePicker: () => setIsPickerOpen(false),
    route: start?.route ?? null,
    /** The places to check in the drawing as it stands (check-spots.ts). */
    spots: start ? checkSpots(draw.line, start.part) : [],
    begin,
    forget: () => setStart(null),
  };
}

export type OsmRouteStart = ReturnType<typeof useOsmRouteStart>;
