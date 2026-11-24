import type { Hotspot } from './hotspots';

/*
 * A landmark made the goal by "Go here" (ticket 07): the hintuans near it, where a trip for it
 * ends, and the walk on from there. Apart from landmark-search.ts, which finds the hintuans,
 * because the card camera (use-card-camera.ts) reads these on both pages, and through it search's
 * matching would ride in the code every page loads.
 */

export interface HintuanNearHere {
  hintuan: Hotspot;
  /** Straight-line metres from the landmark. */
  distanceM: number;
  /** The directions that stop there, as the map's hotspots tell them (linkedDirectionIds). */
  directionIds: string[];
}

/**
 * Where a direction would leave a commuter going to a landmark (ticket 07): of the hintuans near it
 * (`near`, nearest first), the nearest that direction stops at; null when it stops at none.
 */
export function nearestStopOn(
  directionId: string,
  near: readonly HintuanNearHere[],
): HintuanNearHere | null {
  return near.find((stop) => stop.directionIds.includes(directionId)) ?? null;
}

/**
 * The walk from the ride's end to the landmark, in words for the trip card (ticket 07): straight-line
 * metres, to the nearest 10 and never under 10, so "about" is honest.
 */
export function walkToLandmark(distanceM: number, landmarkName: string): string {
  const metres = Math.max(10, Math.round(distanceM / 10) * 10);
  return `About ${metres} m to ${landmarkName}, in a straight line`;
}
