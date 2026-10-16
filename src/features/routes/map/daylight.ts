import type {
  FillLayerSpecification,
  LayerSpecification,
  LineLayerSpecification,
  StyleSpecification,
} from 'maplibre-gl';

import { MAP_PAINT } from '@/design-system/foundation/map-colours';

import { recolouredLayer, type Recolour } from './recolour';

/*
 * Colour, in Apple Maps' light palette (the owner, 2026-10-16: "on the color
 * map theme of ours can we change the color similar to apple maps?", with a
 * screenshot of Makati and BGC). Liberty's drawing stays — its widths, its
 * zooms, its labels and icons — and the big surfaces take Apple's colours
 * (MAP_PAINT's Paint/daylight-…): a warm cream ground, bright light-blue
 * water, light-green parks, pale-yellow commercial blocks, blue-gray avenues,
 * white streets with hardly an edge, and buildings a touch darker than the
 * ground.
 *
 * Everything this does not repaint (labels, rail, boundaries, hospitals and
 * schools, the airport, the shaded relief) is Liberty's own colour muted as
 * Colour was muted before (the owner, 2026-10-15: "more muted so the route
 * line pops"), so ParaPo's routes and hotspots on top still carry the
 * strongest colour on the map.
 */

const SOURCE = 'openmaptiles';

// ----------------------------------------------------------------- muting

/** How much of a colour's saturation stays. */
const SATURATION_KEPT = 0.4;
/** How far a fill's or a line's lightness moves toward white. */
const LIGHTER_BY = 0.15;
/** Liberty's place icons, which are coloured pictures. */
const ICON_OPACITY = 0.6;

const mute: Recolour = (c, isName) => ({
  ...c,
  saturation: c.saturation * SATURATION_KEPT,
  lightness: isName ? c.lightness : c.lightness + (100 - c.lightness) * LIGHTER_BY,
});

function mutedLayer(l: LayerSpecification): LayerSpecification {
  if (l.type === 'raster') return { ...l, paint: { ...l.paint, 'raster-saturation': -0.6 } };
  const muted = recolouredLayer(l, mute);
  if (muted.type !== 'symbol' || muted.layout?.['icon-image'] === undefined) return muted;
  return { ...muted, paint: { ...muted.paint, 'icon-opacity': ICON_OPACITY } };
}

// ---------------------------------------------------------------- palette

const GREEN = MAP_PAINT['Paint/daylight-green'];

/** The ground and what Apple draws as ground: homes are the land's own cream. */
const GROUND: Record<string, NonNullable<LayerSpecification['paint']>> = {
  background: { 'background-color': MAP_PAINT['Paint/daylight-land'] },
  landuse_residential: { 'fill-color': MAP_PAINT['Paint/daylight-land'] },
  // Opaque, so the green is Apple's and not Liberty's thinned over the cream.
  park: { 'fill-color': GREEN, 'fill-outline-color': GREEN, 'fill-opacity': 1 },
  park_outline: { 'line-color': GREEN },
  landcover_wood: { 'fill-color': GREEN, 'fill-opacity': 1 },
  landcover_grass: { 'fill-color': GREEN, 'fill-opacity': 1 }, // Ayala Triangle's lawns are grass, not a park
  landuse_cemetery: { 'fill-color': GREEN },
  landuse_pitch: { 'fill-color': GREEN },
  landuse_track: { 'fill-color': GREEN },
  water: { 'fill-color': MAP_PAINT['Paint/daylight-water'] },
  waterway_tunnel: { 'line-color': MAP_PAINT['Paint/daylight-water'] },
  waterway_river: { 'line-color': MAP_PAINT['Paint/daylight-water'] },
  waterway_other: { 'line-color': MAP_PAINT['Paint/daylight-water'] },
  building: {
    'fill-color': MAP_PAINT['Paint/daylight-building'],
    'fill-outline-color': MAP_PAINT['Paint/daylight-building-edge'],
  },
  'building-3d': { 'fill-extrusion-color': MAP_PAINT['Paint/daylight-building'] },
  // Road names dark gray on a white halo, as Apple writes them; Liberty's have none.
  'highway-name-minor': { 'text-halo-color': MAP_PAINT['Paint/casing'] },
  'highway-name-major': { 'text-halo-color': MAP_PAINT['Paint/casing'] },
  'highway-name-path': { 'text-halo-color': MAP_PAINT['Paint/daylight-land'] },
};

/** A road's fill and its casing, by the kind Liberty names in its layer ids. */
interface RoadColours {
  fill: string;
  edge: string;
}

const HIGHWAY: RoadColours = {
  fill: MAP_PAINT['Paint/daylight-highway'],
  edge: MAP_PAINT['Paint/daylight-highway-edge'],
};
const AVENUE: RoadColours = {
  fill: MAP_PAINT['Paint/daylight-road'],
  edge: MAP_PAINT['Paint/daylight-road-edge'],
};
const STREET: RoadColours = {
  fill: MAP_PAINT['Paint/daylight-street'],
  edge: MAP_PAINT['Paint/daylight-street-edge'],
};

/** Liberty's road kinds, the middle of `road_…`, `bridge_…` and `tunnel_…`. Rail and paths keep theirs. */
const ROAD_KINDS: Record<string, RoadColours> = {
  motorway: HIGHWAY,
  motorway_link: HIGHWAY,
  trunk_primary: AVENUE,
  secondary_tertiary: AVENUE,
  link: AVENUE,
  minor: STREET,
  street: STREET,
  service_track: STREET,
};

const ROAD_ID = /^(?:road|bridge|tunnel)_([a-z_]+?)(_casing)?$/;

/** A road layer's colour in Apple's palette, or none for a layer that is not one of its roads. */
function roadPaint(id: string): LineLayerSpecification['paint'] | undefined {
  const [, kind, casing] = ROAD_ID.exec(id) ?? [];
  const colours = kind === undefined ? undefined : ROAD_KINDS[kind];
  if (!colours) return undefined;
  return { 'line-color': casing ? colours.edge : colours.fill };
}

/**
 * Shops, offices and malls, which Liberty leaves as ground: Apple's pale
 * yellow. Under the parks, so a park inside a business district (Ayala
 * Triangle) stays green.
 */
const COMMERCIAL: FillLayerSpecification = {
  id: 'daylight-commercial',
  type: 'fill',
  source: SOURCE,
  'source-layer': 'landuse',
  filter: ['match', ['get', 'class'], ['commercial', 'retail'], true, false],
  paint: { 'fill-color': MAP_PAINT['Paint/daylight-commercial'] },
};

function daylightLayer(l: LayerSpecification): LayerSpecification {
  const palette = GROUND[l.id] ?? roadPaint(l.id);
  if (!palette || !('paint' in l)) return mutedLayer(l);
  const paint = Object.fromEntries([...Object.entries(l.paint ?? {}), ...Object.entries(palette)]);
  return { ...l, paint };
}

/**
 * Liberty in Apple Maps' light palette. A style without OpenFreeMap's tiles
 * (the e2e suites' bare stand-in) gets no commercial layer, which reads them.
 * Pure: the input is left alone.
 */
export function daylightStyle(style: StyleSpecification): StyleSpecification {
  const layers = style.layers.map(daylightLayer);
  if (!(SOURCE in style.sources)) return { ...style, layers };
  const parks = layers.findIndex((l) => l.id === 'park');
  const at = parks < 0 ? 1 : parks;
  return { ...style, layers: [...layers.slice(0, at), COMMERCIAL, ...layers.slice(at)] };
}
