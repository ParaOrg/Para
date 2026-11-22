import type {
  LayerSpecification,
  MapLibreMap,
  StyleSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl';

import { MAP_PAINT } from '@/design-system/foundation/map-colours';

import { byKind, isEstablishment } from './establishment-expressions';
import {
  FAMILY_COLOUR,
  TIER_ZOOM,
  establishmentImageOf,
  type EstablishmentTier,
} from './establishment-kinds';
import { ESTABLISHMENT_ANCHOR } from './establishment-loader';
import { isExpressionFilter } from './station-mask';

/*
 * The establishments' layers (establishment-kinds.ts): one per tier, read from the basemap's own
 * `poi` source layer, so they cost no download, and drawn where a design shows its Location
 * Labels (establishment-loader.ts). The design's own place labels give up the same places,
 * so nothing is drawn twice. A chunk of its own: none of this is in the page's opening code.
 */

const SOURCE = 'openmaptiles';
const SOURCE_LAYER = 'poi';
export const ESTABLISHMENT_LAYER_PREFIX = 'establishments-';

const TIERS: readonly EstablishmentTier[] = [3, 2, 1];

/** A tier's layer: the marker from its zoom, small at first; the name beside it a zoom closer. */
export function establishmentLayer(tier: EstablishmentTier): SymbolLayerSpecification {
  const { marker, name } = TIER_ZOOM[tier];
  return {
    id: `${ESTABLISHMENT_LAYER_PREFIX}${tier}`,
    type: 'symbol',
    source: SOURCE,
    'source-layer': SOURCE_LAYER,
    minzoom: marker,
    filter: ['all', ['==', ['geometry-type'], 'Point'], ['has', 'name'], isEstablishment(tier)],
    layout: {
      'icon-image': byKind((kind) => establishmentImageOf(kind.glyph), ''),
      'icon-size': ['interpolate', ['linear'], ['zoom'], marker, 0.7, name, 1],
      'icon-allow-overlap': false,
      // The most important place in a tile's grid first (OpenMapTiles' rank: 1 is the most).
      'symbol-sort-key': ['get', 'rank'],
      'text-field': ['step', ['zoom'], '', name, ['get', 'name']],
      'text-font': ['Noto Sans Italic'],
      'text-size': 11,
      'text-anchor': 'left',
      'text-offset': [0.9, 0],
      'text-max-width': 8,
      'text-optional': true,
    },
    paint: {
      // A name in its family's colour, so it reads as its marker's.
      'text-color': byKind(
        (kind) => FAMILY_COLOUR[kind.family],
        MAP_PAINT['Paint/basemap-landmark'],
      ),
      'text-halo-color': MAP_PAINT['Paint/casing'],
      'text-halo-width': 1.2,
    },
  };
}

/** A design's own place label, giving up the places the establishments draw; a legacy filter as it is. */
function withoutEstablishments(layer: LayerSpecification): LayerSpecification {
  if (layer.type !== 'symbol' || layer['source-layer'] !== SOURCE_LAYER) return layer;
  if (layer.filter !== undefined && !isExpressionFilter(layer.filter)) return layer;
  return { ...layer, filter: ['all', layer.filter ?? true, ['!', isEstablishment()]] };
}

/**
 * Whether a design draws its places by icons of its own, each by its class: Coloured's ranked
 * place layers (Liberty's). It keeps them, and draws no establishments, until the owner decides
 * whether ours replace them there. Monochrome's one gray dot and Dark's none are not such icons.
 */
export function drawsItsOwnPlaceIcons(layers: readonly LayerSpecification[]): boolean {
  return layers.some(
    (layer) =>
      layer.type === 'symbol' &&
      layer['source-layer'] === SOURCE_LAYER &&
      JSON.stringify(layer.layout?.['icon-image'] ?? '').includes('class'),
  );
}

/**
 * A design with its establishments drawn, last, over its own labels. Pure; a style without the
 * tiles, or with place icons of its own, as it is.
 */
export function withEstablishments(style: StyleSpecification): StyleSpecification {
  if (!(SOURCE in style.sources) || drawsItsOwnPlaceIcons(style.layers)) return style;
  return {
    ...style,
    layers: [...style.layers.map(withoutEstablishments), ...TIERS.map(establishmentLayer)],
  };
}

/**
 * The map's style as withEstablishments makes it, done to the map: its place labels' filters, and
 * the layers at the anchor, under Para's own labels. Nothing when the style does not want them,
 * has no tiles, draws its own place icons, or has them already.
 */
export function addEstablishmentLayers(map: MapLibreMap): void {
  const anchor = ESTABLISHMENT_ANCHOR.id;
  if (!map.getLayer(anchor) || !map.getSource(SOURCE) || map.getLayer(establishmentLayer(1).id))
    return;
  const { layers } = map.getStyle();
  if (drawsItsOwnPlaceIcons(layers)) return;
  for (const layer of layers) {
    const given = withoutEstablishments(layer);
    if (given !== layer && 'filter' in given) map.setFilter(layer.id, given.filter);
  }
  for (const tier of TIERS) map.addLayer(establishmentLayer(tier), anchor);
}
