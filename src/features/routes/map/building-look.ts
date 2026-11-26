import type { FillExtrusionLayerSpecification, MapLibreMap } from 'maplibre-gl';

import type { ViewMode } from './view-mode';

/**
 * Each building extrusion's height and base as its design draws them, kept by the layer itself: a
 * design switched in (applyBasemap) brings new layers, read afresh.
 */
type Paint = NonNullable<FillExtrusionLayerSpecification['paint']>;
const DESIGNED = new WeakMap<
  object,
  { height: Paint['fill-extrusion-height']; base: Paint['fill-extrusion-base'] }
>();

/**
 * The buildings as the view says (the owner's rule, 2026-11-26): in 2D flat footprints, as on
 * Google's default map, however the map is tilted by hand; in 3D standing as the design raises
 * them. Every design's `fill-extrusion` layers, the only ones that raise anything.
 */
export function drawBuildingsFor(map: MapLibreMap, mode: ViewMode): void {
  for (const spec of map.getStyle()?.layers ?? []) {
    if (spec.type !== 'fill-extrusion') continue;
    const { id } = spec;
    const layer = map.getLayer(id);
    if (!layer) continue;
    // Read once, as the design has it: after this the style holds what was set here.
    let designed = DESIGNED.get(layer);
    if (!designed) {
      designed = {
        height: spec.paint?.['fill-extrusion-height'],
        base: spec.paint?.['fill-extrusion-base'],
      };
      DESIGNED.set(layer, designed);
    }
    map.setPaintProperty(id, 'fill-extrusion-height', mode === '2d' ? 0 : designed.height);
    map.setPaintProperty(id, 'fill-extrusion-base', mode === '2d' ? 0 : designed.base);
  }
}
