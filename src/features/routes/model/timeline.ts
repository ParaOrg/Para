import { haversine, metresAlong, nearestOnSegment, type LngLat } from '@/shared/utils/geo';

import { hotspotLabel, hotspotRing, type HotspotKind, type Hotspot } from './hotspots';
import { placeKey } from './places';
import { servedBy, type ServedRoute } from './routes';
import { passIndex } from '../geo/pass';
import type { Ring } from '../geo/ring';

/*
 * A direction as a string of places: the hintuans its line passes, in order,
 * and the timeline its card reads.
 */

/**
 * The hintuans a line passes, in the order it reaches them. `index` is
 * where along the line, which is what `route_stop.sequence` stores.
 * Terminals are not listed, since a route's ends come from the route itself,
 * except on a loop, which has no ends. Neither are the hintuans this route
 * does not stop at (`servedBy`): the jeep hintuans under a train's track, the
 * stations over a jeep's road.
 */
export function hintuansAlong<S extends Hotspot>(
  line: readonly LngLat[],
  hotspots: readonly S[],
  route: ServedRoute,
): { hotspot: S; index: number }[] {
  const along: { hotspot: S; index: number; at: number }[] = [];
  for (const hotspot of hotspots) {
    if (!listedAlong(hotspot, route)) continue;
    const where = passedAt(line, hotspotRing(hotspot), hotspot);
    if (where) along.push({ hotspot, ...where });
  }
  return along.sort(inPassingOrder).map(({ hotspot, index }) => ({ hotspot, index }));
}

/**
 * Whether hintuansAlong lists this hotspot for this route, wherever the line
 * runs: a hintuan with a box, at which the route stops (`servedBy`). Split
 * out with passedAt and inPassingOrder for the babaan sides, which ask it of
 * only the boxes their line cuts.
 */
export function listedAlong(hotspot: Hotspot, route: ServedRoute): boolean {
  // On a loop a terminal's box is a place on it like any hintuan's: it has no ends to be the end of.
  const isPlace =
    hotspot.kind === 'hintuan' || (route.isLoop === true && hotspot.kind === 'terminal');
  return isPlace && !!hotspot.area && servedBy(hotspot, route);
}

/**
 * Where along the line this box (`ring`, the hotspot's own) is passed: its
 * `index` (passIndex), and `at`, how far along that segment the hotspot's
 * middle is. Null when the line does not pass it.
 */
export function passedAt(
  line: readonly LngLat[],
  ring: Ring,
  hotspot: Hotspot,
): { index: number; at: number } | null {
  const index = passIndex(line, ring);
  // Two boxes met on one segment, a snapped road's 20–30 m, tied and kept in
  // the order the hotspots were read: the one whose middle is further along
  // that segment is reached later.
  return index >= 0
    ? {
        index,
        at: nearestOnSegment(hotspot.point.coordinates, line[index], line[index + 1] ?? line[index])
          .t,
      }
    : null;
}

/** The order the line reaches what passedAt placed; a stable sort keeps ties as read. */
export const inPassingOrder = (
  a: { index: number; at: number },
  b: { index: number; at: number },
): number => a.index - b.index || a.at - b.at;

/**
 * The hotspots a direction is linked to, in the order its line reaches them:
 * by `sequence`, and two on one segment (the same sequence) by how far along
 * the line their middles are — the card's timeline, as hintuansAlong orders
 * the save panel's. `line` may be the overview: a position along it is, an
 * index into it is not.
 */
export function orderLinked<S extends Hotspot>(
  linked: readonly { hotspot: S; sequence: number }[],
  line: readonly LngLat[],
): S[] {
  const keyed = linked.map((l) => ({ ...l, at: -1 }));
  const tied = new Set<number>();
  keyed.forEach((l, i) =>
    keyed.forEach((m, j) => i !== j && l.sequence === m.sequence && tied.add(i)),
  );
  for (const i of tied) keyed[i].at = metresAlong(line, keyed[i].hotspot.point.coordinates);
  return keyed.sort((a, b) => a.sequence - b.sequence || a.at - b.at).map((l) => l.hotspot);
}

/** One row of a direction's timeline. */
export interface TimelineRow {
  id: string;
  label: string;
  kind: HotspotKind;
}

/** A row is its place, never a box: "SM Fairview", not the terminal's long name. */
const toRow = (s: Hotspot): TimelineRow => ({ id: s.id, label: hotspotLabel(s), kind: s.kind });

/**
 * A direction as a string of places: where it leaves from, the hintuans on
 * the way in order, where it is going. What a signboard is, generated.
 */
export interface Timeline {
  from: TimelineRow | null;
  to: TimelineRow | null;
  between: TimelineRow[];
}

