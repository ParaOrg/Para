import type { MapGeoJSONFeature, MapLibreMap } from 'maplibre-gl';

/**
 * How much further, in px on the screen, the next route's line must be than the nearest's for a
 * tap to be the nearest route's alone. Under it the finger is between lines or on a shared road,
 * and the route list asks which (the owner, 2026-11-23: a tap on one line sometimes listed two).
 */
export const CLEAR_PX = 10;

interface Point {
  x: number;
  y: number;
}

/** How far `p` is from the segment a–b, in px. */
function toSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  const t =
    length2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * The route lines a finger's box caught, cut to the one route whose line is clearly nearest the
 * tap: CLEAR_PX nearer, as the screen draws them, than any other route's. Otherwise all of them,
 * for the list. A route's directions are one (`routeId`), as the list counts them. Any feature
 * without a line's geometry keeps them all.
 */
export function clearlyNearest(
  map: MapLibreMap,
  p: Point,
  features: MapGeoJSONFeature[],
): MapGeoJSONFeature[] {
  const near: Record<string, number> = {};
  for (const f of features) {
    const routeId: unknown = f.properties?.routeId;
    const g = f.geometry;
    const lines =
      g?.type === 'LineString'
        ? [g.coordinates]
        : g?.type === 'MultiLineString'
          ? g.coordinates
          : null;
    if (typeof routeId !== 'string' || !lines) return features;
    for (const line of lines) {
      let a: Point | null = null;
      for (const [lng = 0, lat = 0] of line) {
        const b = map.project([lng, lat]);
        if (a) near[routeId] = Math.min(near[routeId] ?? Infinity, toSegment(p, a, b));
        a = b;
      }
    }
  }
  const [first, second] = Object.entries(near).sort((x, y) => x[1] - y[1]);
  if (!first || !second || second[1] - first[1] < CLEAR_PX) return features;
  return features.filter((f) => f.properties?.routeId === first[0]);
}
