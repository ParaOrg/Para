import type { ExpressionSpecification, MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef } from 'react';

import type { LayerSwitch } from './layer-switch';
import { LAYERS } from './layers';

/**
 * Two looks and no opacity: every direction rests in
 * Map/RouteLine/surface-default, opaque, in its white casing (a train's in
 * its own line's pale, RAIL_AT_REST); the lit ones — the trip open, the
 * Selected card's directions, or else every direction a list or a hotspot's
 * card shows — are drawn again on top in Map/RouteLine/surface-selected,
 * thicker; on the public map a picked card's, or an open trip's, wear that
 * card's Card/<livery>/surface instead (useLitLineColour, the owner's call).
 * See-through lines stacked on a shared road read as one muddle, so nothing
 * fades (the owner's call): a direction is either at rest or lit.
 *
 * What a tap lights is kept as MapLibre feature state (`setFeatureState`)
 * rather than as a filter or a paint expression naming ids. The paint
 * expressions below read it and never change, and a change of feature state
 * repaints only the features whose state changed, on the main thread;
 * whereas a new filter, or a new expression in a data-driven paint
 * property, has MapLibre lay out every tile of the source again in its
 * worker — for 1,000 directions, a second and a half of stall a tap
 * (measured).
 */
const isLit: ExpressionSpecification = ['boolean', ['feature-state', 'lit'], false];

/**
 * The opacity of a layer that draws the lit directions only: 1 for them, 0
 * for the rest — a switch, never a shade.
 */
export function litOpacity(): ExpressionSpecification {
  return ['case', isLit, 1, 0];
}

/**
 * Lights exactly `lit` on `source` and nothing else, changing only what
 * changed since the last call. Never `removeFeatureState`: a removal and a
 * set of the same id in one frame leave the removal in charge. `ready` is
 * for a source added once another hook's layer is there (useLayerReady):
 * the lighting is applied when it arrives, not only when `lit` changes.
 * `switched`, the layers that draw only what is lit, are switched on with
 * anything lit and off with nothing, here with the feature state, so the
 * two reach the screen in one frame (layer-switch.ts).
 */
export function useLighting(
  map: MapLibreMap | null,
  source: string,
  lit: readonly string[],
  ready = true,
  switched?: LayerSwitch,
) {
  const was = useRef(new Set<string>());
  useEffect(() => {
    if (!map || !ready || !map.getSource(source)) return;
    const now = new Set(lit);
    for (const id of was.current)
      if (!now.has(id)) map.setFeatureState({ source, id }, { lit: false });
    for (const id of now)
      if (!was.current.has(id)) map.setFeatureState({ source, id }, { lit: true });
    was.current = now;
    switched?.set(map, now.size > 0);
  }, [map, source, lit, ready, switched]);
}

/**
 * The colour the lit directions are drawn in, over the rest: the selected
 * blue unless the public map says otherwise — a picked card's, an open
 * trip's (livery-line.ts). A paint property, set once per change: every lit
 * line wears the same colour at a time.
 */
export function useLitLineColour(map: MapLibreMap | null, colour: string) {
  useEffect(() => {
    if (!map || !map.getLayer(LAYERS.routesLit)) return;
    map.setPaintProperty(LAYERS.routesLit, 'line-color', colour);
  }, [map, colour]);
}
