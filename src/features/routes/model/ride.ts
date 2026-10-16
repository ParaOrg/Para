import { haversine, lineLength, type LngLat } from '@/shared/utils/geo';

import { hotspotRing, type Hotspot } from './hotspots';
import { placeKey } from './places';
import { servedBy, directionLine, type Direction } from './routes';
import { drawnFromTheEnd, timelineFor, type Timeline, type TimelineRow } from './timeline';
import { passStretches } from '../geo/pass';

/*
 * A direction ridden: its line in the jeep's order, its timeline of
 * hintuans, and the ride cut short at one. Split from routes.ts, 2026-09-29.
 */

/**
 * A saved direction as a string of places, for its card: its route's two ends
 * resolved to hotspots, and the hotspots its links say it passes, in order.
 */
export function routeTimeline(
  v: Direction,
  hotspots: readonly Hotspot[],
  along: readonly Hotspot[],
): Timeline {
  const head = hotspots.find((s) => s.id === v.route?.headHotspotId) ?? null;
  const tail = hotspots.find((s) => s.id === v.route?.tailHotspotId) ?? null;
  return timelineFor(head, tail, v.reversed, along, directionLine(v)[0]);
}

/** Distance along the line of a point lying on it: the first segment that holds the point wins. */
function distanceAlong(line: readonly LngLat[], p: LngLat): number {
  let cum = 0;
  for (let i = 1; i < line.length; i++) {
    const ab = haversine(line[i - 1], line[i]);
    const ap = haversine(line[i - 1], p);
    // On the segment when going a → p → b adds nothing to a → b.
    if (ap + haversine(p, line[i]) - ab < 0.05) return cum + ap;
    cum += ab;
  }
  return cum;
}

/** The point `metres` along the line, and the last vertex before it. */
function pointAt(line: readonly LngLat[], metres: number): { point: LngLat; index: number } {
  let cum = 0;
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1], line[i]];
    const seg = haversine(a, b);
    if (cum + seg >= metres && seg > 0) {
      const t = (metres - cum) / seg;
      return { point: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], index: i - 1 };
    }
    cum += seg;
  }
  return { point: line[line.length - 1], index: line.length - 2 };
}

/** One get-off circle of the ride-to preview: a mini hotspot, the middle of its orange stretch, and how far in that is. */
export interface RideDot {
  hotspotId: string;
  at: LngLat;
  metres: number;
}

/**
 * The ride cut short at one hintuan — what tapping a timeline row previews,
 * the owner's asks of 2026-09-28. The row is a place; each of its mini
 * hotspots the line passes gets a dot at the middle of its orange stretch
 * (`passStretches`, the one rule, walked rather than the stored
 * `sequence`, which indexes the editor's full line and overshoots the
 * published, thinned one). The ride ends at `endHotspotId`'s dot when given —
 * tapping a dot toggles the get-off side without moving the hintuan — and
 * at the last dot otherwise. `ridden` runs from the place this direction
 * leaves: it is cut from `travelLine`, turned to rider order by the one
 * rule `timelineFor` reads the middle with (drawnFromTheEnd). `rest` is the
 * way not ridden, for the map to fade.
 */
export function rideCut(
  v: Direction,
  hotspots: readonly Hotspot[],
  rowHotspotId: string,
  endHotspotId: string | null = null,
): {
  ridden: LngLat[];
  rest: LngLat[];
  metres: number;
  at: LngLat;
  endHotspotId: string;
  dots: RideDot[];
} | null {
  const row = hotspots.find((s) => s.id === rowHotspotId);
  const ride = travelLine(v, hotspots);
  if (!row || ride.length < 2) return null;
  const key = placeKey(row);
  const dots: RideDot[] = [];
  for (const s of hotspots) {
    if (s.kind !== 'hintuan' || placeKey(s) !== key || !s.area || !servedBy(s, v.route)) continue;
    const piece = passStretches(ride, hotspotRing(s))[0];
    if (!piece) continue;
    const metres = distanceAlong(ride, piece[0]) + lineLength(piece) / 2;
    dots.push({ hotspotId: s.id, at: pointAt(ride, metres).point, metres });
  }
  dots.sort((a, b) => a.metres - b.metres);
  const end = dots.find((d) => d.hotspotId === endHotspotId) ?? dots[dots.length - 1];
  if (!end || end.metres < 1) return null;
  const { point, index } = pointAt(ride, end.metres);
  return {
    ridden: [...ride.slice(0, index + 1), point],
    rest: [point, ...ride.slice(index + 1)],
    metres: end.metres,
    at: point,
    endHotspotId: end.hotspotId,
    dots,
  };
}

