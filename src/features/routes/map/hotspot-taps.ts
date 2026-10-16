import type { MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import { useEffect, type RefObject } from 'react';

import { ROUTES_HIT_LAYER, HOTSPOTS_FILL_LAYER, bindHover, resolveTap, tapTargets } from './tap';
import type { Hotspot } from '../model/hotspots';

/*
 * A tap on the saved hotspots: what it opens, lists or lets go. Split from
 * use-saved-hotspots.ts, 2026-09-29.
 */

const FILL = HOTSPOTS_FILL_LAYER;
const ROUTES_HIT = ROUTES_HIT_LAYER;

/**
 * Binds the map's click once, and the pointer over a box where a pointer
 * can hover, from when one can (bindHover). The handler reads today's
 * hotspots and whether the editor is drawing through `read`, and answers
 * through the hook's setters (`set`), which never change.
 */
export function useHotspotTaps<S extends Hotspot>(
  map: MapLibreMap | null,
  read: { drawing: RefObject<boolean>; byId: RefObject<Map<string, S>> },
  set: { selectedId: (id: string | null) => void; candidates: (c: S[]) => void },
) {
  // Refs and setters: the same each render, so the click is bound once per map.
  const { drawing, byId } = read;
  const { selectedId: setSelectedId, candidates: setCandidates } = set;
  useEffect(() => {
    if (!map || !map.getLayer(FILL)) return;
    const canvas = map.getCanvas();

    // Over a route line, the pointer is the line's (the routes hook sets it).
    const routeUnder = (e: MapMouseEvent) =>
      map.getLayer(ROUTES_HIT) &&
      map.queryRenderedFeatures(e.point, { layers: [ROUTES_HIT] }).length > 0;

    // One handler, one box, sized for the finger: nothing deselects, one
    // hotspot opens its card, several side by side go to the sheet. A tap
    // inside a box is the hotspot's alone, a route through it or not
    // (tapTargets); the routes hook reads the same tap and keeps its half.
    const onMapClick = (e: MapMouseEvent) => {
      if (drawing.current) return;
      const out = resolveTap(tapTargets(map, e.point, e.originalEvent));
      if (out.kind === 'hotspot') {
        setSelectedId(out.hotspotId);
        setCandidates([]);
      } else if (out.kind === 'several') {
        setSelectedId(null);
        setCandidates(out.hotspotIds.map((id) => byId.current.get(id)).filter((s) => !!s));
      } else {
        setSelectedId(null);
        setCandidates([]);
      }
    };
    const enter = (e: MapMouseEvent) => {
      if (!drawing.current && !routeUnder(e)) canvas.style.cursor = 'pointer';
    };
    const leave = () => {
      if (!drawing.current) canvas.style.cursor = '';
    };

    map.on('click', onMapClick);
    // The hand over a box only where a pointer can hover, and from when one
    // can, as over a line (route-taps.ts; bindHover, 2026-10-04 and
    // 2026-10-05).
    const unhover = bindHover(map, FILL, enter, leave);
    return () => {
      map.off('click', onMapClick);
      unhover();
    };
  }, [map, drawing, byId, setSelectedId, setCandidates]);
}
