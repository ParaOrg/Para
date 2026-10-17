import type { RideTrail } from '@/features/routes/map/ride-trail';
import { waysOf, type Fix, type Way, type WaySwitch } from '@/features/routes/model/ride-recording';

/*
 * The one place the page calls the rules for the way a ride is on: legs,
 * markers, auto-stop and the course-up bearing are ride-recording.ts's; this
 * file only puts them in the page's words (papunta and pabalik) and in the
 * shape the map draws.
 */

export {
  courseBearing,
  shouldAutoStop,
  type Way,
  type WaySwitch,
} from '@/features/routes/model/ride-recording';

/** The way as the contributor reads it. */
export const WAY_LABEL = { outbound: 'Papunta', return: 'Pabalik' } satisfies Record<Way, string>;

/** The way a tap on the leg button switches TO. */
export const OTHER_WAY = { outbound: 'return', return: 'outbound' } satisfies Record<Way, Way>;

/** A recording starts outbound; from then on it is on the way of its latest switch. */
export function currentWay(switches: readonly WaySwitch[]): Way {
  let latest: WaySwitch | undefined;
  for (const waySwitch of switches)
    if (!latest || waySwitch.time >= latest.time) latest = waySwitch;
  return latest?.to ?? 'outbound';
}

/** What the map draws of the fixes that count: a blue line per outbound run, an orange one per return run, a dot per switch. */
export function trailOf(kept: readonly Fix[], switches: readonly WaySwitch[]): RideTrail {
  const ways = waysOf(kept, switches);
  return {
    legs: [
      ...ways.outboundLines.map((path) => ({ direction: 'papunta' as const, path })),
      ...ways.returnLines.map((path) => ({ direction: 'pabalik' as const, path })),
    ],
    markers: ways.markers.map((marker) => marker.at),
    here: kept[kept.length - 1]?.at ?? null,
  };
}
