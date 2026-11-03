import type { FilterSpecification, MapLibreMap } from 'maplibre-gl';

const RIDE_HIGHLIGHT = 'studio-contribution-ride-highlight';

/** The highlight's filter: the trail part `piece`, or nothing. */
const filterFor = (piece: number | null): FilterSpecification => [
  'all',
  ['==', ['get', 'kind'], 'trail'],
  ['==', ['get', 'piece'], piece ?? -1],
];

/**
 * A wide, soft band under one ride of the opened upload: the ride whose row
 * the editor is pointing at or has focused, so a row reads as its line.
 * Added under `beneath` (the trail's casing), drawing nothing until set.
 */
export function addRideHighlight(
  map: MapLibreMap,
  source: string,
  colour: string,
  beneath: string,
): void {
  map.addLayer(
    {
      id: RIDE_HIGHLIGHT,
      type: 'line',
      source,
      filter: filterFor(null),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': colour, 'line-width': 16, 'line-opacity': 0.3 },
    },
    beneath,
  );
}

/** Highlights one ride by its trail part, or none. */
export function setRideHighlight(map: MapLibreMap, piece: number | null): void {
  if (map.getLayer(RIDE_HIGHLIGHT)) map.setFilter(RIDE_HIGHLIGHT, filterFor(piece));
}

export const RIDE_HIGHLIGHT_LAYERS = [RIDE_HIGHLIGHT] as const;
