import type { MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import { useEffect, type RefObject } from 'react';

import { ROUTES_HIT_LAYER, bindHover, resolveTap, tapTargets } from './tap';
import type { Highlight } from './use-saved-routes';
import { directionToOpen } from '../model/departures';
import { isLoop, type Direction } from '../model/routes';

/*
 * A tap on the saved directions: what it opens, lists or lets go.
 */

const HIT = ROUTES_HIT_LAYER;

/**
 * Binds the map's click once, and the pointer over a line where a pointer
 * can hover, from when one can (bindHover). The handler reads today's
 * directions, what is shown and whether the editor is drawing through
 * `read`, and answers through the hook's setters (`set`), which never
 * change.
 */
export function useRouteTaps<T extends Direction>(
  map: MapLibreMap | null,
  read: {
    drawing: RefObject<boolean>;
    byId: RefObject<Map<string, T>>;
    shown: RefObject<readonly string[]>;
  },
  set: {
    highlight: (h: Highlight | null) => void;
    selectedId: (id: string | null) => void;
    candidates: (c: T[]) => void;
    back: (b: boolean) => void;
  },
) {
  // Refs and setters: the same each render, so the click is bound once per map.
  const { drawing, byId, shown } = read;
  const {
    highlight: setHighlight,
    selectedId: setSelectedId,
    candidates: setCandidates,
    back: setBack,
  } = set;
  useEffect(() => {
    if (!map || !map.getLayer(HIT)) return;
    const canvas = map.getCanvas();

    // One handler, one box. A finger is wider than a pixel, so we ask what is
    // near the tap: nothing deselects, one route opens its card, several
    // sharing a road go to the list, lit the way round it shows them. Inside
    // a hotspot's box the tap is the hotspot's alone (tapTargets). The candidates are whole routes, slots
    // included, so the studio's rows can say "return not mapped yet".
    // The hotspots hook reads the same tap and keeps its own half.
    const onMapClick = (e: MapMouseEvent) => {
      if (drawing.current) return;
      // Whatever the tap opens, the card picked before it is let go.
      setHighlight(null);
      const out = resolveTap(tapTargets(map, e.point, e.originalEvent));
      const all = [...byId.current.values()];
      if (out.kind === 'route') {
        // The line under the finger wins: where a route's two directions run
        // on different roads, tapping the other one must open it. Where both
        // overlap, the one already shown stays (a tap on the lit Novaliches →
        // Tala must not open Tala → Novaliches); with neither shown, the
        // outbound rule decides.
        const under = out.routeIds.map((id) => byId.current.get(id)).filter((v) => !!v);
        const routeId = under[0]?.routeId;
        const open =
          under.length === 1
            ? under[0]
            : (under.find((v) => shown.current.includes(v.id)) ??
              directionToOpen(all.filter((v) => v.routeId === routeId)));
        setSelectedId(open?.id ?? null);
        setCandidates([]);
      } else if (out.kind === 'several') {
        const keys = new Set(out.routeKeys);
        setSelectedId(null);
        setCandidates(all.filter((v) => keys.has(v.routeId)));
        // The way round under the finger, as for one route: outbound where an
        // outbound line was hit, the way back where only ways back were — so
        // a tap on the light-blue way back switches to it — and, where a line
        // shown was hit, the way round already shown.
        // A loop has no way back to be under the finger: only the two-ended routes decide it.
        const hit = out.routeIds
          .map((id) => byId.current.get(id))
          .filter((v): v is T => !!v && !isLoop(v));
        if (hit.length > 0) {
          const shownHit = hit.find((v) => shown.current.includes(v.id));
          setBack(shownHit ? shownHit.reversed : hit.every((v) => v.reversed));
        }
      } else {
        setSelectedId(null);
        setCandidates([]);
      }
    };
    const enter = () => {
      if (!drawing.current) canvas.style.cursor = 'pointer';
    };
    const leave = () => {
      if (!drawing.current) canvas.style.cursor = '';
    };

    map.on('click', onMapClick);
    // The hand over a line only where a pointer can hover, and from when one
    // can: on a phone each pair would cost a query of the map on every
    // mousemove, a tap's among them (bindHover; a mouse paired later gets it
    // too).
    const unhover = bindHover(map, HIT, enter, leave);
    return () => {
      map.off('click', onMapClick);
      unhover();
    };
  }, [map, drawing, byId, shown, setHighlight, setSelectedId, setCandidates, setBack]);
}
