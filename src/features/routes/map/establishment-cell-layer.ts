import type { GeoJSONSource, MapLibreMap, SymbolLayerSpecification } from 'maplibre-gl';

import { ESTABLISHMENT_FILL_ZOOM } from './establishment-kinds';
import { ESTABLISHMENT_ANCHOR } from './establishment-loader';
import { ESTABLISHMENT_CELL_DEG, establishmentCellOf } from '../published/establishment-cells';
import type { CellFiles } from '../published/fetch-establishments';

/*
 * A layer drawn from one folder of Para's cell files (.scratch/establishments, steps E3b and E3c):
 * only the cells in view, only from ESTABLISHMENT_FILL_ZOOM in, read again after each move. The
 * pawnshops (establishment-extra.ts) and Overture's places (establishment-overture.ts) are two.
 * Part of the establishments' own chunk, so none of it is in the page's opening code; drawn while
 * the design shows its Location Labels, and gone with them.
 */

/** How many cells one view may ask for: a phone at ESTABLISHMENT_FILL_ZOOM sees one to four. */
const MOST_CELLS = 9;

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

/** A place as the layer draws it: its point, and its kind and name for the style. */
export interface CellFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: { id: string; kind: string; name: string };
}

interface CellIndex {
  cells: readonly { cell: string; hash: string }[];
}

/** One layer drawn from cell files: its layer (whose id is its source's), its files and its rows. */
export interface CellLayer<TCell> {
  layer: SymbolLayerSpecification;
  files: CellFiles<CellIndex, TCell>;
  features: (cell: TCell) => CellFeature[];
  /** The source's credit, which MapLibre's attribution control shows while the layer is drawn. */
  attribution?: string;
  /** The layer it is added under: the first of these the map has, else the anchor. */
  under: readonly string[];
  /** What the console says when a view's places could not be drawn. */
  failure: string;
}

const EMPTY = { type: 'FeatureCollection' as const, features: [] };

/** The view's cells read and drawn; a cell that fails is left out and asked for again next time. */
async function drawView<TCell>(map: MapLibreMap, spec: CellLayer<TCell>): Promise<void> {
  const source = map.getSource<GeoJSONSource>(spec.layer.id);
  if (!source || map.getZoom() < ESTABLISHMENT_FILL_ZOOM) return;
  const bounds = map.getBounds();
  const wanted = new Set(
    cellsIn(bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()),
  );
  const index = await spec.files.fetchIndex();
  const read = await Promise.allSettled(
    index.cells
      .filter(({ cell }) => wanted.has(cell))
      .map(({ cell, hash }) => spec.files.fetchCell(cell, hash)),
  );
  const features = read.flatMap((r) => (r.status === 'fulfilled' ? spec.features(r.value) : []));
  map.getSource<GeoJSONSource>(spec.layer.id)?.setData({ type: 'FeatureCollection', features });
}

const following = new WeakMap<MapLibreMap, Set<string>>();

/**
 * Adds the layer and its source under the first of `under` the map has (its images must be on
 * the map first: a GeoJSON layer drawn before them keeps its names and loses its markers), and
 * from then on draws the view's cells after each move and takes the layer away when a style
 * without the anchor (Location Labels off) arrives. Follows each map once.
 */
export function drawCellLayer<TCell>(map: MapLibreMap, spec: CellLayer<TCell>): void {
  const id = spec.layer.id;
  const draw = () => {
    drawView(map, spec).catch((error: unknown) => console.warn(spec.failure, error));
  };
  if (!map.getSource(id) && map.getLayer(ESTABLISHMENT_ANCHOR.id)) {
    const under = spec.under.find((layer) => map.getLayer(layer)) ?? ESTABLISHMENT_ANCHOR.id;
    map.addSource(id, { type: 'geojson', data: EMPTY, attribution: spec.attribution });
    map.addLayer(spec.layer, under);
    draw();
  }
  const followed = following.get(map) ?? new Set<string>();
  if (followed.has(id)) return;
  following.set(map, followed.add(id));
  map.on('moveend', draw);
  map.on('styledata', () => {
    if (map.getLayer(ESTABLISHMENT_ANCHOR.id) || !map.getSource(id)) return;
    if (map.getLayer(id)) map.removeLayer(id);
    map.removeSource(id);
  });
}
