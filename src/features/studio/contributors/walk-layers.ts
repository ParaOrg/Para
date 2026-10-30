import type { FilterSpecification, MapLibreMap } from 'maplibre-gl';

import { FOOT_ICON, addFootIcon } from './foot-icon';

const WALK_LINE = 'studio-contribution-walk';
export const WALK_FEET = 'studio-contribution-walk-feet';
/** The walk parts' layers, top first. */
export const WALK_LAYERS = [WALK_FEET, WALK_LINE] as const;

/** The opened trail's ride parts; an upload's trail is ride unless its phone said walk. */
export const RIDE: FilterSpecification = [
  'all',
  ['==', ['get', 'kind'], 'trail'],
  ['!=', ['get', 'mode'], 'walk'],
];
const WALK: FilterSpecification = [
  'all',
  ['==', ['get', 'kind'], 'trail'],
  ['==', ['get', 'mode'], 'walk'],
];

/** The walk parts: dashed, with the Icon Set's footsteps repeated along them, the contributor's map's look for walking. */
export function addWalkLayers(map: MapLibreMap, source: string, colour: string): void {
  addFootIcon(map, colour);
  map.addLayer({
    id: WALK_LINE,
    type: 'line',
    source,
    filter: WALK,
    layout: { 'line-cap': 'butt', 'line-join': 'round' },
    // A dash and a gap each about the line's own width, as the contributor's map draws walking.
    paint: { 'line-color': colour, 'line-width': 4, 'line-dasharray': [1.2, 1] },
  });
  map.addLayer({
    id: WALK_FEET,
    type: 'symbol',
    source,
    filter: WALK,
    layout: {
      'symbol-placement': 'line',
      'symbol-spacing': 80,
      'icon-image': FOOT_ICON,
      // The footsteps are drawn toes up; turned, their toes point the way the line runs.
      'icon-rotate': 90,
      'icon-rotation-alignment': 'map',
      'icon-keep-upright': false,
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  });
}
