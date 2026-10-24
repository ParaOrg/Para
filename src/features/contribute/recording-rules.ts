import type { RecordingTrail } from '@/features/routes/map/recording-trail';
import { displayFixes } from '@/features/routes/model/display-path';
import {
  switchFixIndexes,
  waysOf,
  type Fix,
  type Way,
  type WaySwitch,
} from '@/features/routes/model/ride-recording';

import { markFixIndexes } from './recording-marks';
import type { MarkRow } from './recording-schema';

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
 * orange one per return run, a dot per switch, and a pin per mark. The lines are
 * the steadied path (display-path.ts); the fixes a switch or a mark sits on are
 * kept as they are, so each marker and pin lies on the line.
 */
export function trailOf(
  kept: readonly Fix[],
  switches: readonly WaySwitch[],
  marks: readonly MarkRow[] = [],
): RecordingTrail {
  const markIndexes = markFixIndexes(kept, marks);
  const pinned = [...switchFixIndexes(kept, switches), ...markIndexes];
  const ways = waysOf(displayFixes(kept, pinned), switches);
  return {
    lines: [
      ...ways.outboundLines.map((path) => ({ way: 'outbound' as const, path })),
      ...ways.returnLines.map((path) => ({ way: 'return' as const, path })),
    ],
    markers: ways.markers.map((marker) => ({ at: marker.at, way: marker.to })),
    marks: markIndexes.map((index) => ({ at: kept[index].at })),
  };
}
