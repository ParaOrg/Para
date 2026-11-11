import type { LngLat } from '@/shared/utils/geo';

/** One map tile's address in the usual z/x/y scheme (web mercator, y down from the north). */
export interface TileXYZ {
  z: number;
  x: number;
  y: number;
}

const METRES_PER_DEGREE = 111_320;

/** The tile column and row a point falls in at zoom `z`. */
function tileOf([lng, lat]: LngLat, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const rad = (lat * Math.PI) / 180;
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  // A point on the map's edge belongs to the last tile, not one past it.
  return { x: Math.min(Math.max(x, 0), n - 1), y: Math.min(Math.max(y, 0), n - 1) };
}

/**
 * Every tile from `minZoom` to `maxZoom` that a square `radiusM` metres around `at` touches, the
 * coarse zooms first: what the map needs to draw that square with no signal.
 */
export function tilesAround(
  at: LngLat,
  radiusM: number,
  minZoom: number,
  maxZoom: number,
): TileXYZ[] {
  const [lng, lat] = at;
  const dLat = radiusM / METRES_PER_DEGREE;
  const dLng = radiusM / (METRES_PER_DEGREE * Math.cos((lat * Math.PI) / 180));
  const tiles: TileXYZ[] = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    const northWest = tileOf([lng - dLng, lat + dLat], z);
    const southEast = tileOf([lng + dLng, lat - dLat], z);
    for (let x = northWest.x; x <= southEast.x; x++) {
      for (let y = northWest.y; y <= southEast.y; y++) tiles.push({ z, x, y });
    }
  }
  return tiles;
}

/** A tile's address from a source's `{z}/{x}/{y}` template. */
export const tileUrl = (template: string, { z, x, y }: TileXYZ): string =>
  template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
