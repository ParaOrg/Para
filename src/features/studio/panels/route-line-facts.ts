import { TRANSPORT_MODE_LABEL } from '@/features/routes/cards/route-modes';
import { fareFor, tripFacts } from '@/features/routes/cards/trip-facts';
import { farePesos } from '@/features/routes/cards/trip-fare';
import type { OtherRoute } from '@/features/routes/cards/trip-more-routes';
import { otherRoutesFrom } from '@/features/routes/model/departures';
import { MODES, isLoop, railLineOf, type Direction } from '@/features/routes/model/routes';
import { directionRowParts, rowName } from '@/features/routes/model/row-name';
import type { Timeline, TimelineRow } from '@/features/routes/model/timeline';
import { vehicleOf } from '@/features/routes/model/vehicles';
import { kmLabel } from '@/shared/utils/geo';

import type { RouteSummaryFact } from './route-summary-card';
import type { TransitLineFact } from './transit-line-info';

/**
 * Where a route stands: a draft stored for it, what is on the map, or not known yet (its draft
 * still being read, or not readable).
 */
export type RouteStatus = 'draft' | 'published' | 'unknown';

// Not known reads "--", as a fact not worked out yet does in Edit Route (line-detail.tsx).
const STATUS_LABEL = {
  draft: 'Draft',
  published: 'Published',
  unknown: '--',
} satisfies Record<RouteStatus, string>;

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

/** The Status of a route: a draft only is a draft; otherwise whether one is stored, once read. */
export function routeStatus(isDraftOnly: boolean, hasDraft: boolean | undefined): RouteStatus {
  if (isDraftOnly || hasDraft) return 'draft';
  return hasDraft === undefined ? 'unknown' : 'published';
}

/**
 * The summary card for a direction (4915:2713): where it runs from and to, its via, and whether a
 * draft of it waits. No Via row with no via.
 */
export function routeSummaryFacts(
  direction: Direction,
  directions: readonly Direction[],
  timeline: Timeline,
  status: RouteStatus,
): RouteSummaryFact[] {
  const { from, to, via } = tripFacts(direction, directions, timeline);
  return [
    { label: 'Origin', value: from },
    { label: 'Destination', value: rowName({ to, via: via ?? null }) },
    ...(via ? [{ label: 'Via', value: via }] : []),
    { label: 'Status', value: STATUS_LABEL[status], isAlert: status === 'draft' },
  ];
}

/**
 * Transit line information for a direction (4905:28373): its regular fare, its mode, its length
 * and its stops. A road vehicle's mode reads as a trip's Transport mode tile does ("Jeep"); a
 * train, P2P or tricycle keeps the studio's own word (MODES).
 */
export function transitLineFacts(
  direction: Direction,
  directions: readonly Direction[],
  timeline: Timeline,
): TransitLineFact[] {
  const { metres } = tripFacts(direction, directions, timeline);
  const fare = fareFor(direction, metres, timeline);
  const stops = routeStops(timeline, isLoop(direction)).length;
  return [
    { label: 'Regular fare', value: fare ? farePesos(fare, false) : 'Not priced yet' },
    { label: 'Transport mode', value: modeLabel(direction) ?? 'Not set yet' },
    { label: 'Distance', value: kmLabel(metres) },
    { label: 'Stops', value: String(stops) },
  ];
}

function modeLabel(direction: Direction): string | undefined {
  const vehicle = vehicleOf(direction);
  if (vehicle && !railLineOf(direction)) return TRANSPORT_MODE_LABEL[vehicle];
  return MODES.find((m) => m.value === direction.route?.mode)?.label;
}

/** The other routes out of where `direction` starts, as Other destinations lists them. */
export function otherDestinations(
  direction: Direction,
  directions: readonly Direction[],
): OtherRoute[] {
  return otherRoutesFrom(directions, direction).map((v) => ({ id: v.id, ...directionRowParts(v) }));
}
