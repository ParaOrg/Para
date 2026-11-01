import { lazy } from 'react';

/**
 * The Map Style card's code, fetched apart from the code both pages open with: the card is drawn
 * only once its button is pressed, so its rows, its Location Labels switch and its thumbnails'
 * layout wait for that. Asked for ahead, once the map is up, so the first press finds it here.
 */
export const loadMapStyle = () => import('./map-style');

export const LazyMapStyle = lazy(() =>
  loadMapStyle().then((module) => ({ default: module.MapStyle })),
);
