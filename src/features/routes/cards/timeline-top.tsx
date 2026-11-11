import { EndRowPill } from './end-row-pill';
import { END_SIGN_LOOK } from './end-sign';
import { RideMark } from './ride-mark';
import type { RouteTripLineDetailPillContent } from './route-trip-line-detail-pill';
import { TimelineDot } from './timeline-dot';
import type { RideMarkKind } from './timeline-row-role';
import { TimelineStick, type TimelineStickConnection } from './timeline-stick';
import type { Livery } from '../model/liveries';

interface TimelineTopProps {
  livery: Livery;
  rail: string;
  /** ROW_PRESSED's classes for the card's livery. */
  pressed: string;
  routeOrigin: string;
  /** Start's S or End's E before its name, or neither (originMark). */
  mark: RideMarkKind | null;
  /** As the ride's end, its pill after its name; else null. */
  pill: RouteTripLineDetailPillContent | null;
  /** Disconnected where a ride, or a start alone, starts at the first hintuan, or a fold's row by the ride is next: the rail breaks under it. */
  connection: TimelineStickConnection;
  selected: boolean;
  onTap: () => void;
}

/**
 * The timeline's first row (RouteStopsTimeline, in RouteStopsCard 4681:29139): the dot the rail
 * leaves from, and the origin, Medium 17/24 as every stop is, ExtraBold picked; the whole row is
 * its button. Picked, its dot is TimelineDot's Selected one.
 */
export function TimelineTop({
  livery,
  rail,
  pressed,
  routeOrigin,
  mark,
  pill,
  connection,
  selected,
  onTap,
}: TimelineTopProps) {
  return (
    <li data-testid="trip-origin" data-state={selected ? 'selected' : 'rest'}>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onTap}
        className={'flex w-full items-start px-4 text-left ' + pressed}
      >
        <TimelineStick
          variant="top"
          connection={connection}
          rail={rail}
          dot={<TimelineDot rail={mark ? END_SIGN_LOOK[mark].surface : rail} selected={selected} />}
        />
        {mark && <RideMark mark={mark} isSmall />}
        <span
          className={'flex min-w-0 flex-1 items-center gap-2 py-2.5 ' + (mark ? 'pl-1.5' : 'pl-2')}
        >
          <span
            data-part="name"
            className={
              'min-w-0 flex-1 text-base/6 ' + (selected ? 'font-extrabold' : 'font-medium')
            }
          >
            {routeOrigin}
          </span>
          {/* After the name, so the name is still the row's first words; the circled letter is for the eye. */}
          {mark && <span className="sr-only">{mark === 'start' ? ', start' : ', end'}</span>}
          {pill && <EndRowPill livery={livery} pill={pill} />}
        </span>
      </button>
    </li>
  );
}
