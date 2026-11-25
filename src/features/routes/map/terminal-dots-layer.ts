import type { MapLibreMap } from 'maplibre-gl';

import { MAP_COLOURS, MAP_PAINT } from '@/design-system/foundation/map-colours';

import {
  TERMINAL_DOTS,
  TERMINAL_DOTS_MIN_ZOOM,
  TERMINAL_DOTS_NAME_ZOOM,
  TERMINAL_SOURCE,
  terminalFeatures,
} from './terminal-points';
import { fetchTerminals } from '../published/fetch-terminals';
import { TERMINAL_KINDS, type Terminal } from '../published/terminal-file-schema';

/**
 * The first of Para's own layers on the map, so the dots go under the routes and the hotspots.
 * As footbridge-layer.ts finds it; not shared with it, so neither lazy chunk brings the other.
 */
function firstOfOurs(map: MapLibreMap): string | undefined {
  const style = map.getStyle();
  const ours = new Set(
    Object.entries(style.sources)
      .filter(([id, source]) => source.type === 'geojson' && id !== TERMINAL_DOTS.source)
      .map(([id]) => id),
  );
  return style.layers.find((layer) => 'source' in layer && ours.has(layer.source))?.id;
}

const COLOUR = MAP_COLOURS['Map/Pin/Terminal/surface'];

/**
 * The studio's possible terminals (.scratch/terminals) on `map`: a faint dot in the terminal pin's
 * colour for each terminal OpenStreetMap maps, jeepney, UV, bus or not known, its name from
 * TERMINAL_DOTS_NAME_ZOOM. They take no taps and change no draft. They stand in for the commuter's
 * terminal markers (terminal-markers.ts), which a map with the dots does not draw. A GeoJSON
 * source, so a basemap switch carries it across (basemap.ts).
 */
export function addTerminalDots(map: MapLibreMap, terminals: readonly Terminal[]): void {
  if (map.getSource(TERMINAL_DOTS.source)) return;
  if (map.getLayer(TERMINAL_SOURCE)) map.removeLayer(TERMINAL_SOURCE);
  if (map.getSource(TERMINAL_SOURCE)) map.removeSource(TERMINAL_SOURCE);
  map.addSource(TERMINAL_DOTS.source, {
    type: 'geojson',
    data: terminalFeatures(terminals, TERMINAL_KINDS),
  });
  const before = firstOfOurs(map);
  map.addLayer(
    {
      id: TERMINAL_DOTS.dot,
      type: 'circle',
      source: TERMINAL_DOTS.source,
      minzoom: TERMINAL_DOTS_MIN_ZOOM,
      paint: {
        'circle-color': COLOUR,
        'circle-opacity': 0.35,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], TERMINAL_DOTS_MIN_ZOOM, 3, 17, 5],
        'circle-stroke-color': MAP_PAINT['Paint/casing'],
        'circle-stroke-width': 1,
        'circle-stroke-opacity': 0.6,
      },
    },
    before,
  );
  map.addLayer(
    {
      id: TERMINAL_DOTS.name,
      type: 'symbol',
      source: TERMINAL_DOTS.source,
      minzoom: TERMINAL_DOTS_NAME_ZOOM,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Italic'],
        'text-size': 11,
        'text-anchor': 'left',
        'text-offset': [0.6, 0],
        'text-max-width': 8,
      },
      paint: {
        'text-color': COLOUR,
        'text-opacity': 0.6,
        'text-halo-color': MAP_PAINT['Paint/casing'],
        'text-halo-width': 1.2,
      },
    },
    before,
  );
}

/**
 * The terminal file read (once a page), then the dots added to `map` while `isWanted` still says
 * so (the map not gone meanwhile). Rejects when the file cannot be read.
 */
export async function showTerminalDots(map: MapLibreMap, isWanted: () => boolean): Promise<void> {
  const { terminals } = await fetchTerminals();
  if (isWanted()) addTerminalDots(map, terminals);
}
