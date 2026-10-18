import * as z from 'zod/mini';

/** The studio's three maps, in the owner's order: what the switch lists. */
export const STUDIO_MAPS = ['contributors', 'playground', 'public'] as const;
export type StudioMapName = (typeof STUDIO_MAPS)[number];

/** Where editors work, so it is what opens when the address names nothing. */
export const DEFAULT_STUDIO_MAP: StudioMapName = 'playground';

const studioMapSchema = z.enum(STUDIO_MAPS);

/** The map the address asks for (`?map=`); anything else is the default. */
export function studioMapFromSearch(search: string): StudioMapName {
  const parsed = studioMapSchema.safeParse(new URLSearchParams(search).get('map'));
  return parsed.success ? parsed.data : DEFAULT_STUDIO_MAP;
}

/** The query string with `map` set to this map and every other parameter left as it was. */
export function searchWithMap(search: string, map: StudioMapName): string {
  const params = new URLSearchParams(search);
  params.set('map', map);
  return `?${params.toString()}`;
}
