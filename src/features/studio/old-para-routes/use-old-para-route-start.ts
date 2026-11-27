import type { MapLibreMap } from 'maplibre-gl';
import { useState } from 'react';

import type { LngLat } from '@/shared/utils/geo';

import type { OldParaRoute, OldParaRouteSummary } from './old-para-route-schema';
import { checkSpots } from '../osm-routes/check-spots';
import { seedPoints, type RouteLine } from '../osm-routes/seed-points';
import { fitToLine, type StartableDrawing } from '../osm-routes/use-osm-route-start';

interface UseOldParaRouteStartOptions {
  map: MapLibreMap | null;
  draw: StartableDrawing;
  /** Says something in the Playground's toast. */
  setNotice: (text: string | null) => void;
}

/** The route a drawing came from: the part of its line it was seeded with, or, with no line, its end. */
export interface OldParaStart {
  paraId: string;
  name: string;
  part: RouteLine | null;
  /** Where a route with no line ends, for the editor to draw to. */
  end: LngLat | null;
}

/**
 * "Start from an old Para route" (.scratch/old-para-routes/spec.md), as "Start from OSM route"
 * (useOsmRouteStart): the picker's open state, and a drawing begun from a route. A route with a
 * line seeds the drawing's control points from it; one without places its start, and its end is
 * marked for the editor to draw to. Held only while that drawing lasts; nothing is saved by it.
 */
export function useOldParaRouteStart({ map, draw, setNotice }: UseOldParaRouteStartOptions) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [start, setStart] = useState<OldParaStart | null>(null);
  // The drawing ended (saved, cancelled): so did where it came from.
  if (!draw.drawing && start) setStart(null);

  const canBegin = () => {
    if (!draw.drawing) return true;
    setNotice('Finish or cancel the drawing in progress first, then start again.');
    return false;
  };

  /** Begins the drawing from a route's line, or one half of one that goes out and back. */
  const beginFromLine = (route: OldParaRoute, part: RouteLine = route) => {
    if (!canBegin()) return;
    fitToLine(map, part.line);
    setIsPickerOpen(false);
    setStart({ paraId: route.paraId, name: route.name, part, end: null });
    draw.startWithPoints(seedPoints(part));
  };

  /** Begins the drawing of a route with no line: its start placed, where the old app knew it. */
  const beginFromEnds = (route: OldParaRouteSummary) => {
    if (!canBegin()) return;
    fitToLine(
      map,
      [route.start, route.end].filter((end) => end !== null),
    );
    setIsPickerOpen(false);
    setStart({ paraId: route.paraId, name: route.name, part: null, end: route.end });
    draw.startWithPoints(route.start ? [route.start] : []);
  };

  return {
    isPickerOpen,
    openPicker: () => setIsPickerOpen(true),
    closePicker: () => setIsPickerOpen(false),
    start,
    /** The places to check in the drawing as it stands (check-spots.ts); none with no line. */
    spots: start?.part ? checkSpots(draw.line, start.part) : [],
    beginFromLine,
    beginFromEnds,
    forget: () => setStart(null),
  };
}

export type OldParaRouteStart = ReturnType<typeof useOldParaRouteStart>;
