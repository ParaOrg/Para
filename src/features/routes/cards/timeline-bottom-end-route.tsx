import { RouteStopSlot, SignWords } from './route-stop-slot';
import type { TimelineRowState } from './route-stops-timeline-row';
import { RouteStopsTimelineRow } from './route-stops-timeline-row';
import type { RouteTripLineDetailPillContent } from './route-trip-line-detail-pill';
import type { Livery } from '../model/liveries';

interface TimelineBottomEndRouteProps {
  livery: Livery;
  rail: string;
  /** ROW_PRESSED's classes for the card's livery. */
  pressed: string;
  routeDirection: string;
  /** Whether the ride ends here: End's E in its slot. */
  isEnd: boolean;
  /** As the ride's end with a start, its pill in its slot; else null. */
  pill: RouteTripLineDetailPillContent | null;
  /** On a train, the destination station's code; null on the road or unknown. */
  code?: string | null;
  /** Its row's state (timelineRowStates). */
  state: TimelineRowState;
  /** Under the card's clip, the stops folded: out of reach of a keyboard too. */
  isFolded: boolean;
  selected: boolean;
  onTap: () => void;
}

/**
 * The timeline's last stop (RouteStopsTimeline Bottom, 4611:10957): where the trip goes; the whole
 * row is its button, which shows that end, or with a start picked makes it the ride's end.
 */
export function TimelineBottomEndRoute({
  livery,
  rail,
  pressed,
  routeDirection,
  isEnd,
  pill,
  code = null,
  state,
  isFolded,
  selected,
  onTap,
}: TimelineBottomEndRouteProps) {
  const sign = isEnd ? 'end' : null;
  return (
    <li data-testid="trip-destination" data-state={selected ? 'selected' : 'rest'} inert={isFolded}>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onTap}
        className={'flex w-full text-left ' + pressed}
      >
        <RouteStopsTimelineRow
          variant="bottom"
          state={state}
          rail={rail}
          label={
            <>
              <span data-part="name">{routeDirection}</span>
              <SignWords sign={sign} />
            </>
          }
          slot={<RouteStopSlot livery={livery} sign={sign} pill={pill} code={code} />}
        />
      </button>
    </li>
  );
}
