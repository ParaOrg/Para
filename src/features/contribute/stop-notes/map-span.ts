/** How much of the street the map shows across, round the stop. */
export const STOP_MAP_SPAN_M = 200;

/** The zoom at which `widthPx` of map, at latitude `lat`, spans `metres` (MapLibre's 512 px tiles). */
export function zoomForSpan(lat: number, widthPx: number, metres: number): number {
  const EQUATOR_M = 40_075_016.686;
  return Math.log2((EQUATOR_M * Math.cos((lat * Math.PI) / 180) * widthPx) / (512 * metres));
}
