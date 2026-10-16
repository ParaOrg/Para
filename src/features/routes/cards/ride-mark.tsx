import { EndIcon, StartIcon } from '@/shared/ui/route-icons';

import { TIMELINE_PILL } from './livery-card';
import type { RideMarkKind } from './timeline-row-role';
import type { Livery } from '../model/liveries';

/** Start's S: a green disc (the hintuans' Head Route green) on Content/inverse. */
const START_MARK = 'bg-content-inverse text-map-hotspots-card-hintuan-surface';

interface RideMarkProps {
  mark: RideMarkKind;
  livery: Livery;
  isSmall?: boolean;
}

/**
 * Where the ride starts and ends, before a row's name, the owner's
 * RouteSigns (4148:12449): Start's circled S and End's circled E, each a
 * disc on a white ring, the letter in white (his "start has white background
 * and green icon color, E should have white background too", 2026-10-16:
 * on the card till then, the S's disc and the E's letter showed the card
 * through). The S's disc is green, as the map's Head Route wears it; the
 * E's the card's colour, the pill's (TIMELINE_PILL: a train's line's
 * Timeline/surface). They move with the picks (his TimelineRouteDetail,
 * 2026-10-15): the S from the origin to a start picked further on, the E
 * from the destination to a picked end. For the eye: a hintuan's row says
 * "start" or "end" after its name, and the ends' rows are where a ride
 * leaves and goes, as before. 24 across, as RouteSigns is, 12 after the
 * rail: `isSmall`, on a hintuan's 16/24 line, 6 before the name and 10
 * down as the name's padding is; beside the ends' 20/28, 8 before it and
 * centred on it (the owner's Timeline set, 3716:1894, "new spacing
 * changes", 2026-10-16; 6 and 8 down until then).
 */
export function RideMark({ mark, livery, isSmall = false }: RideMarkProps) {
  return (
    <span
      aria-hidden
      data-part={mark}
      className={
        'flex shrink-0 rounded-full *:size-6 ' +
        (isSmall ? 'mt-2.5 ml-3 ' : 'my-0.5 mr-1 ml-1 ') +
        (mark === 'start' ? START_MARK : TIMELINE_PILL[livery])
      }
    >
      {mark === 'start' ? <StartIcon /> : <EndIcon />}
    </span>
  );
}
