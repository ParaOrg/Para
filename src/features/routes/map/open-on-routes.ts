import { routesBounds, type Bounds } from './framing';
import { openingDirections } from '../published/fetch-index';

/**
 * The routes' framing the public map opens on: their box as the index or the
 * copy kept from an earlier visit has them (openingDirections), the box the
 * routes' own fit frames (useSavedRoutes). Module-level, as the page's loaders
 * are: one function for the page's life, so the map asks once.
 */
export const openOnRoutes = (): Promise<Bounds | null> =>
  openingDirections().then((directions) => (directions ? routesBounds(directions) : null));