/**
 * The timeline of a direction with these ends. `along` is the hintuans in the
 * order the line reaches them. A row is a hintuan, named by its hotspot name:
 * the boxes of one place passed one after another — a mini hotspot on each
 * side of the road, or the several of SM Fairview — are one row, and a box's
 * own ground name is for the hotspot card, not the route. The ends' places
 * are left out of the middle: the rider is already getting off there. The
 * owner's model. When the line was drawn from the far end (the save panel
 * allows it with a warning) and `lineStart` says so, the middle is turned
 * round to read in travel order. The row keeps the first box's id.
 */
export function timelineFor(
  head: Hotspot | null | undefined,
  tail: Hotspot | null | undefined,
  reversed: boolean,
  along: readonly Hotspot[],
  lineStart?: LngLat,
): Timeline {
  const [from, to] = reversed ? [tail, head] : [head, tail];
  const endPlaces = new Set([head, tail].filter((s) => !!s).map((s) => placeKey(s)));
  let between = along.filter((s) => s.kind === 'hintuan' && !endPlaces.has(placeKey(s)));
  if (lineStart && from && to && drawnFromTheEnd(lineStart, from, to)) between = between.reverse();
  const rows = between
    .filter((s, i) => i === 0 || placeKey(s) !== placeKey(between[i - 1]))
    .map(toRow);
  return { from: from ? toRow(from) : null, to: to ? toRow(to) : null, between: rows };
}

/**
 * Whether a line that starts at `lineStart` was drawn from the far end of its
 * ride: its first point nearer where the ride goes than where it leaves. The
 * stored points run whichever way the editor drew them, and the save panel
 * lets a return be drawn from the far end with only a warning, so the ends
 * decide, not the drawing. The one travel-order rule: the timeline's middle,
 * the ride-to cut and the arrows' line all turn on it.
 */
export function drawnFromTheEnd(lineStart: LngLat, from: Hotspot, to: Hotspot): boolean {
  return haversine(lineStart, to.point.coordinates) < haversine(lineStart, from.point.coordinates);
}

/**
 * A loop's rows, in the order its line passes them: one row per place, the
 * boxes of a place passed one after another a single row (as timelineFor
 * makes them), and a place the line starts and ends in, the seam of a closed
 * line, one row, not two. The row keeps its first box's id.
 */
export function loopRows(along: readonly Hotspot[]): TimelineRow[] {
  const rows = along.filter((s, i) => i === 0 || placeKey(s) !== placeKey(along[i - 1])).map(toRow);
  const first = along[0];
  const last = along[along.length - 1];
  const seamIsOnePlace = rows.length > 1 && first && last && placeKey(first) === placeKey(last);
  return seamIsOnePlace ? rows.slice(0, -1) : rows;
}

/**
 * A loop's trip as a timeline: it leaves from its tip and, going round, comes
 * back to it, so the tip is both `from` and `to` and `between` is every other
 * row in the order the jeep goes round past the tip. The tip is a row's id
 * (loopTip chooses it); one that is no row of these, or none, is the first.
 */
export function loopTimeline(along: readonly Hotspot[], tipRowId: string | null = null): Timeline {
  const rows = loopRows(along);
  if (rows.length === 0) return { from: null, to: null, between: [] };
  // Another box of the tip's place is the same tip, as it is for a ride's cut.
  const tipBox = along.find((s) => s.id === tipRowId);
  const tipKey = tipBox ? placeKey(tipBox) : null;
  const found = rows.findIndex((r) => {
    const box = along.find((s) => s.id === r.id);
    return box ? placeKey(box) === tipKey : false;
  });
  const tip = Math.max(0, found);
  return {
    from: rows[tip],
    to: rows[tip],
    between: [...rows.slice(tip + 1), ...rows.slice(0, tip)],
  };
}

/**
 * Where a loop's trip starts, as a row's id: the place the trip was opened
 * from, else the one nearest the commuter, else the first its line passes.
 * Chosen once, when the trip opens, and never moved under the rider. `along`
 * is the hotspots in the order the line reaches them.
 */
export function loopTip(
  along: readonly Hotspot[],
  near: LngLat | null,
  openedFrom: Hotspot | null,
): string | null {
  const rows = loopRows(along);
  if (rows.length === 0) return null;
  const rowByPlace = new Map<string, TimelineRow>();
  for (const r of rows) {
    const box = along.find((a) => a.id === r.id);
    if (box) rowByPlace.set(placeKey(box), r);
  }
  const rowOf = (s: Hotspot) => rowByPlace.get(placeKey(s)) ?? null;
  if (openedFrom) {
    const opened = rowOf(openedFrom);
    if (opened) return opened.id;
  }
  if (near && along.length > 0) {
    let best = along[0];
    for (const s of along) {
      if (haversine(s.point.coordinates, near) < haversine(best.point.coordinates, near)) best = s;
    }
    const nearest = rowOf(best);
    if (nearest) return nearest.id;
  }
  return rows[0].id;
}
