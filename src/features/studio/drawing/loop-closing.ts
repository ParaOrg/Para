import type { Hotspot } from '@/features/routes/model/hotspots';
import { travelLine } from '@/features/routes/model/ride';
import { directionLine, type DirectionRow } from '@/features/routes/model/routes';
import { haversine, type LngLat } from '@/shared/utils/geo';

/*
 * Jeepney routes are mostly paikot: papunta runs from the head to the
 * turnaround, and pabalik comes back by other streets to the head. The data
 * stays two directions; these rules only help the editor join their lines
 * into one circle. Pure, so tests/unit/loop-closing-test.mjs can hold them.
 */

/** A return trip that starts or ends farther than this from the other way's end is said to leave a gap. */
export const LOOP_GAP_M = 15;

/** The other way's line in travel order, when it is long enough to have two ends. */
export type OutboundLine = readonly LngLat[];

const copyOf = ([lng, lat]: LngLat): LngLat => [lng, lat];

/** Where the outbound line ends, its dot: a return trip's start gap is measured from here. */
export function returnTripStart(outbound: OutboundLine): LngLat | null {
  return outbound.length >= 2 ? copyOf(outbound[outbound.length - 1]) : null;
}

/** Where a return trip ends to close the loop: the outbound line's first point. */
export function loopClosingPoint(outbound: OutboundLine): LngLat | null {
  return outbound.length >= 2 ? copyOf(outbound[0]) : null;
}

/** How far a drawn line's two ends are from where the loop joins; null where the end is not there yet. */
export interface LoopGaps {
  /** From the drawn line's first point to the outbound line's last. */
  startM: number | null;
  /** From the drawn line's last point to the outbound line's first. A lone point is a start, not an end. */
  endM: number | null;
}

export function loopGaps(outbound: OutboundLine, drawn: readonly LngLat[]): LoopGaps {
  const start = returnTripStart(outbound);
  const closing = loopClosingPoint(outbound);
  if (!start || !closing || drawn.length === 0) return { startM: null, endM: null };
  return {
    startM: haversine(drawn[0], start),
    endM: drawn.length >= 2 ? haversine(drawn[drawn.length - 1], closing) : null,
  };
}

/** A last point this near the loop's close counts as closed: a second one would only double it. */
const CLOSED_WITHIN_M = 1;

/**
 * The points a loop's line needs before it can close on its own first point:
 * fewer would be a line out and back, which goes round nothing.
 */
const OWN_LOOP_POINTS = 3;

/**
 * Why "Close the loop" cannot be pressed yet; null when it can. A line that
 * closes on its own first point (`ownStart`) needs OWN_LOOP_POINTS first.
 */
export function whyCannotCloseLoop(
  drawn: readonly LngLat[],
  closeAt: LngLat,
  ownStart = false,
): string | null {
  const last = drawn[drawn.length - 1];
  if (!last) return 'add a point first';
  if (ownStart && drawn.length < OWN_LOOP_POINTS) {
    const missing = OWN_LOOP_POINTS - drawn.length;
    return `add ${missing === 1 ? 'one more point' : `${missing} more points`} first`;
  }
  return haversine(last, closeAt) <= CLOSED_WITHIN_M ? 'the loop is closed' : null;
}

/**
 * What the save panel notes when the loop is not closed: each end farther than LOOP_GAP_M from
 * where the other way (`otherName`, as its tab names it) joins it. It never blocks a save.
 */
export function loopNotices(
  outbound: OutboundLine,
  drawn: readonly LngLat[],
  otherName: string,
): string[] {
  const { startM, endM } = loopGaps(outbound, drawn);
  const notices: string[] = [];
  if (startM !== null && startM > LOOP_GAP_M) {
    notices.push(`This line starts ${Math.round(startM)} m from where ${otherName} ends.`);
  }
  if (endM !== null && endM > LOOP_GAP_M) {
    notices.push(`This line ends ${Math.round(endM)} m from where ${otherName} starts.`);
  }
  return notices;
}

/**
 * The line of the route's other direction, in travel order, when this one is
 * being drawn into the route's empty slot; null while it has none to join.
 */
export function outboundFor(
  directions: readonly DirectionRow[],
  routeId: string,
  hotspots: readonly Hotspot[],
): OutboundLine | null {
  const drawn = directions.find((v) => v.routeId === routeId && directionLine(v).length >= 2);
  if (!drawn) return null;
  const line = travelLine(drawn, hotspots);
  return line.length >= 2 ? line : null;
}

/** The save panel's notices for a line drawn into a route's slot, `otherName` its other way's. */
export function returnTripNotices(
  directions: readonly DirectionRow[],
  routeId: string | null,
  hotspots: readonly Hotspot[],
  drawn: readonly LngLat[],
  otherName: string,
): string[] {
  const outbound = routeId ? outboundFor(directions, routeId, hotspots) : null;
  return outbound ? loopNotices(outbound, drawn, otherName) : [];
}

/** The outbound line faintly under the drawing, with its start (a ring) and end (a dot) marked. */
export interface OutboundFeature {
  type: 'Feature';
  properties: { role: 'line' | 'start' | 'end' };
  geometry: { type: 'LineString'; coordinates: LngLat[] } | { type: 'Point'; coordinates: LngLat };
}

export function outboundFeatures(outbound: OutboundLine | null): {
  type: 'FeatureCollection';
  features: OutboundFeature[];
} {
  const start = outbound && loopClosingPoint(outbound);
  const end = outbound && returnTripStart(outbound);
  if (!outbound || !start || !end) return { type: 'FeatureCollection', features: [] };
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { role: 'line' },
        geometry: { type: 'LineString', coordinates: [...outbound] },
      },
      {
        type: 'Feature',
        properties: { role: 'start' },
        geometry: { type: 'Point', coordinates: start },
      },
      {
        type: 'Feature',
        properties: { role: 'end' },
        geometry: { type: 'Point', coordinates: end },
      },
    ],
  };
}
