import { lineLength } from '@/shared/utils/geo';

import { FREE, type Fare, type Fares } from './trip-fare';
import { otherDirection } from '../model/departures';
import { manilaDate, rideFare } from '../model/fares';
import { railFares } from '../model/rail-fares';
import {
  directionEnds,
  directionLine,
  isDrawn,
  isFerry,
  isLoop,
  isRail,
  railLineOf,
  type Direction,
} from '../model/routes';
import { directionRowParts } from '../model/row-name';
import type { Timeline } from '../model/timeline';

/** What a trip card shows of its direction, worked out from the map file (tripFacts). */
interface TripFacts {
  isLoop: boolean;
  /** Where it leaves from and goes to: a loop's both its tip, as the timeline reads it. */
  from: string;
  to: string;
  /** The route's via, under End's place; undefined with none, or on a loop. */
  via: string | undefined;
  /** Its rail line on a train, for the stations' codes; else null. */
  line: ReturnType<typeof railLineOf>;
  /** The same route the other way, if the map file has it. */
  sibling: Direction | null;
  /** Whether that other way is drawn, so ⇅ can turn to it; a loop has no way back. */
  isSwitchable: boolean;
  /** Whether the other way is in the map file but not drawn yet (the studio draws it). */
  isOtherWayUndrawn: boolean;
  /**
   * The whole ride, measured once on its full line: the index's figure, so an overview drawn while
   * the line is read never prices it. Its Distance and its Expected fare.
   */
  metres: number;
}

/** A trip's direction as its card shows it: its ends and via, its way back, its length. */
export function tripFacts(
  direction: Direction,
  directions: readonly Direction[],
  timeline: Timeline,
): TripFacts {
  const loop = isLoop(direction);
  const { from, to } =
    loop && timeline.from
      ? { from: timeline.from.label, to: (timeline.to ?? timeline.from).label }
      : directionEnds(direction);
  const sibling = otherDirection(directions, direction);
  return {
    isLoop: loop,
    from,
    to,
    via: directionRowParts(direction).via ?? undefined,
    line: railLineOf(direction),
    sibling,
    isSwitchable: !loop && !!sibling && isDrawn(sibling),
    isOtherWayUndrawn: !loop && !!sibling && !isDrawn(sibling),
    metres: direction.metres ?? lineLength(directionLine(direction)),
  };
}

/** A ride's pesos, regular and discounted, for the fare tile; undefined when no fare rule prices it. A train's are by its stations (railFares). */
function faresFor(mode: Parameters<typeof rideFare>[0], metres: number): Fares | undefined {
  const date = manilaDate();
  const regular = rideFare(mode, metres, date);
  const discounted = rideFare(mode, metres, date, 'discounted');
  return regular && discounted ? { regular, discounted } : undefined;
}

/** The whole ride's fare: a train's by its stations (railFares), the ferry's free, a jeep's by its metres. */
export function fareFor(
  direction: Direction,
  metres: number,
  timeline: Timeline,
): Fare | undefined {
  if (isFerry(direction.route?.mode)) return FREE;
  if (isRail(direction.route?.mode))
    return railFares(direction.route.routeCode, timeline.from?.label, timeline.to?.label);
  return faresFor(direction.route?.mode, metres);
}

/**
 * The fare of the ride between the picks: a jeep's by the metres between them, a train's by the two
 * stations (railFares takes any pair, whichever way round), the ferry's free. A start left at the
 * origin is that end of the timeline, and an end row picked with a start (`endPicked`) is its own
 * end. No end picked, no ride to price: a start alone is no ride yet.
 */
export function pickedFareFor(
  direction: Direction,
  pickedMetres: number | undefined,
  timeline: Timeline,
  start: string | null,
  picked: string | null,
  endPicked: 'from' | 'to' | null,
): Fare | undefined {
  // A start alone is no ride yet: nothing to price until its end is picked.
  const isEndRow = start !== null && endPicked !== null;
  if (picked === null && !isEndRow) return undefined;
  if (isFerry(direction.route?.mode)) return FREE;
  if (isRail(direction.route?.mode)) {
    const labelOf = (id: string | null, end: Timeline['from']) =>
      id === null ? end?.label : timeline.between.find((r) => r.id === id)?.label;
    const from = labelOf(start, timeline.from);
    const to = labelOf(picked, endPicked === 'from' ? timeline.from : timeline.to);
    return railFares(direction.route.routeCode, from, to);
  }
  return pickedMetres === undefined ? undefined : faresFor(direction.route?.mode, pickedMetres);
}

/** A board as the publish writes it, beside the map's own files. */
export const publishedSignboard = (name: string): string =>
  `/data/signboards/${encodeURIComponent(name)}`;
