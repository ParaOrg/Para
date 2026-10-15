import type {
  ExpressionSpecification,
  LayerSpecification,
  LineLayerSpecification,
  StyleSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl';

import { MAP_PAINT } from '@/design-system/foundation/map-colours';

import { recolouredStyle, type Recolour } from './recolour';

/*
 * Monochrome: Positron, as detailed as its tiles allow, and still only grays
 * (the owner, 2026-10-15: "gray only but that gray is detailed", easy on the
 * eyes, renamed from Gray). Everything here draws what the tiles a phone
 * already holds carry: no new request, no bigger cache. The routes and
 * hotspots painted on top keep all the colour.
 *
 * Places — "Gray, detailed", decided 2026-09-22. The z14 tile over SM
 * Fairview holds the `poi`, `building` and `housenumber` layers: 19 of 22
 * names read off the owner's openstreetmap.org screenshot were in it.
 * Transit first, then the landmarks a driver would name, then, close in,
 * every other place and the house numbers. Italic is the basemap's voice; our
 * own labels are bold. Taps are unaffected: `tapTargets` queries our two hit
 * layers by name and nothing else.
 *
 * Roads — after Dark (2026-10-15: "Dark has overpass, can we make the gray
 * like these?"). Every road in the tiles says whether it is a bridge or a
 * tunnel and its level, 1 to 5 up and -1 and -2 down (the Skyway is 2 to 4
 * over EDSA, decoded at Magallanes). Positron reads that for the motorways
 * only: a flyover is drawn as one more street, and an underpass on top of the
 * road above it. Here the roads on the ground are drawn without either; the
 * underpasses go under everything, dashed; the bridges go over, one pair of
 * layers a level so the higher crosses the lower, edged firmer the higher
 * they are; and the EDSA busway, which Positron leaves out, is drawn too.
 *
 * Buildings — firmer than Positron's whisper, and in 3D from z15 as Colour
 * has them: they stand up when the map is tilted (two fingers up or down).
 *
 * And all of it in cool gray, last (see `toCoolGray`).
 */

const SOURCE = 'openmaptiles';

// ------------------------------------------------------------------ places

const FONT = ['Noto Sans Italic'];
const NAME: ExpressionSpecification = ['get', 'name'];
/*
 * The icons in OpenFreeMap's sprite are coloured pictures, which MapLibre
 * cannot gray. Transit keeps its own, the bus and the train, quiet blues
 * beside the blue-gray names; every other place takes the sprite's gray dot.
 */
/** The 11 px transit icon, `<class>_11`, or the dot for a class with none. */
const TRANSIT_ICON: ExpressionSpecification = [
  'coalesce',
  ['image', ['concat', ['get', 'class'], '_11']],
  ['image', 'dot_11'],
];
const DOT = 'dot_11';

const TRANSIT_COLOUR = MAP_PAINT['Paint/basemap-transit'];
const LANDMARK_COLOUR = MAP_PAINT['Paint/basemap-landmark'];

const IS_STATION: ExpressionSpecification = [
  'any',
  ['==', ['get', 'subclass'], 'bus_station'],
  ['==', ['get', 'class'], 'railway'],
];
const IS_STOP: ExpressionSpecification = ['==', ['get', 'subclass'], 'bus_stop'];
// The big anchors people give directions by: the mall, the market, the
// hospital, the college, the hall, the police station.
const IS_LANDMARK: ExpressionSpecification = [
  'any',
  ['match', ['get', 'class'], ['grocery', 'college', 'town_hall', 'police'], true, false],
  ['all', ['==', ['get', 'class'], 'hospital'], ['==', ['get', 'subclass'], 'hospital']],
  [
    'all',
    ['==', ['get', 'class'], 'shop'],
    ['match', ['get', 'subclass'], ['mall', 'department_store'], true, false],
  ],
];
// Real landmarks, but hundreds under one z15 view: at z15 they crowded the
// anchors out (measured over SM Fairview, 2026-09-22).
const IS_MINOR_LANDMARK: ExpressionSpecification = [
  'match',
  ['get', 'class'],
  ['school', 'place_of_worship', 'fuel', 'park'],
  true,
  false,
];

const place = (
  id: string,
  minzoom: number,
  filter: ExpressionSpecification,
  colour: string,
  icon: ExpressionSpecification | string = DOT,
): SymbolLayerSpecification => ({
  id,
  type: 'symbol',
  source: SOURCE,
  'source-layer': 'poi',
  minzoom,
  filter: ['all', ['==', ['geometry-type'], 'Point'], filter],
  layout: {
    'icon-image': icon,
    'icon-allow-overlap': false,
    'text-field': NAME,
    'text-font': FONT,
    'text-size': 11,
    'text-anchor': 'top',
    'text-offset': [0, 0.7],
    'text-max-width': 8,
    'text-optional': true,
  },
  paint: {
    'icon-opacity': 0.75,
    'text-color': colour,
    'text-halo-color': MAP_PAINT['Paint/casing'],
    'text-halo-width': 1.2,
    'text-halo-blur': 0.4,
  },
});

/**
 * Last in the style, after Positron's labels, and in rising order: MapLibre
 * places symbols from the top layer down, so where two collide the later
 * one keeps its name — a station over a shop, a shop over a house number.
 */
const PLACE_LAYERS: readonly LayerSpecification[] = [
  {
    id: 'detail-house-numbers',
    type: 'symbol',
    source: SOURCE,
    'source-layer': 'housenumber',
    minzoom: 17,
    layout: {
      'text-field': ['get', 'housenumber'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 10,
    },
    paint: {
      'text-color': MAP_PAINT['Paint/basemap-house-number'],
      'text-halo-color': MAP_PAINT['Paint/casing'],
      'text-halo-width': 1,
    },
  },
  // Every other place close in: the eateries, the stores, the gates (2,594
  // under one z15 viewport over Fairview) leave room for each other by z17.
  place(
    'detail-places',
    17,
    ['!', ['any', IS_STATION, IS_STOP, IS_LANDMARK, IS_MINOR_LANDMARK]],
    LANDMARK_COLOUR,
  ),
  place('detail-landmarks-minor', 16, IS_MINOR_LANDMARK, LANDMARK_COLOUR),
  place('detail-landmarks', 15, IS_LANDMARK, LANDMARK_COLOUR),
  place('detail-stops', 15, IS_STOP, TRANSIT_COLOUR, TRANSIT_ICON),
  place('detail-stations', 13, IS_STATION, TRANSIT_COLOUR, TRANSIT_ICON),
];

// --------------------------------------------------------------- buildings

/** Positron paints buildings rgb(234,234,229) on a rgb(245,245,241) ground — a whisper. A shade darker reads as a block. */
const BUILDING_PAINT = {
  'fill-color': MAP_PAINT['Paint/basemap-building'],
  'fill-outline-color': MAP_PAINT['Paint/basemap-building-edge'],
};

/** Colour's 3D buildings (Liberty's `building-3d`), in Monochrome's gray, from z15. */
const BUILDINGS_3D: LayerSpecification = {
  id: 'detail-buildings-3d',
  type: 'fill-extrusion',
  source: SOURCE,
  'source-layer': 'building',
  minzoom: 15,
  paint: {
    'fill-extrusion-color': MAP_PAINT['Paint/basemap-building'],
    'fill-extrusion-height': ['get', 'render_height'],
    'fill-extrusion-base': ['get', 'render_min_height'],
    'fill-extrusion-opacity': 0.7,
  },
};

// ------------------------------------------------------------------- roads

/** A line, in one piece or several: the tiles carry both. */
const IS_LINE: ExpressionSpecification = [
  'match',
  ['geometry-type'],
  ['LineString', 'MultiLineString'],
  true,
  false,
];
const STREET_CLASSES = ['minor', 'service', 'track', 'busway'];
const ROAD_CLASSES = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'];
const ALL_CLASSES = [...ROAD_CLASSES, ...STREET_CLASSES, 'path'];
const IS_STREET: ExpressionSpecification = ['match', ['get', 'class'], STREET_CLASSES, true, false];
const ON_GROUND: ExpressionSpecification = [
  'match',
  ['get', 'brunnel'],
  ['bridge', 'tunnel'],
  false,
  true,
];
/** OSM's `layer`: how many levels up a bridge is. A bridge without one is one up. */
const LEVEL: ExpressionSpecification = ['coalesce', ['get', 'layer'], 1];

/** A width by the kind of road: Positron's own sizes, the motorway's widest. */
const byKind = (
  motorway: number,
  road: number,
  street: number,
  path: number,
): ExpressionSpecification => [
  'match',
  ['get', 'class'],
  'motorway',
  motorway,
  STREET_CLASSES,
  street,
  'path',
  path,
  road,
];

const DECK_WIDTH: ExpressionSpecification = [
  'interpolate',
  ['exponential', 1.4],
  ['zoom'],
  6,
  byKind(1.3, 0.6, 0.3, 0),
  13,
  byKind(5, 4, 1.8, 1),
  20,
  byKind(30, 20, 20, 8),
];
const EDGE_WIDTH: ExpressionSpecification = [
  'interpolate',
  ['exponential', 1.4],
  ['zoom'],
  13,
  byKind(7, 6, 3.5, 2.5),
  20,
  byKind(40, 25, 24, 12),
];

const roadLine = (
  id: string,
  minzoom: number,
  filter: ExpressionSpecification,
  paint: LineLayerSpecification['paint'],
  cap: 'butt' | 'round' = 'butt',
): LayerSpecification => ({
  id,
  type: 'line',
  source: SOURCE,
  'source-layer': 'transportation',
  minzoom,
  filter: ['all', IS_LINE, filter],
  layout: { 'line-cap': cap, 'line-join': 'round' },
  paint,
});

/** Streets edged from z14, white inside, as Dark draws its roads; the busway, which Positron leaves out, among them. */
const STREET_EDGE = roadLine(
  'detail-street-edge',
  14,
  ['all', IS_STREET, ON_GROUND],
  {
    'line-color': MAP_PAINT['Paint/basemap-street-edge'],
    'line-width': ['interpolate', ['exponential', 1.55], ['zoom'], 14, 4, 20, 23],
  },
  'round',
);
const BUSWAY = roadLine(
  'detail-busway',
  13,
  ['all', ['==', ['get', 'class'], 'busway'], ON_GROUND],
  {
    'line-color': MAP_PAINT['Paint/basemap-street'],
    'line-width': ['interpolate', ['exponential', 1.55], ['zoom'], 13, 1.8, 20, 20],
  },
  'round',
);
const STREET_COLOUR: ExpressionSpecification = [
  'step',
  ['zoom'],
  MAP_PAINT['Paint/basemap-street-far'],
  14,
  MAP_PAINT['Paint/basemap-street'],
];

/** Paths and footbridges dashed, a shade firmer than Positron's, which hardly showed. */
const PATH_PAINT: LineLayerSpecification['paint'] = {
  'line-color': MAP_PAINT['Paint/basemap-path'],
  'line-dasharray': [2, 1.5],
  'line-width': ['interpolate', ['linear'], ['zoom'], 14, 0.8, 20, 4],
};

const IS_TUNNEL: ExpressionSpecification = [
  'all',
  ['==', ['get', 'brunnel'], 'tunnel'],
  // Positron draws the motorways' own (tunnel_motorway_*).
  ['match', ['get', 'class'], ALL_CLASSES.filter((c) => c !== 'motorway'), true, false],
];

/** Under everything: a dashed edge and a pale inside, as maps draw what runs underneath. */
const TUNNEL_LAYERS: readonly LayerSpecification[] = [
  roadLine('detail-tunnel-edge', 13, IS_TUNNEL, {
    'line-color': MAP_PAINT['Paint/basemap-bridge-edge'],
    'line-dasharray': [1.5, 1],
    'line-width': EDGE_WIDTH,
  }),
  roadLine('detail-tunnel', 8, IS_TUNNEL, {
    'line-color': MAP_PAINT['Paint/basemap-tunnel'],
    'line-width': DECK_WIDTH,
  }),
];

/** One level of bridges: an edge from z13 and a white deck. */
const bridges = (
  name: string,
  level: ExpressionSpecification,
  edge: string,
): LayerSpecification[] => {
  const filter: ExpressionSpecification = [
    'all',
    ['==', ['get', 'brunnel'], 'bridge'],
    ['match', ['get', 'class'], ALL_CLASSES, true, false],
    level,
  ];
  return [
    roadLine(`detail-bridge-${name}-edge`, 13, filter, {
      'line-color': edge,
      'line-width': EDGE_WIDTH,
    }),
    roadLine(`detail-bridge-${name}`, 6, filter, {
      'line-color': MAP_PAINT['Paint/basemap-street'],
      'line-width': DECK_WIDTH,
    }),
  ];
};

/** Lowest first, so a flyover crosses a bridge and the Skyway crosses both. */
const BRIDGE_LAYERS: readonly LayerSpecification[] = [
  ...bridges('1', ['<=', LEVEL, 1], MAP_PAINT['Paint/basemap-bridge-edge']),
  ...bridges('2', ['==', LEVEL, 2], MAP_PAINT['Paint/basemap-bridge-edge']),
  ...bridges('3', ['==', LEVEL, 3], MAP_PAINT['Paint/basemap-skyway-edge']),
  ...bridges('4', ['>=', LEVEL, 4], MAP_PAINT['Paint/basemap-skyway-edge']),
];

/** Dark's one-way arrows: `oneway` is in OpenFreeMap's sprite, which every design shares. */
const oneWay = (id: string, direction: 1 | -1): SymbolLayerSpecification => ({
  id,
  type: 'symbol',
  source: SOURCE,
  'source-layer': 'transportation',
  minzoom: 15,
  filter: ['==', ['get', 'oneway'], direction],
  layout: {
    'icon-image': 'oneway',
    'icon-padding': 2,
    'icon-rotate': direction === 1 ? 0 : 180,
    'icon-rotation-alignment': 'map',
    'icon-size': ['interpolate', ['linear'], ['zoom'], 15, 0.5, 19, 1],
    'symbol-placement': 'line',
    'symbol-spacing': 200,
  },
  paint: { 'icon-opacity': 0.4 },
});

const ONE_WAY_LAYERS = [oneWay('detail-one-way', 1), oneWay('detail-one-way-back', -1)];

/**
 * Positron's roads drawn on the ground only, by the classes each draws (its
 * own filters, written out): bridges and tunnels have layers of their own here.
 */
const MAIN_ROADS = ['primary', 'secondary', 'tertiary', 'trunk'];
const GROUND_ROADS = new Map<string, string[]>([
  ['highway_path', ['path']],
  ['highway_minor', ['minor', 'service', 'track']],
  ['highway_major_casing', MAIN_ROADS],
  ['highway_major_inner', MAIN_ROADS],
]);

/** Positron's motorway bridges, replaced by the levelled ones. */
const MOTORWAY_BRIDGES = new Set([
  'highway_motorway_bridge_casing',
  'highway_motorway_bridge_inner',
]);

/** One of Positron's layers, as Monochrome draws it, with what goes beside it. */
function dress(l: LayerSpecification): LayerSpecification[] {
  if (l.id === 'building' && l.type === 'fill') {
    return [{ ...l, paint: { ...l.paint, ...BUILDING_PAINT } }];
  }
  if (l.id === 'tunnel_motorway_casing') return [...TUNNEL_LAYERS, l];
  if (MOTORWAY_BRIDGES.has(l.id)) return l.id.endsWith('casing') ? [...BRIDGE_LAYERS] : [];
  const classes = GROUND_ROADS.get(l.id);
  if (l.type !== 'line' || !classes) return [l];

  const grounded: LineLayerSpecification = {
    ...l,
    filter: ['all', IS_LINE, ['match', ['get', 'class'], classes, true, false], ON_GROUND],
  };
  if (l.id === 'highway_minor') {
    return [
      STREET_EDGE,
      { ...grounded, paint: { ...l.paint, 'line-color': STREET_COLOUR } },
      BUSWAY,
    ];
  }
  if (l.id === 'highway_path') return [{ ...grounded, paint: { ...l.paint, ...PATH_PAINT } }];
  return [grounded];
}

/**
 * Positron as Monochrome. A Positron layer this looks for and does not find
 * leaves its addition out. The 3D buildings go over the roads, as Colour's
 * do; the one-way arrows are the first labels, so a street's name wins over
 * an arrow where they meet; the places come last. Pure: the input is left
 * alone.
 */
export function monochromeStyle(style: StyleSpecification): StyleSpecification {
  const layers = style.layers.flatMap(dress);
  const firstLabel = layers.findIndex((l) => l.type === 'symbol');
  const cut = firstLabel < 0 ? layers.length : firstLabel;
  const detailed = {
    ...style,
    layers: [
      ...layers.slice(0, cut),
      BUILDINGS_3D,
      ...ONE_WAY_LAYERS,
      ...layers.slice(cut),
      ...PLACE_LAYERS,
    ],
  };
  return recolouredStyle(detailed, toCoolGray);
}

// -------------------------------------------------------------- cool gray

/*
 * Cool gray (the owner, 2026-10-15: "make the monochrome in cool colours,
 * cool gray"). Positron's grays lean warm, toward beige; here every colour
 * Monochrome draws, Positron's and ours, turns to the same slate hue with
 * the same small saturation, the cool gray of Tailwind's `gray`, and keeps
 * its lightness, so nothing gets lighter or darker and white stays white. A
 * colour already more saturated (the transit names' blue) keeps its own.
 */
const COOL_HUE = 218;
const COOL_SATURATION = 14;

const toCoolGray: Recolour = (c) => ({
  ...c,
  hue: COOL_HUE,
  saturation: Math.max(c.saturation, COOL_SATURATION),
});
