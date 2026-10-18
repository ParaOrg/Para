import { ringToPolygon, type Ring } from '@/features/routes/geo/ring';
import type { LngLat } from '@/shared/utils/geo';

/** How wide the box of a place made from the save panel is: a bay a few jeeps long. */
export const NEW_PLACE_SIDE_M = 30;

/** Metres in a degree of latitude on the sphere haversine uses (R = 6,371,000 m). */
const METRES_PER_DEGREE = 111_195;

/**
 * A square box `sideM` metres a side, centred on a point, with its sides north
 * to south and east to west: the outline a place made at a line's end gets,
 * which the editor can reshape later like any hotspot. Corners go
 * counter-clockwise from the south-west; the closing side is implied, as in
 * every ring (`ringToPolygon` repeats the first corner to close it).
 */
export function squareBox(centre: LngLat, sideM: number = NEW_PLACE_SIDE_M): Ring {
  const [lng, lat] = centre;
  const half = sideM / 2;
  const dLat = half / METRES_PER_DEGREE;
  const dLng = half / (METRES_PER_DEGREE * Math.cos((lat * Math.PI) / 180));
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
  ];
}

/** The box as the polygon the database keeps: the ring, closed. */
export function squareBoxPolygon(
  centre: LngLat,
  sideM?: number,
): { type: 'Polygon'; coordinates: LngLat[][] } {
  return ringToPolygon(squareBox(centre, sideM));
}
