import type { TimelineRowState } from './route-stops-timeline-row';

/** A picked ride's rows: the origin is -1, the destination the hintuans' count (rideRows). */
export interface RideRows {
  first: number;
  last: number;
  /** A loop's ride from a start down past the tip to an end above it. */
  wraps?: true;
}

/**
 * Each row's state on the timeline (RouteStopsTimeline, 4611:10957), the origin first and the
 * destination last: with no ride picked, every row Rest; with one, the rows outside it Unselected,
 * its own ends Selected (at the timeline's ends) or SelectedTop / SelectedBottom (mid-timeline), and
 * the rows between Rest. A start alone is no ride yet: its row stands alone, Unselected, as the rest.
 */
export function timelineRowStates(
  hintuanCount: number,
  ride: RideRows | null,
  isStartAlone = false,
): TimelineRowState[] {
  const rows = Array.from({ length: hintuanCount + 2 }, (_, i) => i - 1);
  if (!ride) return rows.map(() => 'rest');
  if (isStartAlone) return rows.map(() => 'unselected');
  const isInRide = (r: number) =>
    ride.wraps ? r <= ride.last || r >= ride.first : r >= ride.first && r <= ride.last;
  return rows.map((r) => {
    if (!isInRide(r)) return 'unselected';
    if (r === ride.first) return r === -1 ? 'selected' : 'selectedTop';
    if (r === ride.last) return r === hintuanCount ? 'selected' : 'selectedBottom';
    return 'rest';
  });
}
