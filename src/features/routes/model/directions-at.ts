import type { Direction } from './routes';

/**
 * A lookup of the directions that stop at a hotspot, from the directions on the map and the map's
 * own links (useSavedHotspots' linkedDirectionIds): what place search reads for a place's
 * vehicles and a landmark's routes near here, on the public map and in the studio alike.
 */
export function directionsAtHotspots(
  directions: readonly Direction[],
  linkedDirectionIds: (hotspotId: string) => string[],
): (hotspotId: string) => Direction[] {
  const byId = new Map(directions.map((direction) => [direction.id, direction]));
  return (hotspotId) =>
    linkedDirectionIds(hotspotId)
      .map((id) => byId.get(id))
      .filter((direction) => direction !== undefined);
}
