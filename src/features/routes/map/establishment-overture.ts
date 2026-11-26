import type { ExpressionSpecification, MapLibreMap, SymbolLayerSpecification } from 'maplibre-gl';

import { drawCellLayer, type CellFeature, type CellLayer } from './establishment-cell-layer';
import { EXTRA_SOURCE, cellSymbolLayer } from './establishment-extra';
import {
  ESTABLISHMENT_FILL_ZOOM,
  FAMILY_COLOUR,
  establishmentImageOf,
  familyOfGlyph,
  type EstablishmentGlyph,
} from './establishment-kinds';
import { overtureFiles } from '../published/fetch-establishments';
import type { OvertureCell, OvertureKind } from '../published/overture-file-schema';

/*
 * Overture's eateries, cafés, clinics, schools and everyday stores (.scratch/establishments, step
 * E3c), from Para's Overture place files: the places OpenStreetMap lacks, with the markers and
 * names OSM's have (the owner's answer 3), under them, so OSM's win where both would show. Their
 * credit, "© Overture Maps Foundation", rides on the source, so MapLibre's attribution control
 * shows it in the map's corner while the layer is drawn; where the corner steps aside for a page's
 * own ⓘ, the Map Data Source sheet names it (data-source-credits.ts).
 */

export const OVERTURE_SOURCE = 'establishments-overture';
export const OVERTURE_ATTRIBUTION = '© Overture Maps Foundation';

/** Each Overture kind's glyph: the OSM kind of the same name's (establishment-kinds.ts). */
export const OVERTURE_KIND_GLYPH: Record<OvertureKind, EstablishmentGlyph> = {
  restaurant: 'restaurant',
  fast_food: 'fast-food',
  cafe: 'cafe',
  clinic: 'doctor',
  dentist: 'dentist',
  school: 'school',
  college: 'college',
  convenience: 'convenience',
  supermarket: 'grocery',
  pharmacy: 'pharmacy',
  laundry: 'laundry',
  hotel: 'lodging',
  lodging: 'lodging',
};

/** The small places to stay (kind lodging, overture.mjs's lodgingKindOf): a zoom after the rest. */
export const SMALL_LODGING_ZOOM = ESTABLISHMENT_FILL_ZOOM + 1;

/** A cell's places as map points, by kind and name. */
export function overtureFeatures(cell: OvertureCell): CellFeature[] {
  return cell.establishments.map(([id, kind, lng, lat, name]) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [lng, lat] },
    properties: { id, kind, name: name ?? '' },
  }));
}

/** A kind's marker, or its family's colour, by `['get', 'kind']`; a kind not listed reads as an eatery. */
function byKind(valueOf: (glyph: EstablishmentGlyph) => string): ExpressionSpecification {
  const [first, ...rest] = Object.entries(OVERTURE_KIND_GLYPH);
  const fallback = valueOf(OVERTURE_KIND_GLYPH.restaurant);
  if (!first) return ['literal', fallback];
  const pairs = rest.flatMap(([kind, glyph]) => [kind, valueOf(glyph)]);
  return ['match', ['get', 'kind'], first[0], valueOf(first[1]), ...pairs, fallback];
}

export const OVERTURE_LAYER: SymbolLayerSpecification = {
  ...cellSymbolLayer(
    OVERTURE_SOURCE,
    byKind(establishmentImageOf),
    byKind((glyph) => FAMILY_COLOUR[familyOfGlyph(glyph) ?? 'food']),
  ),
  filter: ['any', ['!=', ['get', 'kind'], 'lodging'], ['>=', ['zoom'], SMALL_LODGING_ZOOM]],
};

/** The glyphs the layer's markers need on the map before it is added. */
export const OVERTURE_GLYPHS: readonly EstablishmentGlyph[] = [
  ...new Set(Object.values(OVERTURE_KIND_GLYPH)),
];

const OVERTURE: CellLayer<OvertureCell> = {
  layer: OVERTURE_LAYER,
  files: overtureFiles,
  features: overtureFeatures,
  attribution: OVERTURE_ATTRIBUTION,
  // Under the basemap's least establishments (establishments.ts' tier 3) and the pawnshops, so
  // where two markers meet, OSM's is placed first.
  under: ['establishments-3', 'establishments-2', 'establishments-1', EXTRA_SOURCE],
  failure: 'The map could not draw its Overture places.',
};

/** Overture's layer, drawn from the cells in view (drawCellLayer). Once per map. */
export function drawOverturePlaces(map: MapLibreMap): void {
  drawCellLayer(map, OVERTURE);
}
