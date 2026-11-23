import type {
  ExpressionSpecification,
  GeoJSONSource,
  MapLibreMap,
  SymbolLayerSpecification,
} from 'maplibre-gl';

import { MAP_PAINT } from '@/design-system/foundation/map-colours';

import {
  EXTRA_FAMILY,
  EXTRA_KIND_GLYPH,
  FAMILY_COLOUR,
  establishmentImageOf,
} from './establishment-kinds';
import { ESTABLISHMENT_ANCHOR } from './establishment-loader';
import { ESTABLISHMENT_CELL_DEG, establishmentCellOf } from '../published/establishment-cells';
import type { EstablishmentCell } from '../published/establishment-file-schema';
import { fetchEstablishmentCell, fetchEstablishmentIndex } from '../published/fetch-establishments';

/*
 * The establishments the basemap's tiles lack (.scratch/establishments, step E3b): pawnshops,
 * remittance and bayad centers, read from Para's own establishment files, only the cells in view
 * and only from EXTRA_MIN_ZOOM in. Part of the establishments' own chunk, so none of it is in the
 * page's opening code; drawn while the design shows its Location Labels, and gone with them.
 */

export const EXTRA_MIN_ZOOM = 16;
/** How many cells one view may ask for: a phone at EXTRA_MIN_ZOOM sees one to four. */
const MOST_CELLS = 9;
export const EXTRA_SOURCE = 'establishments-extra';

const EXTRA_KINDS = Object.keys(EXTRA_KIND_GLYPH);

/** The cells a view's bounds touch, by name, or none when it would be too many. */
export function cellsIn(west: number, south: number, east: number, north: number): string[] {
  const names: string[] = [];
  for (let lng = west; lng < east + ESTABLISHMENT_CELL_DEG; lng += ESTABLISHMENT_CELL_DEG) {
    for (let lat = south; lat < north + ESTABLISHMENT_CELL_DEG; lat += ESTABLISHMENT_CELL_DEG) {
      names.push(establishmentCellOf(Math.min(lng, east), Math.min(lat, north)));
    }
  }
  const unique = [...new Set(names)];
  return unique.length > MOST_CELLS ? [] : unique;
}

/** A cell's pawnshops and remittance centres as map points, by kind and name. */
export interface ExtraFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: { osm: string; kind: string; name: string };
}

export function extraFeatures(cell: EstablishmentCell): ExtraFeature[] {
  return cell.establishments
    .filter(([, kind]) => EXTRA_KINDS.includes(kind))
    .map(([id, kind, lng, lat, name]) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [lng, lat] },
      properties: { osm: id, kind, name: name ?? '' },
    }));
}

const IMAGE: ExpressionSpecification = [
  'match',
  ['get', 'kind'],
  'pawnshop',
  establishmentImageOf(EXTRA_KIND_GLYPH.pawnshop),
  establishmentImageOf(EXTRA_KIND_GLYPH.remittance),
];

/** The layer: the marker from EXTRA_MIN_ZOOM, its name a zoom closer, as an errand's is. */
export const EXTRA_LAYER: SymbolLayerSpecification = {
  id: EXTRA_SOURCE,
  type: 'symbol',
  source: EXTRA_SOURCE,
  minzoom: EXTRA_MIN_ZOOM,
  layout: {
    'icon-image': IMAGE,
    'icon-size': ['interpolate', ['linear'], ['zoom'], EXTRA_MIN_ZOOM, 0.85, EXTRA_MIN_ZOOM + 1, 1],
    'text-field': ['step', ['zoom'], '', EXTRA_MIN_ZOOM + 1, ['get', 'name']],
    'text-font': ['Noto Sans Italic'],
    'text-size': 11,
    'text-anchor': 'left',
    'text-offset': [0.9, 0],
    'text-max-width': 8,
    'text-optional': true,
  },
  paint: {
    'text-color': FAMILY_COLOUR[EXTRA_FAMILY],
    'text-halo-color': MAP_PAINT['Paint/casing'],
    'text-halo-width': 1.2,
  },
};

const EMPTY = { type: 'FeatureCollection' as const, features: [] };

/** The view's cells read and drawn; a cell that fails is left out and asked for again next time. */
async function drawView(map: MapLibreMap): Promise<void> {
  const source = map.getSource<GeoJSONSource>(EXTRA_SOURCE);
  if (!source || map.getZoom() < EXTRA_MIN_ZOOM) return;
  const bounds = map.getBounds();
  const wanted = new Set(
    cellsIn(bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()),
  );
  const index = await fetchEstablishmentIndex();
  const read = await Promise.allSettled(
    index.cells
      .filter(({ cell }) => wanted.has(cell))
      .map(({ cell, hash }) => fetchEstablishmentCell(cell, hash)),
  );
  const features = read.flatMap((r) => (r.status === 'fulfilled' ? extraFeatures(r.value) : []));
  map.getSource<GeoJSONSource>(EXTRA_SOURCE)?.setData({ type: 'FeatureCollection', features });
}

const following = new WeakSet<MapLibreMap>();

/**
 * Adds the layer under the anchor (its images must be on the map first: a GeoJSON layer drawn
 * before them keeps its names and loses its markers), and from then on draws the view's cells after each move and
 * takes the layer away when a style without the anchor (Location Labels off) arrives. Once per map.
 */
export function drawEstablishmentExtras(map: MapLibreMap): void {
  const draw = () => {
    drawView(map).catch((error: unknown) =>
      console.warn('The map could not draw its pawnshops.', error),
    );
  };
  if (!map.getSource(EXTRA_SOURCE) && map.getLayer(ESTABLISHMENT_ANCHOR.id)) {
    map.addSource(EXTRA_SOURCE, { type: 'geojson', data: EMPTY });
    map.addLayer(EXTRA_LAYER, ESTABLISHMENT_ANCHOR.id);
    draw();
  }
  if (following.has(map)) return;
  following.add(map);
  map.on('moveend', draw);
  map.on('styledata', () => {
    if (map.getLayer(ESTABLISHMENT_ANCHOR.id) || !map.getSource(EXTRA_SOURCE)) return;
    if (map.getLayer(EXTRA_SOURCE)) map.removeLayer(EXTRA_SOURCE);
    map.removeSource(EXTRA_SOURCE);
  });
}
