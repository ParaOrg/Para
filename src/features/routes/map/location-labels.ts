import type {
  FilterSpecification,
  LayerSpecification,
  StyleSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl';
import * as z from 'zod/mini';

import { IS_RAIL_STOP } from './monochrome';
import { isExpressionFilter } from './station-mask';

/**
 * Location Labels, the Map Style card's switch: the basemap's own words
 * (places, streets, POIs, road shields, water and park names) and icons
 * shown or not. Off by default on the public map and the contributor page,
 * so the map reads as Para's: our labels (hintuans, terminals, route codes, a
 * ride's) are drawn from our own GeoJSON sources, or as HTML over the map,
 * and always stay. The basemap's train stations stay too, by their icon alone
 * (isPlaceIcons). On in the studio, where editors draw by the streets.
 *
 * A basemap label is found by what it is, not by a list of names a style
 * update could change: a symbol layer drawn from a source that is not
 * GeoJSON. The basemaps (OpenFreeMap's, on either host) are vector and
 * raster only; everything of ours is GeoJSON (basemap.ts, styleTransform).
 */
export function isBasemapLabel(
  layer: LayerSpecification,
  sources: StyleSpecification['sources'],
): boolean {
  if (layer.type !== 'symbol') return false;
  return sources[layer.source]?.type !== 'geojson';
}

/**
 * A basemap layer that draws places by an icon: one from OpenMapTiles' `poi` source layer with an
 * icon, in an expression filter a station's class can join. With the labels off it keeps its
 * train stations alone (stationIconsOnly). On the real styles: Coloured's `poi_r1`, `poi_r7`
 * and `poi_r20`, which draw the stations among every place by rank, and its `poi_transit`
 * (airports and bus stations, so none of it stays); Monochrome's landmarks
 * (monochrome.ts), which draw no station; Monochrome names its stations without an icon
 * (`detail-rail-stops`) and Dark draws no place icon, so neither keeps one.
 */
export function isPlaceIcons(layer: LayerSpecification): layer is SymbolLayerSpecification {
  if (layer.type !== 'symbol' || layer['source-layer'] !== 'poi') return false;
  if (layer.layout?.['icon-image'] === undefined) return false;
  return layer.filter === undefined || isExpressionFilter(layer.filter);
}

/**
 * A place layer with the labels off: its train stations alone (class `railway`, as the tiles
 * class them: monochrome.ts, IS_RAIL_STOP), by their icon, with no name.
 */
function stationIconsOnly(layer: SymbolLayerSpecification): SymbolLayerSpecification {
  const layout = { ...layer.layout };
  delete layout['text-field'];
  const own = layer.filter;
  const filter: FilterSpecification =
    own === undefined || !isExpressionFilter(own) ? IS_RAIL_STOP : ['all', own, IS_RAIL_STOP];
  return { ...layer, layout, filter };
}

/**
 * The style with its basemap labels hidden but for the stations' icons, or as
 * it came when they are shown. Pure: the input is left alone. Applied to a
 * style fresh from its file, so showing them again keeps a label the style
 * itself hides.
 */
export function withLocationLabels(
  style: StyleSpecification,
  areShown: boolean,
): StyleSpecification {
  if (areShown) return style;
  return {
    ...style,
    layers: style.layers.map((layer) => {
      if (!isBasemapLabel(layer, style.sources)) return layer;
      if (isPlaceIcons(layer)) return stationIconsOnly(layer);
      return { ...layer, layout: { ...layer.layout, visibility: 'none' } };
    }),
  };
}

/** Which page's choice: the public map and the contributor page share one; the studio keeps its own. */
export type LabelsPlace = 'map' | 'studio';

const PREFERENCE: Record<LabelsPlace, { key: string; isShownByDefault: boolean }> = {
  map: { key: 'para.location-labels.v1', isShownByDefault: false },
  studio: { key: 'para.studio.location-labels.v1', isShownByDefault: true },
};

const storedSchema = z.enum(['shown', 'hidden']);

/**
 * Whether this device asked for the basemap's labels on this page: its
 * default unless it chose otherwise. Remembered on the device only, and only
 * a choice away from the default, so a commuter who never touches the switch
 * leaves the browser's storage empty, as the basemap's choice does
 * (basemap.ts).
 */
export function readLocationLabels(place: LabelsPlace): boolean {
  const { key, isShownByDefault } = PREFERENCE[place];
  try {
    const stored = storedSchema.safeParse(localStorage.getItem(key));
    return stored.success ? stored.data === 'shown' : isShownByDefault;
  } catch {
    return isShownByDefault;
  }
}

export function rememberLocationLabels(place: LabelsPlace, areShown: boolean): void {
  const { key, isShownByDefault } = PREFERENCE[place];
  try {
    if (areShown === isShownByDefault) localStorage.removeItem(key);
    else localStorage.setItem(key, areShown ? 'shown' : 'hidden');
  } catch {
    // Private mode or blocked storage: the choice lasts for this page only.
  }
}
