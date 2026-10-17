import type { MapLibreMap } from 'maplibre-gl';
import { useMemo } from 'react';

import type { LngLat } from '@/shared/utils/geo';

import { useBabaanSides } from './babaan-sides';
import { useDirectionArrows, type Ride } from './direction-arrows';
import type { TipOnRide } from './loop-tip';
import { usePassStretches } from './pass-stretches';
import { useRideRest } from './ride-rest';
import type { Ridden } from './use-ride-to';
import { hotspotLabel, type Hotspot } from '../model/hotspots';
import { tipLine, travelLine } from '../model/ride';
import { directionEndHotspots, directionEnds, isLoop, type Direction } from '../model/routes';

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
  /**
   * The open loop's tip (useLoopTip): its line is drawn leaving from there and
   * coming back, and its one circle stands on it. A loop lit with no trip open
   * has no ends to circle.
   */
  tipId: string | null = null,
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
  const selectedId = saved.selected?.id ?? null;
  const unmarkedId = startId !== null && ridden === null ? selectedId : null;
  const rides = useMemo(
    () =>
      saved.litDirections.map((v): Ride => {
        if (isLoop(v))
          return loopRide(v, hotspots, selectedId === v.id ? tipId : null, ridden, unmarkedId);
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
    [saved.litDirections, selectedId, hotspots, ridden, unmarkedId, tipId],
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

/**
 * A lit loop as a ride: its line as drawn, or with its trip open, rotated to
 * leave from its tip (tipLine) with one circle there, named for the tip.
 */
function loopRide(
  v: Direction,
  hotspots: readonly Hotspot[],
  tipId: string | null,
  ridden: Ridden | null,
  unmarkedId: string | null,
): Ride {
  const line = tipLine(v, hotspots, tipId);
  const tip = tipId === null ? undefined : hotspots.find((s) => s.id === tipId);
  const name = tip ? hotspotLabel(tip) : (v.name ?? '');
  return {
    id: v.id,
    line,
    ...(ridden?.directionId === v.id ? { pale: ridden.pale, isBackwards: ridden.isBackwards } : {}),
    ...(v.id === unmarkedId ? { isUnmarked: true, pale: [line] } : {}),
    from: name,
    to: name,
    fromHotspot: tip?.id ?? null,
    toHotspot: tip?.id ?? null,
    routeCode: v.route?.routeCode ?? null,
    loopEnd: loopEndOf(tip !== undefined, ridden?.directionId === v.id ? ridden.atTip : undefined),
  };
}

/**
 * What a loop's tip wears on the map: nothing with no trip open, its S at rest
 * and on a ride from it, the E where a ride with a start ends there, and a bare
 * circle where a ride passes through it or stops short.
 */
function loopEndOf(hasTip: boolean, atTip: TipOnRide | undefined): Ride['loopEnd'] {
  if (!hasTip) return 'none';
  if (atTip === 'end') return 'end';
  if (atTip === 'through' || atTip === 'outside') return 'bare';
  return 'start';
}
