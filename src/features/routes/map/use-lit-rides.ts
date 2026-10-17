import type { MapLibreMap } from 'maplibre-gl';
import { useMemo } from 'react';

import type { LngLat } from '@/shared/utils/geo';

import { useBabaanSides } from './babaan-sides';
import { useDirectionArrows, type Ride } from './direction-arrows';
import { usePassStretches } from './pass-stretches';
import { useRideRest } from './ride-rest';
import type { Ridden } from './use-ride-to';
import type { Hotspot } from '../model/hotspots';
import { travelLine } from '../model/ride';
import { directionEndHotspots, directionEnds, type Direction } from '../model/routes';

/** No stretch drawn pale: one array, so the rest's source is not set afresh each render. */
const NOTHING_PALE: readonly (readonly LngLat[])[] = [];

/**
 * What a lit route wears on the map, in both apps: its green stretches
 * where it passes a hintuan, its chevrons, the rest of its line past a
 * picked hintuan in its card's pale, and the chosen direction's side of each
 * hintuan it cuts across. Returns the rides, for the circles and names at
 * their ends (EndTitles).
 */
export function useLitRides(
  map: MapLibreMap | null,
  saved: {
    directions: readonly Direction[];
    /** The directions whose full line has been read. */
    fullIds: ReadonlySet<string>;
    lit: readonly string[];
    litDirections: readonly Direction[];
    selected: Direction | null;
  },
  hotspots: readonly Hotspot[],
  /** The direction being redrawn in the studio: no stretches over the draft. */
  hiddenDirectionId: string | null = null,
  /**
   * An end picked on the trip, after a start or not (useRideTo's `ridden`):
   * the line outside the ride is drawn in the trip's pale, the chevrons
   * flowing on over it, from the S to the E for an end above the start.
   */
  ridden: Ridden | null = null,
  /**
   * The start picked on the trip (useRideTo's `startId`). With no ride drawn
   * — a start alone, or an end the line can't take it to — the trip's ends
   * lose their S and E, its pin the one S, and the whole line is on the pale,
   * its ends and names with it.
   */
  startId: string | null = null,
): Ride[] {
  // Where a lit direction passes a hintuan, the line turns green for that
  // stretch: worked out on the full lines read — a lit direction's is asked
  // for as it lights, and its green comes with it — rather than on every
  // overview at load. Offline, a line never read has none.
  const withLines = useMemo(
    () => saved.directions.filter((v) => saved.fullIds.has(v.id)),
    [saved.directions, saved.fullIds],
  );
  usePassStretches(map, withLines, hotspots, saved.lit, hiddenDirectionId);

  // Which way the jeep goes, on what is lit only — the chosen direction, the
  // Selected card's directions, or else a list's or a hotspot card's: chevrons
  // flowing inside each line from where the ride starts, and each end a
  // circle with its place's name and, where the route says, its hotspot.
  const unmarkedId = startId !== null && ridden === null ? (saved.selected?.id ?? null) : null;
  const rides = useMemo(
    () =>
      saved.litDirections.map((v): Ride => {
        const line = travelLine(v, hotspots);
        return {
          id: v.id,
          line,
          ...(ridden?.directionId === v.id
            ? { pale: ridden.pale, isBackwards: ridden.isBackwards }
            : {}),
          // A start with no ride: the whole trip on the pale, its ends with it.
          ...(v.id === unmarkedId ? { isUnmarked: true, pale: [line] } : {}),
          ...directionEnds(v),
          ...directionEndHotspots(v),
          routeCode: v.route?.routeCode ?? null,
        };
      }),
    [saved.litDirections, hotspots, ridden, unmarkedId],
  );
  useDirectionArrows(map, rides);
  // Outside the ride, the trip's line in its card's pale, over the lit line
  // and under the chevrons; with a start and no ride, the whole of it;
  // nothing while nothing is picked.
  const pale = ridden?.pale ?? rides.find((r) => r.id === unmarkedId)?.pale ?? NOTHING_PALE;
  useRideRest(map, pale);
  // The chosen direction's side of each hintuan it cuts across: its right.
  useBabaanSides(map, saved.selected, hotspots);
  return rides;
}
