import { mapCredits } from './map-attribution';
import type { MapCredit } from './map-attribution';

/**
 * Overture's credit, which its licences (CDLA-Permissive-2.0, Apache-2.0 with Foursquare's NOTICE)
 * ask for wherever its places show. The map's corner gets it from the Overture source itself
 * (establishment-overture.ts); this row is for the Map Data Source sheet, which takes the corner's
 * place on every page with its own ⓘ. Kept out of mapCredits: that file is in the opening code,
 * and the corner must not carry the credit twice.
 */
export const OVERTURE_CREDIT: MapCredit = {
  title: '© Overture Maps Foundation',
  description: 'Eateries, cafés, clinics and schools',
  href: 'https://overturemaps.org',
  isCredit: true,
};

/** The Map Data Source sheet's rows: the map's credits, with Overture's after OpenStreetMap's. */
export function dataSourceCredits(basemapHost: string): readonly MapCredit[] {
  const [para, openStreetMap, ...rest] = mapCredits(basemapHost);
  return [para, openStreetMap, OVERTURE_CREDIT, ...rest];
}
