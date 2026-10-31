import type { LayerSpecification, StyleSpecification, SymbolLayerSpecification } from 'maplibre-gl';
import * as z from 'zod/mini';

/**
 * Location Labels, the Map Style card's switch: the basemap's own words
 * (places, streets, POIs, road shields, water and park names) and icons
 * shown or not. Off by default on the public map and the contributor page,
 * so the map reads as Para's: our labels (hintuans, terminals, route codes, a
 * ride's) are drawn from our own GeoJSON sources, or as HTML over the map,
 * and always stay. The basemap's train stations stay too, by their icon alone
 * (isStationIcons). On in the studio, where editors draw by the streets.
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

/** The class OpenMapTiles' `poi` layer gives a train station, as the styles' own filters name it. */
const RAIL_CLASS = 'rail';

/**
 * A basemap layer that draws train stations by an icon: one from the `poi`
 * source layer with an icon, whose filter picks the `rail` class. Coloured's
 * `poi_transit` today, the transit layer, which draws bus stations and
 * airports by their icons too. Monochrome names its stations without an icon
 * (monochrome.ts, `detail-rail-stops`) and Dark draws none, so neither has one.
 */
export function isStationIcons(layer: LayerSpecification): layer is SymbolLayerSpecification {
  if (layer.type !== 'symbol' || layer['source-layer'] !== 'poi') return false;
  if (layer.layout?.['icon-image'] === undefined) return false;
  return JSON.stringify(layer.filter ?? null).includes(`"${RAIL_CLASS}"`);
}

/** A station layer with its labels off: its icons alone, with no name. */
function iconsOnly(layer: SymbolLayerSpecification): SymbolLayerSpecification {
  const layout = { ...layer.layout };
  delete layout['text-field'];
  return { ...layer, layout };
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
      if (isStationIcons(layer)) return iconsOnly(layer);
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
