import type { MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import { useEffect, type RefObject } from 'react';

import { MAP_PAINT } from '@/design-system/foundation/map-colours';
import { LAYERS, useLayerReady } from '@/features/routes/map/layers';
import type { LngLat } from '@/shared/utils/geo';

import { DRAW_LINE_WIDTH, HIT_LAYER, POINT_LAYER, isGeoJSON } from './draw-layers';
import type { AreaTarget, Picking } from './drawing-types';
import { previewRoute } from './snap';

/**
 * Snap's live preview: the road from the line's last point to the cursor, as
 * a click there would add it. As the cursor moves, a straight guide to it
 * shows at once, asking nothing; once the cursor has rested for PAUSE_MS the
 * router is asked, through snap.ts's one-a-second queue, and its road
 * replaces the guide. A move or a press calls off whatever is still on its
 * way, and an answer that comes after the drawing or its mode has changed
 * is dropped, so a stale road never paints. A click routes and adds its own
 * stretch; the preview only shows. Over the line or a point, where a click
 * inserts or drags instead of adding, nothing is offered.
 *
 * None in Draw (freehand) or Move, for a hotspot, while a line is picked for Extend,
 * or before anything is drawn; and none on a touch screen, which has no
 * resting cursor.
 */

const SRC = 'draw-preview';
const PREVIEW_LAYER = 'draw-preview-line';

/**
 * How long the cursor rests before the router is asked: shorter would ask at
 * every slowing of a sweep. The queue in snap.ts still spaces the asks a
 * second apart.
 */
const PAUSE_MS = 120;

const EMPTY = { type: 'FeatureCollection', features: [] } as const;

/** What the preview reads at the moment the cursor rests: the drawing's own refs. */
export interface SnapPreviewRefs {
  points: RefObject<LngLat[]>;
  freehand: RefObject<boolean>;
  moving: RefObject<boolean>;
  area: RefObject<AreaTarget | null>;
  picking: RefObject<Picking | null>;
  join: RefObject<LngLat | null>;
}

/**
 * Where a click would route from: the last point, or the one just ahead of a
 * borrowed end, where clicks go in. Null when Snap would add nothing to route.
 */
export function previewFrom(
  points: readonly LngLat[],
  join: LngLat | null,
  isSnapping: boolean,
): LngLat | null {
  if (!isSnapping || points.length === 0) return null;
  const at = join ? points.indexOf(join) : -1;
  if (at === -1) return points[points.length - 1];
  return at > 0 ? points[at - 1] : null;
}

/**
 * The preview. `controlPoints` and `isFreehand` are the drawing's state: any
 * change to either (a key's undo, F for Draw) calls off what is offered, as a
 * move does.
 */
export function useSnapPreview(
  map: MapLibreMap | null,
  isDrawing: boolean,
  controlPoints: readonly LngLat[],
  isFreehand: boolean,
  refs: SnapPreviewRefs,
): void {
  const isCasingReady = useLayerReady(map, LAYERS.drawCasing);

  useEffect(() => {
    if (!map || !isCasingReady || map.getSource(SRC)) return;
    map.addSource(SRC, { type: 'geojson', data: EMPTY });
    // Under the line's casing: the line drawn always sits over the road offered.
    map.addLayer(
      {
        id: PREVIEW_LAYER,
        type: 'line',
        source: SRC,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': MAP_PAINT['Paint/draw-preview'],
          'line-width': DRAW_LINE_WIDTH,
          // The one dashed line in the drawing: offered, not yet drawn.
          'line-dasharray': [2, 1.5],
        },
      },
      LAYERS.drawCasing,
    );
  }, [map, isCasingReady]);

  useEffect(() => {
    const src = map?.getSource(SRC);
    if (!map || !isDrawing || !isCasingReady || !isGeoJSON(src)) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let asking: AbortController | null = null;
    const stop = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      asking?.abort();
      asking = null;
      src.setData(EMPTY);
    };
    const fromNow = () =>
      previewFrom(
        refs.points.current,
        refs.join.current,
        !refs.freehand.current &&
          !refs.moving.current &&
          !refs.area.current &&
          !refs.picking.current,
      );
    const show = (line: LngLat[]) =>
      src.setData({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } },
        ],
      });
    const ask = async (from: LngLat, to: LngLat) => {
      const controller = new AbortController();
      asking = controller;
      let line: LngLat[];
      try {
        line = await previewRoute(from, to, controller.signal);
      } catch {
        // Refused, unreachable or called off: no road to offer, so the
        // straight guide stays, which is what a click there draws if the
        // router refuses it too. A click asks the router for itself.
        return;
      }
      // Called off, or the drawing moved on while the router answered.
      if (controller.signal.aborted || fromNow() !== from) return;
      show(line);
    };
    const handleMove = (e: MapMouseEvent) => {
      stop();
      // A button held is a drag, of a point or of the map: nothing to offer.
      if (e.originalEvent.buttons !== 0) return;
      // Over the line a click inserts a point, over a point it drags: it adds no stretch.
      if (map.queryRenderedFeatures(e.point, { layers: [POINT_LAYER, HIT_LAYER] }).length > 0)
        return;
      const from = fromNow();
      if (!from) return;
      const to: LngLat = [e.lngLat.lng, e.lngLat.lat];
      // The straight guide at once, until the road comes.
      show([from, to]);
      timer = setTimeout(() => {
        timer = null;
        void ask(from, to);
      }, PAUSE_MS);
    };

    map.on('mousemove', handleMove);
    map.on('mousedown', stop);
    map.on('mouseout', stop);
    return () => {
      map.off('mousemove', handleMove);
      map.off('mousedown', stop);
      map.off('mouseout', stop);
      stop();
    };
  }, [map, isDrawing, isCasingReady, controlPoints, isFreehand, refs]);
}
