import type {
  ExpressionSpecification,
  FilterSpecification,
  MapLibreMap,
  SymbolLayerSpecification,
} from 'maplibre-gl';

import { MAP_PAINT } from '@/design-system/foundation/map-colours';

import { HOTSPOT_CONTENT } from './colours';
import { LAYERS } from './layers';
import type { HotspotKind } from '../model/hotspots';

export const LABEL = 'saved-stops-label';
export const HINTUAN_LABEL = LAYERS.hotspotsHintuanLabel;
/** The scale bar's width (MapView's ScaleControl, MapLibre's default maxWidth). */
const SCALE_PX = 100;
/** The most ground the bar's width may cover with the names on. */
const NAMES_WITHIN_M = 700;
/** Metres a pixel spans at zoom 0 over Metro Manila (14.6° N), MapLibre's tiles being 512 px. */
const METRES_PER_PX_AT_ZOOM_0 = (40_075_016.686 * Math.cos((14.6 * Math.PI) / 180)) / 512;

/**
 * Hotspot names, terminals' and hintuans' alike, once the scale bar's width
 * covers 700 m or less (the owner's choice): zoom 13.40. The bar steps 1, 2,
 * 3, 5, so it never reads 700 m: it reads 500 m there, the names coming in
 * halfway through its 500 m. Close in only, but near enough to the overview
 * that a name may sit over the line's stretch through its hotspot; where
 * names meet, MapLibre keeps one. A bar's reading is the zoom's at a given
 * latitude, so the bar's rule is a zoom for a layer here (station-labels.tsx
 * measures it live, for markers). Two layers, one a kind, so each can be set
 * apart.
 */
const NAMES_FROM = Math.log2((METRES_PER_PX_AT_ZOOM_0 * SCALE_PX) / NAMES_WITHIN_M);

/**
 * The label points of one kind, less the one of the hotspot being edited. A
 * label's `ids` are its boxes' ids joined by commas: a GeoJSON array property
 * reaches the style as a string anyway, and an id is a UUID, so `in` is exact.
 */
export const labelsOf = (kind: HotspotKind, hidden = ''): FilterSpecification => {
  const notHidden: ExpressionSpecification[] = hidden
    ? [['!', ['in', hidden, ['get', 'ids']]]]
    : [];
  return ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'kind'], kind], ...notHidden];
};
/**
 * A kind's names' paint (Figma 3837:11308): its content colour, a white halo
 * (Border/plain). One colour a layer, each layer holding one kind's names
 * (labelsOf), rather than a `match` on the kind: the same pixels, and a
 * colour that does not vary by feature is drawn by the GL program the
 * basemap's own names compile at load. A match would be a program of its own,
 * compiled by the first frame that shows a name (a commuter's pinch or a
 * hotspot's glide): 5-50 ms of a cheap phone's main thread.
 */
export function namePaint(kind: HotspotKind) {
  return {
    'text-color': HOTSPOT_CONTENT[kind],
    'text-halo-color': MAP_PAINT['Paint/casing'],
    'text-halo-width': 1,
  } satisfies SymbolLayerSpecification['paint'];
}

/**
 * The two name layers of the hotspots' `source`, the hintuans' under the
 * terminals', added on top of everything.
 */
export function addHotspotLabels(map: Pick<MapLibreMap, 'addLayer'>, source: string): void {
  // Labels go on top of everything: a name is never worth hiding under a line.
  // The terminals' above the hintuans', so where two collide the terminal
  // keeps its name.
  for (const [id, kind] of [
    [HINTUAN_LABEL, 'hintuan'],
    [LABEL, 'terminal'],
  ] as const) {
    map.addLayer({
      id,
      type: 'symbol',
      source,
      minzoom: NAMES_FROM,
      filter: labelsOf(kind),
      // The same size at every zoom; 12, SemiBold as near as the map's fonts
      // come, two lines over some 92 px as drawn, a white halo round it
      // (namePaint).
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 12,
        'text-font': ['Noto Sans Bold'],
        'text-anchor': 'center',
        'text-justify': 'center',
        'text-max-width': 8,
        'text-allow-overlap': false,
      },
      paint: namePaint(kind),
    });
  }
}
