import { MAP_COLOURS } from '@/design-system/foundation/map-colours';

/**
 * How the route line is drawn: the colour of its hintuan stretches, and how
 * wide it is at every zoom.
 *
 * The line's own colours are the owner's Map/… tokens (map-colours.ts); the
 * stretches' too, Map/RouteLine/Hintuan/surface-default — green.
 */
export const PASS_COLOUR = MAP_COLOURS['Map/RouteLine/Hintuan/surface-default'];

/**
 * How wide the route line is, at every zoom.
 *
 * The line fills the road: its width follows the basemap's own curve for a
 * major road (2 px at zoom 10, 20 px at zoom 20, growing by 1.3 a zoom), at
 * half of it — 6 px at zoom 18 where the road is 12 px, the owner's call — so
 * road shows either side at every zoom. `extra` pads it: the casing shows 1
 * px either side, the lit direction sits 1 px proud, and the hit area reaches
 * well beyond.
 *
 * Two forms of the one curve: the style expression the layers take, and the
 * number the arrows need for a given zoom, so a chevron stays inside the
 * line it rides.
 */
const ROAD_SHARE = 0.5;
const BASE = 1.3;
const [Z0, W0, Z1, W1] = [10, 2 * ROAD_SHARE, 20, 20 * ROAD_SHARE];

/** A width along the zoom: [zoom, px] stops, exponential between them and flat outside. */
type Stops = [number, number][];

/** The stops as the style expression the layers take. */
function curve(stops: Stops) {
  return ['interpolate', ['exponential', BASE], ['zoom'], ...stops.flat()] as never;
}

/** The stops as a number at `zoom`, the way MapLibre evaluates an exponential interpolation. */
function curveAt(stops: Stops, zoom: number): number {
  if (zoom <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [[za, wa], [zb, wb]] = [stops[i - 1], stops[i]];
    if (zoom <= zb) return wa + ((BASE ** (zoom - za) - 1) / (BASE ** (zb - za) - 1)) * (wb - wa);
  }
  return stops[stops.length - 1][1];
}

/**
 * The unlit line is drawn 12/10 of that half-road (the owner's call, from a
 * phone zoomed out over the whole city, where the resting lines read too thin
 * to find). The lit direction is measured from the half-road itself, so it
 * keeps its own widths.
 */
const UNLIT_BOOST = 1.2;

const road = (extra: number, boost = UNLIT_BOOST): Stops => [
  [Z0, W0 * boost + extra],
  [Z1, W1 * boost + extra],
];

/** The style expression: `extra` pixels wider than the line, at every zoom. */
export function roadWidth(extra: number) {
  return curve(road(extra));
}

/** The half-road itself, unboosted, as a number: what the lit direction is measured from. */
function halfRoadAt(zoom: number, extra: number): number {
  return curveAt(road(extra, 1), zoom);
}

/** How much wider than the half-road the lit direction is drawn: 9 px to its 6 at zoom 18 (the unlit line, boosted, is 7.2), the owner's numbers. */
const LIT_EXTRA = 3;

/**
 * Zoomed out, the lit direction is drawn 12/10 as wide (the owner's call,
 * judged at zoom 16, where it read thin under its green stretches). Full at
 * 16 and below, gone by 18, where the 9 px was judged; between, it eases, so
 * the line never thins as the map zooms in.
 */
const LIT_BOOST = 1.2;
const [BOOST_FULL_TO, BOOST_GONE_AT] = [16, 18];

/** The lit line's stops, `extra` pixels wider: a casing keeps its pixel a side, boost or not. */
function lit(extra: number): Stops {
  const at = (z: number, k: number): [number, number] => [z, halfRoadAt(z, LIT_EXTRA) * k + extra];
  return [at(Z0, LIT_BOOST), at(BOOST_FULL_TO, LIT_BOOST), at(BOOST_GONE_AT, 1), at(Z1, 1)];
}

/** The lit direction's width, `extra` pixels wider, as the layers take it: the line, its casing, its green stretches. */
export function litWidth(extra = 0) {
  return curve(lit(extra));
}

/** Half the lit direction's width, `extra` pixels wider: the radius of a dot that sits on the line. */
export function litRadius(extra = 0) {
  return curve(lit(extra).map(([zoom, width]): [number, number] => [zoom, width / 2]));
}

/** The same as a number: what the chevrons are cut to. */
export function litWidthAt(zoom: number, extra = 0): number {
  return curveAt(lit(extra), zoom);
}

/** The casing shows one pixel either side of whatever it wraps. */
export const CASING_EXTRA = 2;
