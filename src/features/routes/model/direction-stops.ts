import type { HotspotLink } from './hotspot-schema';
import type { Hotspot } from './hotspots';
import type { DirectionStops } from './one-ride-options';
import { directionLine, directionRowName, isLoop, type Direction } from './routes';
import { orderLinked } from './timeline';

/**
 * Each direction's line and its hotspots in passing order, as Go here's options read them
 * (.scratch/go-here, ticket 01): built once a page from the published index, never per render.
 * A direction with fewer than two linked hotspots offers no ride and is left out.
 */
export function directionStopsOf<D extends Direction>(
  directions: readonly D[],
  hotspots: readonly Hotspot[],
  links: readonly HotspotLink[],
): DirectionStops<D>[] {
  const byId = new Map(hotspots.map((hotspot) => [hotspot.id, hotspot]));
  const linkedTo = new Map<string, { hotspot: Hotspot; sequence: number }[]>();
  for (const link of links) {
    const hotspot = byId.get(link.hotspotId);
    if (!hotspot) continue;
    const linked = linkedTo.get(link.directionId) ?? [];
    linked.push({ hotspot, sequence: link.sequence });
    linkedTo.set(link.directionId, linked);
  }
  return directions.flatMap((direction) => {
    const line = directionLine(direction);
    const stops = orderLinked(linkedTo.get(direction.id) ?? [], line);
    if (stops.length < 2 || line.length < 2) return [];
    return [
      { direction, name: directionRowName(direction), line, stops, isLoop: isLoop(direction) },
    ];
  });
}