/**
 * A ride between two picks on a trip, the owner's TimelineRouteDetail of
 * 2026-10-15 (Figma 4137:9886): `ridden` from the start to the end, `before`
 * from where the direction leaves to the ride, and `rest` from the ride on
 * to where it goes. The map draws `before` and `rest` in the card's pale
 * (useRideRest). `metres` is the ride's own length, for the Distance tile
 * and a jeep's fare; `from` and `at` are where it starts and ends.
 * `isBackwards`: the end comes before the start on the line, and `ridden`
 * runs back along it, from the start to the end.
 */
export interface RideSpan {
  before: LngLat[];
  ridden: LngLat[];
  rest: LngLat[];
  metres: number;
  from: LngLat;
  at: LngLat;
  isBackwards: boolean;
}

/**
 * The ride on `v` from the start row to the end row. A null start is where
 * the direction leaves, and a null end is where it goes. Each pick sits where
 * its row's dot does, at the middle of the stretch past its place's last box
 * (rideCut's `at`, rowStops), so the S and E on the map sit on the dots. An
 * end before the start is ridden back along the trip's own line, the S and
 * the E left where they were picked (the owner, 2026-10-16: "reverse the
 * arrow, dont' switch please, it's confusing for users"; that morning a row
 * tapped above the start became the start, and the day before, the ride ran
 * on the other direction's line).
 *
 * Null when nothing is picked, or when the line misses a picked row's box
 * (that row is shown picked with nothing to price, as before).
 */
export function rideSpan(
  v: Direction,
  hotspots: readonly Hotspot[],
  startId: string | null,
  endId: string | null,
): RideSpan | null {
  if (startId === null && endId === null) return null;
  const line = travelLine(v, hotspots);
  if (line.length < 2) return null;
  const start = startId === null ? 0 : rideCut(v, hotspots, startId)?.metres;
  const end = endId === null ? lineLength(line) : rideCut(v, hotspots, endId)?.metres;
  if (start === undefined || end === undefined || Math.abs(end - start) < 1) return null;
  const s = pointAt(line, start);
  const e = pointAt(line, end);
  const isBackwards = end < start;
  // The pick the line reaches first and the one it reaches last, whichever
  // is the start: the pale runs up to the one and on from the other.
  const [upper, lower] = isBackwards ? [e, s] : [s, e];
  const between = [upper.point, ...line.slice(upper.index + 1, lower.index + 1), lower.point];
  // Nothing to pale before the origin or after the destination: an empty
  // line, not a point or a sliver the float sums leave.
  return {
    before: startId === null ? [] : [...line.slice(0, upper.index + 1), upper.point],
    ridden: isBackwards ? between.reverse() : between,
    rest: endId === null ? [] : [lower.point, ...line.slice(lower.index + 1)],
    metres: Math.abs(end - start),
    from: s.point,
    at: e.point,
    isBackwards,
  };
}

/**
 * The rows of a trip's timeline outside its ride: outside the stretch
 * between the start's row and the end's, whichever is above. A null start is
 * the origin; with no end, no ride, and nothing outside it. The card folds
 * these rows, its rail broken where the ride starts and ends (the owner,
 * 2026-10-16: "can you still connect those dots"; dots alone from
 * 2026-10-15), and the map's dots along them wear the pale.
 */
export function rowsOutsideRide(
  rows: readonly { id: string }[],
  startId: string | null,
  endId: string | null,
): Set<string> {
  const ride = rideRows(rows, startId, endId);
  if (!ride) return new Set();
  return new Set(rows.filter((_, i) => i < ride.first || i > ride.last).map((r) => r.id));
}

