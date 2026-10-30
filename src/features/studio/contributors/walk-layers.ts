import type { FilterSpecification, MapLibreMap } from 'maplibre-gl';

import { FOOT_ICON, footIcon } from './foot-icon';

const WALK_LINE = 'studio-contribution-walk';
export const WALK_FEET = 'studio-contribution-walk-feet';
/** The walk parts' layers, top first. */
export const WALK_LAYERS = [WALK_FEET, WALK_LINE] as const;

/** Adds the foot the walk parts repeat, once; a basemap switch drops it, and it is added again. */
export function addFootIcon(map: MapLibreMap, colour: string): void {
  if (!map.hasImage(FOOT_ICON)) map.addImage(FOOT_ICON, footIcon(colour), { pixelRatio: 2 });
}

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

/** The walk parts: dashed, with a foot repeated along them, the contributor's map's look for walking. */
export function addWalkLayers(map: MapLibreMap, source: string, colour: string): void {
  addFootIcon(map, colour);
  map.addLayer({
    id: WALK_LINE,
    type: 'line',
    source,
    filter: WALK,
    layout: { 'line-cap': 'butt', 'line-join': 'round' },
    paint: { 'line-color': colour, 'line-width': 3, 'line-dasharray': [1.5, 1.5] },
  });
  map.addLayer({
    id: WALK_FEET,
    type: 'symbol',
    source,
    filter: WALK,
    layout: {
      'symbol-placement': 'line',
      'symbol-spacing': 48,
      'icon-image': FOOT_ICON,
      // The foot is drawn toes up; a line's symbols face along it.
      'icon-rotate': 90,
      'icon-rotation-alignment': 'map',
      'icon-allow-overlap': true,
    },
  });
}
