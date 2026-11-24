// The public map's parts fetched after its opening page, each its own chunk.

import { retryingLazy } from '@/shared/lib/retrying-lazy';
import { retryingImport } from '@/shared/utils/retrying-import';

// The toasts, fetched the first time the page has something to say: the opening page does not
// carry them. Precached, so they come offline too; a fetch that fails all the same never blanks
// the page, and is asked for again (retryingLazy).
export const PageToasts = retryingLazy(() =>
  retryingImport(() => import('./page-toasts'))().then((module) => module.PageToasts),
);

// Place search, fetched only where it is shown (isPlaceSearchShown): a build with it off never
// asks for it, and one with it on draws the bar a beat after the map. Precached, as the toasts.
export const PlaceSearchBar = retryingLazy(() =>
  retryingImport(() => import('./place-search-bar'))().then((module) => module.PlaceSearchBar),
);

// The cards shown while nothing is open, fetched with the page's first render: the opening page
// does not carry them. Precached, as the toasts.
export const ExploreCards = retryingLazy(() =>
  retryingImport(() => import('./explore-cards'))().then((module) => module.ExploreCards),
);
