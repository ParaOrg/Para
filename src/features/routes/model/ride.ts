import { haversine, lineLength, type LngLat } from '@/shared/utils/geo';

import { hotspotRing, type Hotspot } from './hotspots';
import { placeKey } from './places';
import { servedBy, directionLine, isLoop, type Direction } from './routes';
import {
  drawnFromTheEnd,
  loopTimeline,
  timelineFor,
  type Timeline,
  type TimelineRow,
} from './timeline';
import { passStretches } from '../geo/pass';

/*
 * A direction ridden: its line in the jeep's order, its timeline of
 * hintuans, and the ride cut short at one.
 */

/**
 * A saved direction as a string of places, for its card: its route's two ends
 * resolved to hotspots, and the hotspots its links say it passes, in order.
 */
export function routeTimeline(
  v: Direction,
  hotspots: readonly Hotspot[],
  along: readonly Hotspot[],
  tipId: string | null = null,
): Timeline {
  // A loop has no ends: its trip leaves from its tip and comes back to it.
  if (isLoop(v)) return loopTimeline(along, tipId);
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
interface RideDot {
  hotspotId: string;
  at: LngLat;
  metres: number;
}

/**
 * The ride cut short at one hintuan: where its row's dot sits (`at`), how far
 * in (`metres`) and which box it is (`endHotspotId`), which the picks, the
 * camera and rowStops read. The row is a place; each of its mini hotspots the
 * line passes gets a dot at the middle of its orange stretch
 * (`passStretches`, the one rule, walked rather than the stored `sequence`,
 * which indexes the editor's full line and overshoots the published, thinned
 * one). The ride ends at the last dot along the line.
 */
export function rideCut(
  v: Direction,
  hotspots: readonly Hotspot[],
  rowHotspotId: string,
): { metres: number; at: LngLat; endHotspotId: string } | null {
  const row = hotspots.find((s) => s.id === rowHotspotId);
  const ride = travelLine(v, hotspots);
  if (!row || ride.length < 2) return null;
  const key = placeKey(row);
  const dots: RideDot[] = [];
  for (const s of hotspots) {
    // A loop has no ends to be the end of, so a terminal's box is a place on it like a hintuan's.
    const isPlace = s.kind === 'hintuan' || (isLoop(v) && s.kind === 'terminal');
    if (!isPlace || placeKey(s) !== key || !s.area || !servedBy(s, v.route)) continue;
    const piece = passStretches(ride, hotspotRing(s))[0];
    if (!piece) continue;
    const metres = distanceAlong(ride, piece[0]) + lineLength(piece) / 2;
    dots.push({ hotspotId: s.id, at: pointAt(ride, metres).point, metres });
  }
  dots.sort((a, b) => a.metres - b.metres);
  const end = dots[dots.length - 1];
  if (!end || end.metres < 1) return null;
  return { metres: end.metres, at: pointAt(ride, end.metres).point, endHotspotId: end.hotspotId };
}

/**
 * A ride between two picks on a trip (Figma TimelineRouteDetail, 4137:9886):
 * `ridden` from the start to the end, `before` from where the direction
 * leaves to the ride, and `rest` from the ride on to where it goes. The map
 * draws `before` and `rest` in the card's pale (useRideRest). `metres` is the
 * ride's own length, for the Distance tile and a jeep's fare; `from` and `at`
 * are where it starts and ends. `isBackwards`: the end comes before the start
 * on the line, and `ridden` runs back along it, from the start to the end.
 */
interface RideSpan {
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
 * the E left where they were picked, rather than switched, which would
 * confuse a commuter (the owner's call).
 *
 * Null when nothing is picked, or when the line misses a picked row's box
 * (that row is shown picked with nothing to price).
 */
export function rideSpan(
  v: Direction,
  hotspots: readonly Hotspot[],
  startId: string | null,
  endId: string | null,
  tipId: string | null = null,
): RideSpan | null {
  if (startId === null && endId === null) return null;
  const line = travelLine(v, hotspots);
  if (line.length < 2) return null;
  if (isLoop(v)) {
    // A null start is the tip, where the trip leaves; a null end, the tip again.
    const tip = tipId === null ? 0 : rideCut(v, hotspots, tipId)?.metres;
    const s = startId === null ? tip : rideCut(v, hotspots, startId)?.metres;
    const e = endId === null ? tip : rideCut(v, hotspots, endId)?.metres;
    return s === undefined || e === undefined ? null : loopSpan(line, s, e);
  }
  const start = startId === null ? 0 : rideCut(v, hotspots, startId)?.metres;
  const end = endId === null ? lineLength(line) : rideCut(v, hotspots, endId)?.metres;
  if (start === undefined || end === undefined) return null;
  return spanAlong(line, start, end);
}

/**
 * The ride on `v` from the start row to one of the trip's own ends, picked
 * from its row with the start kept (the owner's call): on to where it goes,
 * or back to where it leaves, ridden back along the line as any end above the
 * start is. Null when the line misses the start's box.
 */
export function rideToEnd(
  v: Direction,
  hotspots: readonly Hotspot[],
  startId: string,
  end: 'from' | 'to',
  tipId: string | null = null,
): RideSpan | null {
  const line = travelLine(v, hotspots);
  if (line.length < 2) return null;
  if (isLoop(v)) {
    // Either end row is the tip: the ride goes on round to it.
    const tip = tipId === null ? 0 : rideCut(v, hotspots, tipId)?.metres;
    const s = rideCut(v, hotspots, startId)?.metres;
    return s === undefined || tip === undefined ? null : loopSpan(line, s, tip);
  }
  const start = rideCut(v, hotspots, startId)?.metres;
  if (start === undefined) return null;
  return spanAlong(line, start, end === 'from' ? 0 : lineLength(line));
}

/**
 * A ride round a loop from `start` metres in to `end`: only ever forward, on
 * past the seam if it must, and the whole way round when the end is where the
 * start is (the end row being the tip). The line is rotated to leave from the
 * start, so the ride is its first stretch and the rest is what remains.
 */
function loopSpan(ring: readonly LngLat[], start: number, end: number): RideSpan | null {
  const whole = lineLength(ring);
  if (whole < 1) return null;
  const gap = (((end - start) % whole) + whole) % whole;
  return spanAlong(loopFrom(ring, start), 0, gap < 1 ? whole : gap);
}

/**
 * A closed line rotated to leave from `metres` along it and come back to the
 * same point: the way a ride round a loop reads from its start. A line that
 * stops a few metres short of its start is closed first. Metres past the
 * line's length go round again.
 */
export function loopFrom(line: readonly LngLat[], metres: number): LngLat[] {
  if (line.length < 2) return [...line];
  const first = line[0];
  const last = line[line.length - 1];
  const ring = first[0] === last[0] && first[1] === last[1] ? line : [...line, first];
  const whole = lineLength(ring);
  const at = whole > 0 ? ((metres % whole) + whole) % whole : 0;
  const { point, index } = pointAt(ring, at);
  const rotated = [point, ...ring.slice(index + 1), ...ring.slice(1, index + 1), point];
  // A rotation that lands on a vertex would repeat it.
  return rotated.filter(
    (p, i) => i === 0 || p[0] !== rotated[i - 1][0] || p[1] !== rotated[i - 1][1],
  );
}

/**
 * A loop's line as the trip rides it: closed and rotated to leave from the
 * tip, so the arrows and the glow run forward from there round to there
 * again. With no tip, as drawn.
 */
export function tipLine(
  v: Direction,
  hotspots: readonly Hotspot[],
  tipId: string | null,
): readonly LngLat[] {
  const line = travelLine(v, hotspots);
  if (!isLoop(v) || tipId === null) return line;
  const tip = rideCut(v, hotspots, tipId);
  return tip ? loopFrom(line, tip.metres) : line;
}

/**
 * The ride along `line` from `start` metres in to `end`, back along it when
 * the end comes first; null for a ride of under a metre.
 */
function spanAlong(line: readonly LngLat[], start: number, end: number): RideSpan | null {
  if (Math.abs(end - start) < 1) return null;
  const s = pointAt(line, start);
  const e = pointAt(line, end);
  const isBackwards = end < start;
  // The pick the line reaches first and the one it reaches last, whichever
  // is the start: the pale runs up to the one and on from the other.
  const [upper, lower] = isBackwards ? [e, s] : [s, e];
  const [first, last] = isBackwards ? [end, start] : [start, end];
  const between = [upper.point, ...line.slice(upper.index + 1, lower.index + 1), lower.point];
  // Nothing to pale before the origin or after the destination: an empty
  // line, not a point or a sliver the float sums leave.
  return {
    before: first < 1 ? [] : [...line.slice(0, upper.index + 1), upper.point],
    ridden: isBackwards ? between.reverse() : between,
    rest: lineLength(line) - last < 1 ? [] : [lower.point, ...line.slice(lower.index + 1)],
    metres: Math.abs(end - start),
    from: s.point,
    at: e.point,
    isBackwards,
  };
}

/** One row of a trip's timeline placed on the map: its dot's spot, and its name. */
interface RowStop {
  id: string;
  label: string;
  at: LngLat;
}

/**
 * Where each hintuan row of a trip sits on the map — the dots along every lit
 * route, a jeepney's as a train's (the owner's call): on the line, at the
 * middle of the stretch past the row's last box, where the picked circle pops
 * (rideCut's `at`), so a pick replaces the dot in its own spot. A row whose
 * box the line misses sits at its hotspot's own point, as its pin does
 * (useRideTo's pinAt). Each row cuts the line once more here: a trip's
 * twenty-five rows walk a line of a few thousand points a few times each —
 * twice as a trip opens, on its overview and then its full line, and again as
 * the studio reloads its hotspots (StationLabels memoises it) — tens of
 * milliseconds on a cheap phone, which is nothing beside drawing them.
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
 * the same array every render. Which way round is still asked each time, of
 * the hotspots as they are now.
 */
export function travelLine(v: Direction, hotspots: readonly Hotspot[]): readonly LngLat[] {
  const line = directionLine(v);
  // A loop's line is as it was drawn, the way the jeeps go: there are no ends to orient it by.
  if (line.length < 2 || isLoop(v)) return line;
  const head = hotspots.find((s) => s.id === v.route?.headHotspotId);
  const tail = hotspots.find((s) => s.id === v.route?.tailHotspotId);
  const [from, to] = v.reversed ? [tail, head] : [head, tail];
  if (!from || !to) return line;
  return drawnFromTheEnd(line[0], from, to) ? reversedOf(line) : line;
}

const reversed = new WeakMap<readonly LngLat[], readonly LngLat[]>();

/**
 * The line turned round, made once per array. Keyed on the line array itself,
 * which is safe as lineBounds's box is (geo.ts): a loaded line is one array
 * for as long as it is loaded and no line is changed in place, so a new line
 * — a full line read, a save, a reload — is a new key, never a stale copy;
 * and the copy is handed out read-only, so no caller can change what the next
 * one gets. Otherwise every hook that asks (the chevrons, the babaan sides,
 * the ride-to cut) would make a copy of its own each time it runs.
 */
function reversedOf(line: readonly LngLat[]): readonly LngLat[] {
  let r = reversed.get(line);
  if (!r) {
    r = [...line].reverse();
    reversed.set(line, r);
  }
  return r;
}
