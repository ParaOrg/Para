import { fareFor, tripFacts } from '@/features/routes/cards/trip-facts';
import { farePesos } from '@/features/routes/cards/trip-fare';
import type { OtherRoute } from '@/features/routes/cards/trip-more-routes';
import { otherRoutesFrom } from '@/features/routes/model/departures';
import { MODES, isLoop, type Direction } from '@/features/routes/model/routes';
import { directionRowParts, rowName } from '@/features/routes/model/row-name';
import type { Timeline, TimelineRow } from '@/features/routes/model/timeline';
import { kmLabel } from '@/shared/utils/geo';

import type { TransitLineFact } from './transit-line-info';

/**
 * A direction's stops in the order it rides them: its start, its hintuans, its end. A loop leaves
 * from its tip and comes back to it, so the tip is listed once, at the top, never again at the
 * foot as a second stop of the same name.
 */
export function routeStops(timeline: Timeline, isLoopRoute: boolean): TimelineRow[] {
  const rows = isLoopRoute
    ? [timeline.from, ...timeline.between]
    : [timeline.from, ...timeline.between, timeline.to];
  return rows.filter((row) => row !== null);
}

/**
 * Transit line information for a direction (4905:28373): where it runs from and to, its via, its
 * regular fare, its mode by its full name, its length and its stops. No Via row with no via.
 */
export function transitLineFacts(
  direction: Direction,
  directions: readonly Direction[],
  timeline: Timeline,
): TransitLineFact[] {
  const { from, to, via, metres } = tripFacts(direction, directions, timeline);
  const fare = fareFor(direction, metres, timeline);
  const mode = MODES.find((m) => m.value === direction.route?.mode)?.label;
  const stops = routeStops(timeline, isLoop(direction)).length;
  return [
    { label: 'Origin', value: from },
    { label: 'Destination', value: rowName({ to, via: via ?? null }) },
    ...(via ? [{ label: 'Via', value: via }] : []),
    { label: 'Regular fare', value: fare ? farePesos(fare, false) : 'Not priced yet' },
    { label: 'Transport mode', value: mode ?? 'Not set yet' },
    { label: 'Distance', value: kmLabel(metres) },
    { label: 'Stops', value: String(stops) },
  ];
}

/** The other routes out of where `direction` starts, as Other destinations lists them. */
export function otherDestinations(
  direction: Direction,
  directions: readonly Direction[],
): OtherRoute[] {
  return otherRoutesFrom(directions, direction).map((v) => ({ id: v.id, ...directionRowParts(v) }));
}
