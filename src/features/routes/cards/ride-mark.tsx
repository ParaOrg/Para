import { EndIcon, StartIcon } from '@/shared/ui/route-icons';

import type { RideMarkKind } from './timeline-row-role';

/** Start's S a green disc, End's E a red one, each on Content/inverse, as the dot beside it is. */
const MARK = {
  start: 'bg-content-inverse text-map-hotspots-card-hintuan-surface',
  end: 'bg-content-inverse text-card-red-surface',
} satisfies Record<RideMarkKind, string>;

interface RideMarkProps {
  mark: RideMarkKind;
  isSmall?: boolean;
}

/**
 * Where the ride starts and ends, before a row's name, Figma's RouteSigns
 * (4148:12449): Start's circled S and End's circled E, each a disc on a white
 * ring, the letter cut out in white, so the card does not show through it.
 * The S's disc is green, as the map's Head Route wears it; the E's red, as
 * End's pill is, whatever the line; the row's dot wears the same. They move with the picks: the S from the origin to a
 * start picked further on, the E from the destination to a picked end. For the
 * eye: every row that draws one says "start" or "end" after its name. 24 across, as
 * RouteSigns is, 12 after the rail: `isSmall`, on a hintuan's 16/24 line, 6
 * before the name and 10 down as the name's padding is; beside the ends' 20/28,
 * 8 before it and centred on it (Timeline set, 3716:1894).
 */
export function RideMark({ mark, isSmall = false }: RideMarkProps) {
  return (
    <span
      aria-hidden
      data-part={mark}
      className={
        'flex shrink-0 rounded-full *:size-6 ' +
        (isSmall ? 'mt-2.5 ml-3 ' : 'my-0.5 mr-1 ml-1 ') +
        MARK[mark]
      }
    >
      {mark === 'start' ? <StartIcon /> : <EndIcon />}
    </span>
  );
}
