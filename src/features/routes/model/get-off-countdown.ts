import { haversine, lineLength, metresAlong, type LngLat } from '@/shared/utils/geo';

import type { Hotspot } from './hotspots';
import type { DirectionStops } from './one-ride-options';

/**
 * Go here's get-off countdown (.scratch/go-here, ticket 06): how far the commuter still has to
 * ride to their stop, counted in hintuans while any lie between, in metres when none do. The
 * position is read along the direction's line, so a fix beside the road counts as on it, and the
 * count never climbs back when a fix wobbles. Pure: the reminder (ticket 07) says it.
 */

/** Hintuans still to pass before the stop, or metres to it when none lie between, or at it, or past. */
export type Countdown =
  | { kind: 'hintuans'; left: number }
  | { kind: 'metres'; left: number }
  | { kind: 'here' }
  | { kind: 'passed' };

/** Within this many metres of the stop along the line, the commuter is at it. */
export const AT_STOP_M = 60;
/** Further than this past the stop along the line (not a loop), they have ridden past it. */
const PAST_STOP_M = 150;

/** The countdown from `at` to `stop` on `ride`, never climbing above `previous`. */
export function countdownTo<D>(
  ride: DirectionStops<D>,
  stop: Hotspot,
  at: LngLat,
  previous: Countdown | null = null,
): Countdown {
  const here = metresAlong(ride.line, at);
  const target = metresAlong(ride.line, stop.point.coordinates);
  const length = lineLength(ride.line);
  let ahead = target - here;
  if (ahead < 0 && ride.isLoop) ahead += length;
  const fromStop = haversine(at, stop.point.coordinates);
  if (ahead < -PAST_STOP_M) return { kind: 'passed' };
  // The line puts them at the stop but they are far from it: past the line's end, where every fix
  // projects onto its last point.
  if (Math.abs(ahead) <= AT_STOP_M && fromStop > PAST_STOP_M) return { kind: 'passed' };
  if (Math.abs(ahead) <= AT_STOP_M || fromStop <= AT_STOP_M) return { kind: 'here' };
  if (ahead < 0) return previous ?? { kind: 'here' };
  // The hotspots between here and the stop along the line, round the tip on a loop.
  const between = ride.stops.filter((s) => {
    if (s.id === stop.id) return false;
    let along = metresAlong(ride.line, s.point.coordinates) - here;
    if (along < 0 && ride.isLoop) along += length;
    return along > AT_STOP_M && along < ahead - AT_STOP_M;
  }).length;
  const now: Countdown =
    between > 0 ? { kind: 'hintuans', left: between } : { kind: 'metres', left: ahead };
  return steadier(now, previous);
}

/** The rank of a countdown: higher is further from the stop, so a wobble cannot raise it. */
function rank(countdown: Countdown): number {
  if (countdown.kind === 'passed') return -1;
  if (countdown.kind === 'here') return 0;
  return countdown.kind === 'metres' ? 1 : 2;
}

/** `now`, unless it is further from the stop than `previous`: a wobbling fix never counts back up. */
function steadier(now: Countdown, previous: Countdown | null): Countdown {
  if (!previous || previous.kind === 'passed') return now;
  if (rank(now) > rank(previous)) return previous;
  if (now.kind === 'hintuans' && previous.kind === 'hintuans' && now.left > previous.left) {
    return previous;
  }
  if (now.kind === 'metres' && previous.kind === 'metres' && now.left > previous.left) {
    return previous;
  }
  return now;
}

/** What the reminder says, if anything: two hintuans to go, the next is theirs, they are there. */
export type GetOffCue = 'two-to-go' | 'next-is-yours' | 'here' | null;

/** Within this many metres, with no hintuan between, the next stop is theirs. */
const NEXT_IS_YOURS_M = 400;

/** When the reminder speaks (ticket 07 words it): two hintuans to go, then the next, then here. */
export function cueOf(countdown: Countdown): GetOffCue {
  if (countdown.kind === 'here') return 'here';
  if (countdown.kind === 'hintuans') return countdown.left === 2 ? 'two-to-go' : null;
  if (countdown.kind === 'metres')
    return countdown.left <= NEXT_IS_YOURS_M ? 'next-is-yours' : null;
  return null;
}
