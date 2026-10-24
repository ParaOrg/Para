import type { RecordingTrail } from '@/features/routes/map/recording-trail';
import { displayFixes } from '@/features/routes/model/display-path';
import {
  switchFixIndexes,
  waysOf,
  type Fix,
  type Way,
  type WaySwitch,
} from '@/features/routes/model/ride-recording';

/*
 * The one place the page calls the rules for the way a recording is on: lines,
 * markers, auto-stop and the course-up bearing are ride-recording.ts's; this
 * file only puts them in the page's words (papunta and pabalik) and in the
 * shape the map draws.
 */

export {
  courseBearing,
  currentWay,
  shouldAutoStop,
  type Way,
  type WaySwitch,
} from '@/features/routes/model/ride-recording';

/** The way as the contributor reads it. */
export const WAY_LABEL = { outbound: 'Papunta', return: 'Pabalik' } satisfies Record<Way, string>;

/** The way a tap on the way button switches TO. */
export const OTHER_WAY = { outbound: 'return', return: 'outbound' } satisfies Record<Way, Way>;

/**
 * What the map draws of the fixes that count: a blue line per outbound run, an
 * orange one per return run, a dot per switch. The lines are the steadied path
 * (display-path.ts); the switches stay on the fixes they were placed on, and
 * the contributor's dot is the last fix as the phone reported it.
 */
export function trailOf(kept: readonly Fix[], switches: readonly WaySwitch[]): RecordingTrail {
  const ways = waysOf(displayFixes(kept, switchFixIndexes(kept, switches)), switches);
  return {
    lines: [
      ...ways.outboundLines.map((path) => ({ way: 'outbound' as const, path })),
      ...ways.returnLines.map((path) => ({ way: 'return' as const, path })),
    ],
    markers: ways.markers.map((marker) => ({ at: marker.at, way: marker.to })),
    here: kept[kept.length - 1]?.at ?? null,
  };
}
