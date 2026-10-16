import { EndRowPill } from './end-row-pill';
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
 * Figma's TimelineTop: the dot the rail leaves from, and the origin in SN Pro
 * ExtraBold 20/28 (the owner's TimelineRouteDetailCard of 2026-10-13, 3778:3183;
 * Black 24/32 until then); the whole row is its button. Picked, its dot is
 * TimelineDot's Selected one. Its name is 12 above the first row (the
 * owner's Timeline set, 3716:1894, "new spacing changes", 2026-10-16; 8
 * from 2026-10-13).
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
        className={'flex w-full items-center px-4 pt-4 text-left ' + pressed}
      >
        <TimelineStick
          variant="top"
          connection={connection}
          rail={rail}
          dot={<TimelineDot rail={rail} selected={selected} />}
        />
        <span className="flex min-w-0 flex-1 items-start gap-1 pb-3 pl-2">
          {mark && <RideMark mark={mark} livery={livery} />}
          {/* At a sheet's Low, one line of it (sheetGesture's LOW_PX); from Middle up, all of it. */}
          <span
            className={
              'min-w-0 flex-1 text-xl/7 font-extrabold sheet-low:line-clamp-1' +
              (mark ? '' : ' pl-1')
            }
          >
            {routeOrigin}
          </span>
          {pill && <EndRowPill livery={livery} pill={pill} />}
        </span>
      </button>
    </li>
  );
}
