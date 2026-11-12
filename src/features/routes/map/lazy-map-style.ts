import { retryingLazy } from '@/shared/lib/retrying-lazy';
import { retryingImport } from '@/shared/utils/retrying-import';

/**
 * The Map Style card's code, fetched apart from the code both pages open with: the card is drawn
 * only once its button is pressed, so its rows, its Location Labels switch and its thumbnails'
 * layout wait for that. Asked for ahead, once the map is up, so the first press finds it here.
 */
export const loadMapStyle = () => import('./map-style');

/** A fetch that fails draws no card, never the page's error screen, and is asked for again. */
export const LazyMapStyle = retryingLazy(() =>
  retryingImport(loadMapStyle)().then((module) => module.MapStyle),
);