/**
 * Where a picked ride lies on a trip's timeline: its first row and its last,
 * whichever of the start and the end is above (an end tapped above the
 * start stays the end, ridden back along the line: rideSpan). -1 is the
 * origin, a start left there. Null with no end picked — nothing, or a start
 * alone, no ride yet until its end is picked (the owner, 2026-10-16: his
 * Variant3's S stands alone, "so user don't get confused on the context") —
 * or with a pick that is no row of these (another trip's, a moment before it
 * goes): the whole ride. The one rule the card's rail and folds read
 * (rowsOutsideRide).
 */
export function rideRows(
  rows: readonly { id: string }[],
  startId: string | null,
  endId: string | null,
): { first: number; last: number } | null {
  if (endId === null) return null;
  const startAt = startId === null ? -1 : rows.findIndex((r) => r.id === startId);
  const endAt = rows.findIndex((r) => r.id === endId);
  if ((startId !== null && startAt < 0) || endAt < 0) return null;
  return startAt <= endAt ? { first: startAt, last: endAt } : { first: endAt, last: startAt };
}

/** One row of a trip's timeline placed on the map: its dot's spot, and its name. */
export interface RowStop {
  id: string;
  label: string;
  at: LngLat;
}

/**
 * Where each hintuan row of a trip sits on the map — the dots along every
 * lit route, a jeepney's as a train's (the owner's ask, 2026-10-12: "if
 * the route is selected specially jeepney, it must show their hintuans
 * similar to LRT, MRT, and Ferry"): on the line, at the middle of the
 * stretch past the row's last box, where the picked circle pops (rideCut's
 * `at`; his "middle of the line", the same day), so a pick replaces the
 * dot in its own spot. A row whose box the line misses sits at its
 * hotspot's own point, as its pin does (useRideTo's pinAt). Each row cuts
 * the line once more here: a trip's twenty-five rows walk a line of a few
 * thousand points a few times each — twice as a trip opens, on its overview
 * and then its full line, and again as the studio reloads its hotspots
 * (StationLabels memoises it) — tens of milliseconds on a cheap phone,
 * which is nothing beside drawing them.
 */
export function rowStops(
  v: Direction,
  hotspots: readonly Hotspot[],
  rows: readonly TimelineRow[],
): RowStop[] {
  return rows.flatMap((row) => {
    const at =
      rideCut(v, hotspots, row.id)?.at ?? hotspots.find((s) => s.id === row.id)?.point.coordinates;
    return at ? [{ id: row.id, label: row.label, at }] : [];
  });
}

/**
 * The direction's line in travel order: from where it leaves to where it is
 * going, whichever way it was drawn (drawnFromTheEnd). What the arrows, the
 * glow and the ride-to cut follow.
 *
 * Read-only: a line drawn from the far end comes back as its reversed copy,
 * made once per line and kept (reversedOf), so the same line turned round is
 * the same array every render (the cheap-phone plan, step 16 (b),
 * 2026-10-04). Which way round is still asked each time, of the hotspots as
 * they are now.
 */
export function travelLine(v: Direction, hotspots: readonly Hotspot[]): readonly LngLat[] {
  const line = directionLine(v);
  if (line.length < 2) return line;
  const head = hotspots.find((s) => s.id === v.route?.headHotspotId);
  const tail = hotspots.find((s) => s.id === v.route?.tailHotspotId);
  const [from, to] = v.reversed ? [tail, head] : [head, tail];
  if (!from || !to) return line;
  return drawnFromTheEnd(line[0], from, to) ? reversedOf(line) : line;
}

const reversed = new WeakMap<readonly LngLat[], readonly LngLat[]>();

/**
 * The line turned round, made once per array. Keyed on the line array
 * itself, which is safe as lineBounds's box is (geo.ts): a loaded line is
 * one array for as long as it is loaded and no line is changed in place, so
 * a new line — a full line read, a save, a reload — is a new key, never a
 * stale copy; and the copy is handed out read-only, so no caller can change
 * what the next one gets. It had been made afresh for every hook that asked,
 * every render: the chevrons, the babaan sides, the ride-to cut.
 */
function reversedOf(line: readonly LngLat[]): readonly LngLat[] {
  let r = reversed.get(line);
  if (!r) {
    r = [...line].reverse();
    reversed.set(line, r);
  }
  return r;
}
