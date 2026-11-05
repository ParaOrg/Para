import { directionLine } from '@/features/routes/model/routes';
import type { LngLat, Segment, SnapMode } from '@/shared/utils/geo';

import { isOnPoint } from './curves';
import { CLOSING } from './draw-layers';
import type { AreaTarget, Picking } from './drawing-types';
import type { UTurn } from './uturns';

/**
 * What the drawing's sources hold, worked out from the drawing: pure, so
 * tests/unit/draw-features-test.mjs can hold it. useDrawRendering hands them to the map.
 */

interface Feature<TGeometry, TProperties> {
  type: 'Feature';
  properties: TProperties;
  geometry: TGeometry;
}

interface LineString {
  type: 'LineString';
  coordinates: LngLat[];
}

interface Point {
  type: 'Point';
  coordinates: LngLat;
}

interface Polygon {
  type: 'Polygon';
  coordinates: LngLat[][];
}

export interface FeatureCollection<TFeature> {
  type: 'FeatureCollection';
  features: TFeature[];
}

/**
 * The line source: every drawn segment, by its own index, and a hotspot's
 * closing edge once it has three corners.
 */
export function lineFeatures(
  segments: readonly Segment[],
  controlPoints: readonly LngLat[],
  area: AreaTarget | null,
): FeatureCollection<Feature<LineString, { index: number; snap: SnapMode }>> {
  // Index before filtering: the feature's `index` must stay the segment's
  // real position, or editing one segment would edit another.
  const features = segments
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => (s?.coordinates?.length ?? 0) > 1)
    .map(({ s, i }) => ({
      type: 'Feature' as const,
      properties: { index: i, snap: s.snap },
      geometry: { type: 'LineString' as const, coordinates: s.coordinates },
    }));

  // A hotspot closes itself once it has three corners. The closing edge is a
  // real, clickable feature so a corner can be inserted on it; it carries a
  // sentinel index because no segment backs it.
  if (area && controlPoints.length >= 3) {
    features.push({
      type: 'Feature' as const,
      properties: { index: CLOSING, snap: 'freehand' as const },
      geometry: {
        type: 'LineString' as const,
        coordinates: [controlPoints[controlPoints.length - 1], controlPoints[0]],
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

/** The point source: every control point, by index, the one a finger selected marked. */
export function pointFeatures(
  controlPoints: readonly LngLat[],
  selected: number | null,
): FeatureCollection<Feature<Point, { index: number; selected: boolean }>> {
  return {
    type: 'FeatureCollection',
    features: controlPoints.map((c, i) => ({
      type: 'Feature' as const,
      properties: { index: i, selected: i === selected },
      geometry: { type: 'Point' as const, coordinates: c },
    })),
  };
}

/** The area source: a hotspot's fill once it has three corners; else nothing. */
export function areaFeatures(
  controlPoints: readonly LngLat[],
  area: AreaTarget | null,
): FeatureCollection<Feature<Polygon, Record<string, never>>> {
  if (!area || controlPoints.length < 3) return { type: 'FeatureCollection', features: [] };
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [[...controlPoints, controlPoints[0]]] },
      },
    ],
  };
}

/** The U-turn source: each doubled-back stretch, then a ring at each point it turns at. */
export function uTurnFeatures(
  uTurns: readonly UTurn[],
  controlPoints: readonly LngLat[],
): FeatureCollection<Feature<LineString | Point, { point: number; metres: number }>> {
  const stubs = uTurns.map((u) => ({
    type: 'Feature' as const,
    properties: { point: u.point, metres: Math.round(u.metres) },
    geometry: { type: 'LineString' as const, coordinates: u.stub },
  }));
  const rings = uTurns
    .filter((u) => controlPoints[u.point])
    .map((u) => ({
      type: 'Feature' as const,
      properties: { point: u.point, metres: Math.round(u.metres) },
      geometry: { type: 'Point' as const, coordinates: controlPoints[u.point] },
    }));
  return { type: 'FeatureCollection', features: [...stubs, ...rings] };
}

/** Which handle a feature draws, so a drag on its dot knows what it moves; -1 for one being placed. */
type HandleFeature = Feature<LineString | Point, { seg: number; end: 0 | 1 }>;

/** A handle: the arm from its point, and the dot at its end. */
function handleOf(point: LngLat, handle: LngLat, seg = -1, end: 0 | 1 = 0): HandleFeature[] {
  if (isOnPoint(handle, point)) return [];
  const properties = { seg, end };
  return [
    { type: 'Feature', properties, geometry: { type: 'LineString', coordinates: [point, handle] } },
    { type: 'Feature', properties, geometry: { type: 'Point', coordinates: handle } },
  ];
}

/** The handle a Draw stretch has at one end, and that end's point; null for a routed or straight one. */
function handleAt(segment: Segment | undefined, end: 0 | 1): [LngLat, LngLat] | null {
  const line = segment?.coordinates;
  if (segment?.snap !== 'freehand' || !segment.handles || !line || line.length < 2) return null;
  return end === 0 ? [line[0], segment.handles[0]] : [line[line.length - 1], segment.handles[1]];
}

/**
 * The handle source: the two handles of the point `at` the editor selected,
 * each an arm and a dot, as a pen tool shows only the selected point's: the
 * one its stretch in arrives with, and the one its stretch out leaves with,
 * or, on the last point placed smooth, the handle `pending` it will send the
 * next stretch (shown, not dragged: no stretch holds it yet). None with no
 * point selected, or for a hotspot.
 */
export function handleFeatures(
  segments: readonly Segment[],
  points: readonly LngLat[],
  area: AreaTarget | null,
  at: number | null,
  pending: { point: LngLat; out: LngLat } | null,
): FeatureCollection<HandleFeature> {
  const point = at === null ? undefined : points[at];
  if (area || at === null || !point) return { type: 'FeatureCollection', features: [] };
  const into = handleAt(segments[at - 1], 1);
  const outOf = handleAt(segments[at], 0);
  const features = [
    ...(into ? handleOf(into[0], into[1], at - 1, 1) : []),
    ...(outOf ? handleOf(outOf[0], outOf[1], at, 0) : []),
    ...(!segments[at] && pending?.point === point ? handleOf(point, pending.out) : []),
  ];
  return { type: 'FeatureCollection', features };
}

/** A point being placed smooth, its two handles shown as the pen's drag pulls them. */
export function handleLines(
  smooth: readonly { point: LngLat; handles: [LngLat, LngLat] }[],
): FeatureCollection<HandleFeature> {
  return {
    type: 'FeatureCollection',
    features: smooth.flatMap(({ point, handles }) => [
      ...handleOf(point, handles[0]),
      ...handleOf(point, handles[1]),
      {
        type: 'Feature' as const,
        properties: { seg: -1, end: 0 as const },
        geometry: { type: 'Point' as const, coordinates: point },
      },
    ]),
  };
}

/** The borrow source: the line being picked for Extend, and the spot picked on it; else nothing. */
export function borrowFeatures(
  picking: Picking | null,
): FeatureCollection<Feature<LineString | Point, Record<string, never>>> {
  if (!picking) return { type: 'FeatureCollection', features: [] };
  const line = {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates: directionLine(picking.direction) },
  };
  const spot = picking.spot && {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'Point' as const, coordinates: picking.spot.point },
  };
  return { type: 'FeatureCollection', features: spot ? [line, spot] : [line] };
}
