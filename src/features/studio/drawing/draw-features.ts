import { directionLine } from '@/features/routes/model/routes';
import type { LngLat, Segment, SnapMode } from '@/shared/utils/geo';

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
