import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import * as z from 'zod/mini';

/**
 * Location Labels, the Map Style card's switch: the basemap's own words
 * (places, streets, POIs, road shields, water and park names) shown or not.
 * Off by default, so the map reads as Para's: our labels (hintuans,
 * terminals, route codes, a ride's) are drawn from our own GeoJSON sources,
 * or as HTML over the map, and always stay.
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
 * The style with its basemap labels hidden, or as it came when they are
 * shown. Pure: the input is left alone. Applied to a style fresh from its
 * file, so showing them again keeps a label the style itself hides.
 */
export function withLocationLabels(
  style: StyleSpecification,
  areShown: boolean,
): StyleSpecification {
  if (areShown) return style;
  return {
    ...style,
    layers: style.layers.map((layer) =>
      isBasemapLabel(layer, style.sources)
        ? { ...layer, layout: { ...layer.layout, visibility: 'none' } }
        : layer,
    ),
  };
}

/**
 * Remembered on the device only, and only once shown: the default leaves
 * the browser's storage empty, as the basemap's choice does (basemap.ts).
 */
const STORAGE_KEY = 'para.location-labels.v1';

const storedSchema = z.literal('shown');

/** Whether this device asked for the basemap's labels; off unless it did. */
export function readLocationLabels(): boolean {
  try {
    return storedSchema.safeParse(localStorage.getItem(STORAGE_KEY)).success;
  } catch {
    return false;
  }
}

export function rememberLocationLabels(areShown: boolean): void {
  try {
    if (areShown) localStorage.setItem(STORAGE_KEY, 'shown');
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode or blocked storage: the choice lasts for this page only.
  }
}
