import type { RecordingTrail } from '@/features/routes/map/recording-trail';
import { displayFixes } from '@/features/routes/model/display-path';
import {
  modeFixIndexes,
  modesOf,
  type Fix,
  type Mode,
  type ModeSwitch,
} from '@/features/routes/model/ride-recording';

import { markFixIndexes } from './recording-marks';
import type { MarkRow } from '../storage/recording-schema';

/*
 * The one place the page calls the rules for the mode a recording is on: lines
 * and markers are ride-recording.ts's; this file only
 * puts them in the page's words (Lakad and Sakay) and in the shape the map draws.
 */

export { currentMode, type Mode } from '@/features/routes/model/ride-recording';

/** The mode as the contributor reads it. */
export const MODE_LABEL = { walk: 'Lakad', ride: 'Sakay' } satisfies Record<Mode, string>;

/** The mode a tap on the mode button switches TO. */
export const OTHER_MODE = { walk: 'ride', ride: 'walk' } satisfies Record<Mode, Mode>;

/**
 * What the map draws of the fixes that count: a line per walked or ridden run,
 * a dot per switch, and a pin per mark. The lines are the steadied path
 * (display-path.ts); the fixes a switch or a mark sits on are kept as they
 * are, so each marker and pin lies on the line.
 */
export function trailOf(
  kept: readonly Fix[],
  modes: readonly ModeSwitch[],
  marks: readonly MarkRow[] = [],
): RecordingTrail {
  const markIndexes = markFixIndexes(kept, marks);
  const pinned = [...modeFixIndexes(kept, modes), ...markIndexes];
  const split = modesOf(displayFixes(kept, pinned), modes);
  return {
    lines: [
      ...split.walkLines.map((path) => ({ mode: 'walk' as const, path })),
      ...split.rideLines.map((path) => ({ mode: 'ride' as const, path })),
    ],
    markers: split.markers.map((marker) => ({ at: marker.at, mode: marker.to })),
    marks: markIndexes.map((index) => ({ at: kept[index].at })),
  };
}
