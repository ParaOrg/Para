import type { RouteStopSignKind } from './route-stop-sign';
import { RouteStopSlot } from './route-stop-slot';
import type { TimelineRowState } from './route-stops-timeline-row';
import { RouteStopsTimelineRow } from './route-stops-timeline-row';
import type { RouteTripLineDetailPillContent } from './route-trip-line-detail-pill';
import { TimelineRowTap } from './timeline-row-tap';
import type { Livery } from '../model/liveries';

interface TimelineTopProps {
  livery: Livery;
  rail: string;
  /** A row's pressed look (STOP_PRESSED). */
  pressed: string;
  routeOrigin: string;
  /** Start's S or End's E in its slot, or neither (originMark). */
  mark: RouteStopSignKind | null;
  /** As the ride's end, its pill in its slot; else null. */
  pill: RouteTripLineDetailPillContent | null;
  /** On a train, the origin station's code; null on the road or unknown. */
  code?: string | null;
  /** Its row's state (timelineRowStates). */
  state: TimelineRowState;
  selected: boolean;
  /** The row tapped; omitted, the row is not a control (TimelineRowTap). */
  onTap?: () => void;
}

/**
 * The timeline's first stop (RouteStopsTimeline Top, 4611:10957): the origin; the whole row is its
 * button, which shows that end, or with a start picked makes it the ride's end.
 */
export function TimelineTop({
  livery,
  rail,
  pressed,
  routeOrigin,
  mark,
  pill,
  code = null,
  state,
  selected,
  onTap,
}: TimelineTopProps) {
  return (
    <li data-testid="trip-origin" data-state={selected ? 'selected' : 'rest'}>
      <TimelineRowTap onTap={onTap} isSelected={selected} pressed={pressed}>
        <RouteStopsTimelineRow
          variant="top"
          state={state}
          rail={rail}
          label={<span data-part="name">{routeOrigin}</span>}
          slot={<RouteStopSlot livery={livery} sign={mark} pill={pill} code={code} />}
        />
      </TimelineRowTap>
    </li>
  );
}
