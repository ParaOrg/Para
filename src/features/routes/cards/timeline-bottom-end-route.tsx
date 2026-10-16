import { EndRowPill } from './end-row-pill';
import { RideMark } from './ride-mark';
import type { RouteTripLineDetailPillContent } from './route-trip-line-detail-pill';
import { TimelineDot } from './timeline-dot';
import { TimelineStick, type TimelineStickConnection } from './timeline-stick';
import type { Livery } from '../model/liveries';

interface TimelineBottomEndRouteProps {
  livery: Livery;
  rail: string;
  /** ROW_PRESSED's classes for the card's livery. */
  pressed: string;
  routeDirection: string;
  /** Where the ride ends, End's E before its name: no hintuan picked as the end, and no start alone (Variant3), or picked itself with a start kept. */
  isEnd: boolean;
  /** As the ride's end, its pill after its name; else null. */
  pill: RouteTripLineDetailPillContent | null;
  /** Disconnected where a ride, or a start alone, ends at the last hintuan, or a closed fold's row by the ride is just above: the rail breaks above it. */
  connection: TimelineStickConnection;
  selected: boolean;
  onTap: () => void;
}

/**
 * Figma's TimelineBottomEndRoute: the rail's last dot, and where the trip
 * goes, behind End's circled E (3778:3183), as the map's end label has it;
 * the whole row is its button. Picked, its dot is TimelineDot's Selected one.
 */
export function TimelineBottomEndRoute({
  livery,
  rail,
  pressed,
  routeDirection,
  isEnd,
  pill,
  connection,
  selected,
  onTap,
}: TimelineBottomEndRouteProps) {
  return (
    <li data-testid="trip-destination" data-state={selected ? 'selected' : 'rest'}>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onTap}
        className={'flex w-full items-center px-4 pb-4 text-left ' + pressed}
      >
        <TimelineStick
          variant="bottom"
          connection={connection}
          rail={rail}
          dot={<TimelineDot rail={rail} selected={selected} />}
        />
        <span className={'flex min-w-0 flex-1 items-start gap-1 pt-3 ' + (isEnd ? 'pl-2' : 'pl-3')}>
          {isEnd && <RideMark mark="end" livery={livery} />}
          {/* Bold, Figma's text-xl/bold, as the trip frame draws it. The Timeline
              set (3716:1894) draws it Medium, ExtraBold picked. */}
          <span className="min-w-0 flex-1 text-xl/7 font-bold">{routeDirection}</span>
          {pill && <EndRowPill livery={livery} pill={pill} />}
        </span>
      </button>
    </li>
  );
}
