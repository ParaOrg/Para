import type { GeoJSONSource, MapLibreMap, SymbolLayerSpecification } from 'maplibre-gl';

import { MAP_PAINT } from '@/design-system/foundation/map-colours';

import { addEstablishmentImage } from './establishment-images';
import {
  FAMILY_COLOUR,
  TERMINAL_FAMILY,
  TERMINAL_GLYPH,
  TIER_ZOOM,
  establishmentImageOf,
} from './establishment-kinds';
import { ESTABLISHMENT_ANCHOR } from './establishment-loader';
import {
  COMMUTER_TERMINAL_KINDS,
  TERMINAL_DOTS,
  TERMINAL_SOURCE,
  terminalFeatures,
} from './terminal-points';
import { fetchTerminals } from '../published/fetch-terminals';

/*
 * The jeepney, UV and bus terminals OpenStreetMap maps (.scratch/terminals), on the commuter's map:
 * a marker as an establishment's, a bus on transport's colour, smaller than Para's own terminal
 * pins and drawn under them, taking no taps. Part of the establishments' chunk
 * (establishment-drawing.ts), so drawn while the design shows its Location Labels and gone with
 * them; the file is read the first time they are drawn. A map with the studio's possible terminals
 * (terminal-dots-layer.ts) draws those instead.
 */

/** Where a terminal's marker first shows, and its name: an everyday errand's (tier 2). */
const ZOOM = TIER_ZOOM[2];

/** A shade under an establishment's marker (0.85 to 1), so Para's own pins stay the larger. */
export const TERMINAL_LAYER: SymbolLayerSpecification = {
  id: TERMINAL_SOURCE,
  type: 'symbol',
  source: TERMINAL_SOURCE,
  minzoom: ZOOM.marker,
  layout: {
    'icon-image': establishmentImageOf(TERMINAL_GLYPH),
    'icon-size': ['interpolate', ['linear'], ['zoom'], ZOOM.marker, 0.7, ZOOM.name, 0.85],
    'text-field': ['step', ['zoom'], '', ZOOM.name, ['get', 'name']],
    'text-font': ['Noto Sans Italic'],
    'text-size': 11,
    'text-anchor': 'left',
    'text-offset': [0.8, 0],
    'text-max-width': 8,
    'text-optional': true,
  },
  paint: {
    'text-color': FAMILY_COLOUR[TERMINAL_FAMILY],
    'text-halo-color': MAP_PAINT['Paint/casing'],
    'text-halo-width': 1.2,
  },
};

const following = new WeakSet<MapLibreMap>();

/**
 * The terminals' layer, at the anchor under Para's own labels, its marker on the map first; then
 * the file read (once a page) into it, unless the map draws the studio's dots. Taken away when a style without the anchor (Location
 * Labels off) arrives. A failed read leaves the layer empty until the next style asks again.
 */
export function drawTerminals(map: MapLibreMap): void {
  const isWanted =
    !map.getSource(TERMINAL_DOTS.source) && map.getLayer(ESTABLISHMENT_ANCHOR.id) !== undefined;
  if (isWanted && !map.getSource(TERMINAL_SOURCE)) {
    addEstablishmentImage(map, establishmentImageOf(TERMINAL_GLYPH));
    map.addSource(TERMINAL_SOURCE, {
      type: 'geojson',
      data: terminalFeatures([], COMMUTER_TERMINAL_KINDS),
    });
    map.addLayer(TERMINAL_LAYER, ESTABLISHMENT_ANCHOR.id);
    fetchTerminals()
      .then(({ terminals }) =>
        map
          .getSource<GeoJSONSource>(TERMINAL_SOURCE)
          ?.setData(terminalFeatures(terminals, COMMUTER_TERMINAL_KINDS)),
      )
      .catch((error: unknown) => console.warn('The map could not draw its terminals.', error));
  }
  if (following.has(map)) return;
  following.add(map);
  map.on('styledata', () => {
    if (map.getLayer(ESTABLISHMENT_ANCHOR.id) || !map.getSource(TERMINAL_SOURCE)) return;
    if (map.getLayer(TERMINAL_SOURCE)) map.removeLayer(TERMINAL_SOURCE);
    map.removeSource(TERMINAL_SOURCE);
  });
}
