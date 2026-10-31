import type {
  ExpressionSpecification,
  FilterSpecification,
  LayerSpecification,
  MapLibreMap,
  StyleSpecification,
} from 'maplibre-gl';

import type { LngLat } from '@/shared/utils/geo';

import type { Hotspot } from '../model/hotspots';

/*
 * The basemap's own rail station names, hidden where Para has the station
 * (the owner's call): Monochrome drew "Anonas" a block from Para's "Anonas
 * Station", and Colour draws its own the same way. A station of ours is a
 * hotspot with a `line`; the basemap's are its `poi` points of class
 * `railway`. One within NEAR_M of one of ours is not drawn; the rest, the
 * PNR's among them, are.
 *
 * The hotspots come after the map is made, so the mask goes onto the drawn
 * layers when they come (maskStations, from the hotspots' source), and is
 * kept for the map, so a basemap switch dresses its new style with it
 * (applyBasemap). Only the basemap's `poi` labels take it: ours have no
 * source layer.
 */

/**
 * How near one of ours a basemap station may be and still be hidden: a
 * station's own point stands at its entrance or its middle, ours at its
 * platform. Measured: OpenStreetMap's Anonas 150 m from ours, so 150 m let
 * it through.
 */
const NEAR_M = 250;
/** The corners of the ring drawn round each of ours. */
const SIDES = 16;
const METRES_PER_DEGREE = 111_320;

const masks = new WeakMap<MapLibreMap, ExpressionSpecification>();

/** A closed ring of SIDES corners, `metres` round a point. */
function ringAround([lng, lat]: LngLat, metres: number): LngLat[] {
  const dLat = metres / METRES_PER_DEGREE;
  const dLng = metres / (METRES_PER_DEGREE * Math.cos((lat * Math.PI) / 180));
  const corners = Array.from({ length: SIDES }, (_, i): LngLat => {
    const a = (2 * Math.PI * i) / SIDES;
    return [lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)];
  });
  return [...corners, corners[0]];
}

/** The basemap stations not to draw: those near a station of ours. Null with none of ours. */
export function stationMask(hotspots: readonly Hotspot[]): ExpressionSpecification | null {
  const ours = hotspots.filter((s) => s.line);
  if (ours.length === 0) return null;
  return [
    'all',
    ['==', ['get', 'class'], 'railway'],
    [
      'within',
      {
        type: 'MultiPolygon',
        coordinates: ours.map((s) => [ringAround(s.point.coordinates, NEAR_M)]),
      },
    ],
  ];
}

/** A basemap place label: the ones the mask is for. */
const isBasemapPlace = (l: LayerSpecification): boolean =>
  l.type === 'symbol' && 'source-layer' in l && l['source-layer'] === 'poi';

/** A filter in MapLibre's expression syntax, the one a mask can join. */
export type ExpressionFilter = boolean | ExpressionSpecification;

/**
 * Whether a filter is written as an expression rather than in the legacy
 * syntax, by MapLibre's own test (style-spec, feature_filter's
 * isExpressionFilter). OpenFreeMap's and ours all are; a legacy one, which
 * an expression cannot join, keeps its layer unmasked.
 */
export function isExpressionFilter(f: unknown): f is ExpressionFilter {
  if (typeof f === 'boolean') return true;
  if (!Array.isArray(f) || f.length === 0) return false;
  const [op, a, b]: unknown[] = f;
  switch (op) {
    case 'has':
      return f.length >= 2 && a !== '$id' && a !== '$type';
    case 'in':
      return f.length >= 3 && (typeof a !== 'string' || Array.isArray(b));
    case '!in':
    case '!has':
    case 'none':
      return false;
    case '==':
    case '!=':
    case '>':
    case '>=':
    case '<':
    case '<=':
      return f.length !== 3 || Array.isArray(a) || Array.isArray(b);
    case 'any':
    case 'all':
      return f.slice(1).every(isExpressionFilter);
    default:
      return true;
  }
}

/** Whether a filter is one `masked` made: its own, then the mask's `!` around a `within`. */
function isMasked(f: ExpressionFilter): f is ['all', ExpressionFilter, ExpressionSpecification] {
  if (!Array.isArray(f) || f.length !== 3 || f[0] !== 'all') return false;
  const last: unknown = f[2];
  if (!Array.isArray(last) || last[0] !== '!') return false;
  const inner: unknown = last[1];
  return Array.isArray(inner) && Array.isArray(inner[2]) && inner[2][0] === 'within';
}

/** A layer's filter with the mask on it, in place of any mask before; a legacy filter as it is. */
function masked(
  filter: FilterSpecification | undefined,
  mask: ExpressionSpecification | null,
): FilterSpecification | undefined {
  if (filter !== undefined && !isExpressionFilter(filter)) return filter;
  const own = filter !== undefined && isMasked(filter) ? filter[1] : filter;
  if (!mask) return own;
  return ['all', own ?? true, ['!', mask]];
}

/** A style with the map's mask on its basemap place labels; as it was without one. Pure. */
export function maskedStyle(style: StyleSpecification, map: MapLibreMap): StyleSpecification {
  const mask = masks.get(map) ?? null;
  if (!mask) return style;
  return {
    ...style,
    layers: style.layers.map((l) =>
      isBasemapPlace(l) && l.type === 'symbol' ? { ...l, filter: masked(l.filter, mask) } : l,
    ),
  };
}

/** Hide the basemap's stations near ours on the map now, and on every basemap after. */
export function maskStations(map: MapLibreMap, hotspots: readonly Hotspot[]): void {
  const mask = stationMask(hotspots);
  if (mask) masks.set(map, mask);
  else masks.delete(map);
  for (const l of map.getStyle().layers) {
    if (isBasemapPlace(l)) map.setFilter(l.id, masked(map.getFilter(l.id) ?? undefined, mask));
  }
}
