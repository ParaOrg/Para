import type { LayerSpecification, SourceSpecification, StyleSpecification } from 'maplibre-gl';

import { MAP_PAINT } from '@/design-system/foundation/map-colours';

/*
 * Terrain (the owner, 2026-10-15: "How about terrain?"): a style with the
 * ground's shape on it — its slopes shaded, and the map raised in 3D when it
 * is tilted. Metro Manila is flat; the shading tells from Marikina east, up
 * into Antipolo, San Mateo and Montalban, where routes climb.
 *
 * The elevation is AWS's open Terrain Tiles (Mapzen's Terrarium encoding):
 * no key, global to z15, SRTM's 30 m over the Philippines (checked
 * 2026-10-15). OpenFreeMap has none to z15. Its tiles are not kept offline:
 * without a signal the map is drawn flat and unshaded, as the style under it.
 *
 * MapLibre asks for two sources of the same tiles, one to shade and one to
 * raise, or draws both worse; the browser fetches each tile once.
 */

const ELEVATION: SourceSpecification = {
  type: 'raster-dem',
  tiles: ['https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png'],
  encoding: 'terrarium',
  tileSize: 256,
  maxzoom: 15,
  attribution:
    '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noreferrer">Terrain Tiles</a>',
};

/** How much taller than life the raised map draws the hills: Antipolo's 200 m read as a slope. */
const EXAGGERATION = 1.5;

const HILLSHADE: LayerSpecification = {
  id: 'terrain-hillshade',
  type: 'hillshade',
  source: 'terrain-shade',
  paint: {
    'hillshade-exaggeration': 0.35,
    'hillshade-shadow-color': MAP_PAINT['Paint/terrain-shadow'],
    'hillshade-highlight-color': MAP_PAINT['Paint/terrain-highlight'],
    'hillshade-accent-color': MAP_PAINT['Paint/terrain-accent'],
  },
};

/** The first layer the shading goes under: a road, a building or a name. */
const isAboveGround = (l: LayerSpecification): boolean =>
  l.type === 'symbol' ||
  ('source-layer' in l &&
    (l['source-layer'] === 'transportation' || l['source-layer'] === 'building'));

/** A style with the shading over its ground and under its roads, raised in 3D. Pure: the input is left alone. */
export function terrainStyle(style: StyleSpecification): StyleSpecification {
  const firstAbove = style.layers.findIndex(isAboveGround);
  const cut = firstAbove < 0 ? style.layers.length : firstAbove;
  return {
    ...style,
    sources: { ...style.sources, 'terrain-shade': ELEVATION, 'terrain-relief': ELEVATION },
    layers: [...style.layers.slice(0, cut), HILLSHADE, ...style.layers.slice(cut)],
    terrain: { source: 'terrain-relief', exaggeration: EXAGGERATION },
  };
}
