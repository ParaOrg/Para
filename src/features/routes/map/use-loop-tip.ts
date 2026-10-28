import { useState, type RefObject } from 'react';

import type { LngLat } from '@/shared/utils/geo';

import type { Hotspot } from '../model/hotspots';
import { usableNear, type CommuterWhere } from '../model/loop-tip';
import { directionLine, isLoop, type Direction } from '../model/routes';
import { loopTip } from '../model/timeline';

/**
 * Where an open loop's trip starts, as a row's id (loopTip): null for a trip
 * that is no loop or none open. Chosen once, as the trip opens, and kept until
 * it closes: where the commuter is then, or the place it was opened from,
 * never read again, so a fix a minute later cannot move the rows under the
 * rider. Closed and opened again, it is chosen afresh.
 */
export function useLoopTip(
  trip: Direction | null,
  hotspots: { hotspotsAlong: (directionId: string, line: readonly LngLat[]) => Hotspot[] },
  from: {
    /**
     * The commuter's place, if the locator has one: read only as the trip
     * opens, so a ref, which a new fix changes without rendering the page.
     */
    where: RefObject<CommuterWhere | null> | null;
    /** The place whose card the trip was opened from, if any. */
    openedFrom: Hotspot | null;
  },
): string | null {
  const [chosen, setChosen] = useState<{ directionId: string; tipId: string | null } | null>(null);
  if (trip && isLoop(trip)) {
    if (chosen?.directionId !== trip.id) {
      const along = hotspots.hotspotsAlong(trip.id, directionLine(trip));
      const near = usableNear(along, from.where?.current ?? null);
      setChosen({ directionId: trip.id, tipId: loopTip(along, near, from.openedFrom) });
    }
  } else if (chosen) {
    setChosen(null);
  }
  return trip && chosen?.directionId === trip.id ? chosen.tipId : null;
}
