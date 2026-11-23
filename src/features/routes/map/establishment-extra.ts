import type { ExpressionSpecification, MapLibreMap, SymbolLayerSpecification } from 'maplibre-gl';

import { MAP_PAINT } from '@/design-system/foundation/map-colours';

import { drawCellLayer, type CellFeature, type CellLayer } from './establishment-cell-layer';
import {
  ESTABLISHMENT_FILL_ZOOM,
  EXTRA_FAMILY,
  EXTRA_KIND_GLYPH,
  FAMILY_COLOUR,
  establishmentImageOf,
} from './establishment-kinds';
import type { EstablishmentCell } from '../published/establishment-file-schema';
import { establishmentFiles } from '../published/fetch-establishments';

/*
 * The establishments the basemap's tiles lack (.scratch/establishments, step E3b): pawnshops,
 * remittance and bayad centers, read from Para's own establishment files, only the cells in view
 * and only from EXTRA_MIN_ZOOM in (establishment-cell-layer.ts).
 */

export const EXTRA_MIN_ZOOM = ESTABLISHMENT_FILL_ZOOM;
export const EXTRA_SOURCE = 'establishments-extra';

const EXTRA_KINDS = Object.keys(EXTRA_KIND_GLYPH);

/** A cell's pawnshops and remittance centres as map points, by kind and name. */
export function extraFeatures(cell: EstablishmentCell): CellFeature[] {
  return cell.establishments
    .filter(([, kind]) => EXTRA_KINDS.includes(kind))
    .map(([id, kind, lng, lat, name]) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [lng, lat] },
      properties: { id, kind, name: name ?? '' },
    }));
}

const IMAGE: ExpressionSpecification = [
  'match',
  ['get', 'kind'],
  'pawnshop',
  establishmentImageOf(EXTRA_KIND_GLYPH.pawnshop),
  establishmentImageOf(EXTRA_KIND_GLYPH.remittance),
];

/**
 * A layer of places from Para's cell files, styled as the basemap's establishments are
 * (establishments.ts): the marker from EXTRA_MIN_ZOOM, its name a zoom closer, as an errand's is.
 */
export function cellSymbolLayer(
  id: string,
  image: ExpressionSpecification,
  textColour: string | ExpressionSpecification,
): SymbolLayerSpecification {
  return {
    id,
    type: 'symbol',
    source: id,
    minzoom: EXTRA_MIN_ZOOM,
    layout: {
      'icon-image': image,
      'icon-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        EXTRA_MIN_ZOOM,
        0.85,
        EXTRA_MIN_ZOOM + 1,
        1,
      ],
      'text-field': ['step', ['zoom'], '', EXTRA_MIN_ZOOM + 1, ['get', 'name']],
      'text-font': ['Noto Sans Italic'],
      'text-size': 11,
      'text-anchor': 'left',
      'text-offset': [0.9, 0],
      'text-max-width': 8,
      'text-optional': true,
    },
    paint: {
      'text-color': textColour,
      'text-halo-color': MAP_PAINT['Paint/casing'],
      'text-halo-width': 1.2,
    },
  };
}

export const EXTRA_LAYER = cellSymbolLayer(EXTRA_SOURCE, IMAGE, FAMILY_COLOUR[EXTRA_FAMILY]);

const EXTRAS: CellLayer<EstablishmentCell> = {
  layer: EXTRA_LAYER,
  files: establishmentFiles,
  features: extraFeatures,
  under: [],
  failure: 'The map could not draw its pawnshops.',
};

/** The pawnshops' layer under the anchor, drawn from the cells in view (drawCellLayer). Once per map. */
export function drawEstablishmentExtras(map: MapLibreMap): void {
  drawCellLayer(map, EXTRAS);
}
