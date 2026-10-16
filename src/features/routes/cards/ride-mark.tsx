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
 * Where the ride starts and ends, before a row's name, Figma's RouteSigns
 * (4148:12449): Start's circled S and End's circled E, each a disc on a white
 * ring, the letter in white, so the disc and the letter do not show the card
 * through. The S's disc is green, as the map's Head Route wears it; the E's
 * the card's colour, the pill's (TIMELINE_PILL: a train's line's
 * Timeline/surface). They move with the picks: the S from the origin to a
 * start picked further on, the E from the destination to a picked end. For the
 * eye: a hintuan's row says "start" or "end" after its name. 24 across, as
 * RouteSigns is, 12 after the rail: `isSmall`, on a hintuan's 16/24 line, 6
 * before the name and 10 down as the name's padding is; beside the ends' 20/28,
 * 8 before it and centred on it (Timeline set, 3716:1894).
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
