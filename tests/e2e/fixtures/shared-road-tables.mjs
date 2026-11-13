// Made-up studio tables for the checks that must not wait on today's data:
// three routes that share one road, each drawn both ways, and a fourth far
// from them. Nothing in it is read from the live tables or the published map,
// so no day's data can make group-test skip.
//
//                         Hilaga (north end)
//                              |
//   Kanluran ══ J1 ════════════ J2 ══ Silangan       the avenue, west to east
//      └──────┘ |   └── way back ──┘   └──────┘
//               Timog (south end)
//
// - Kanluran – Silangan (jeepney) runs the avenue from end to end.
// - Kanluran – Hilaga (jeepney) leaves Kanluran by a side street, joins the
//   avenue at J1 and turns north at J2.
// - Timog – Silangan (bus) comes up to J1, rides the avenue to J2 and reaches
//   Silangan by a side street.
// So from J1 to J2 all three share the road, and nowhere else do two of them:
// each has a stretch of its own, where it alone runs both ways. Going back,
// the middle of the shared road is a one-way pair: the way back runs 60 m
// north of the avenue there, clear of every outbound line.
// - Malayo (e-jeepney) is two kilometres south, under no tap.
//
// Each direction passes three hintuans on the shared road, the outbound ones
// on the avenue and the way back's on its own street.
//
// SHARED_ROAD_TABLES seeds lib/fake-studio-db.mjs.

/** The fixture's south-west corner; everything is laid out in metres east and north of it. */
const ORIGIN = [121.05, 14.72];
const M_LAT = 111_000;
const M_LNG = 111_000 * Math.cos((ORIGIN[1] * Math.PI) / 180);
const at = ([x, y]) => [
  +(ORIGIN[0] + x / M_LNG).toFixed(7),
  +(ORIGIN[1] + y / M_LAT).toFixed(7),
];

/** Metres between points on a line: what the router gives. */
const POINT_EVERY_M = 20;
/** The corners joined by straight streets, a point every POINT_EVERY_M, in degrees. */
const street = (corners) => {
  const out = [corners[0]];
  for (let i = 1; i < corners.length; i++) {
    const [a, b] = [corners[i - 1], corners[i]];
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / POINT_EVERY_M));
    for (let t = 1; t <= n; t++)
      out.push([a[0] + ((b[0] - a[0]) * t) / n, a[1] + ((b[1] - a[1]) * t) / n]);
  }
  return out.map(at);
};

const KANLURAN = [0, 0];
const SILANGAN = [2000, 0];
const HILAGA = [1400, 800];
const TIMOG = [600, -800];
const J1 = [600, 0];
const J2 = [1400, 0];
/** The way back's own street beside the avenue, east to west. */
const WAY_BACK = [
  [1200, 0],
  [1200, 60],
  [800, 60],
  [800, 0],
];

const NOW = '2026-11-01T00:00:00+00:00';
const OWNER = '11111111-1111-4111-8111-111111111111';

const square = ([lng, lat], d) => ({
  type: 'Polygon',
  coordinates: [
    [
      [lng - d, lat - d],
      [lng + d, lat - d],
      [lng + d, lat + d],
      [lng - d, lat + d],
      [lng - d, lat - d],
    ],
  ],
});
const stop = (id, name, kind, xy, size) => ({
  id,
  owner_id: OWNER,
  name,
  informal: name,
  aliases: [],
  kind,
  point: { type: 'Point', coordinates: at(xy) },
  area: square(at(xy), size),
  note: 'a made-up box for the browser suites',
  status: 'approved',
  revision: 1,
  created_at: NOW,
});
/** How far off its road a terminal's lot lies, in metres. */
const LOT_OFF_ROAD_M = 60;
// A terminal is a lot beside the road, `side` of it (1 north, -1 south): a tap on the end of a
// line is the line's, never the box's.
const terminal = (id, name, [x, y], side) =>
  stop(`shared-road-${id}`, name, 'terminal', [x, y + side * LOT_OFF_ROAD_M], 0.0003);
const hintuan = (id, name, xy) => stop(`shared-road-${id}`, name, 'hintuan', xy, 0.00012);

const TERMINALS = {
  kanluran: terminal('kanluran', 'Kanluran', KANLURAN, -1),
  silangan: terminal('silangan', 'Silangan', SILANGAN, 1),
  hilaga: terminal('hilaga', 'Hilaga', HILAGA, 1),
  timog: terminal('timog', 'Timog', TIMOG, -1),
  malayoWest: terminal('malayo-west', 'Malayo Kanluran', [0, -2000], -1),
  malayoEast: terminal('malayo-east', 'Malayo Silangan', [1000, -2000], -1),
};
// West to east: the outbound lines pass them in this order, the way back in the other.
const PLACES = ['Bayan', 'Simbahan', 'Palengke'];
const PLACE_XS = [900, 1000, 1100];
const outboundBoxes = PLACES.map((name, i) =>
  hintuan(`papunta-${i + 1}`, `${name} Papunta`, [PLACE_XS[i], 0]),
);
const wayBackBoxes = PLACES.map((name, i) =>
  hintuan(`pabalik-${i + 1}`, `${name} Pabalik`, [PLACE_XS[i], 60]),
);

const route = (id, mode, head, tail) => ({
  id: `shared-road-${id}`,
  owner_id: OWNER,
  signboard: null,
  route_code: null,
  short_name: null,
  long_name: null,
  mode,
  fare_note: null,
  fare_as_of: null,
  head_stop_id: head.id,
  tail_stop_id: tail.id,
  via: null,
  is_loop: false,
  status: 'approved',
  revision: 1,
  created_at: NOW,
  updated_at: NOW,
});
const direction = (routeRow, reversed, coordinates) => {
  const shape = { type: 'LineString', coordinates };
  return {
    id: `${routeRow.id}-${reversed ? 'back' : 'out'}`,
    route_id: routeRow.id,
    owner_id: OWNER,
    direction_name: null,
    origin_terminal: null,
    destination_terminal: null,
    shape,
    overview: shape,
    control_points: [coordinates[0], coordinates.at(-1)],
    segments: [{ snap: 'snapped', coordinates, streets: [] }],
    reversed,
    confidence: 'drawn',
    borrowed_from: null,
    borrowed_part: null,
    borrowed_m: null,
    signboards: [],
    created_at: NOW,
    updated_at: NOW,
  };
};
/** A route and its two directions: out along `corners`, back along `backCorners`. */
const bothWays = (id, mode, head, tail, corners, backCorners) => {
  const row = route(id, mode, head, tail);
  return {
    route: row,
    directions: [direction(row, false, street(corners)), direction(row, true, street(backCorners))],
  };
};

const SIDE_STREET_WEST = [
  [0, 150],
  [600, 150],
];
const SIDE_STREET_EAST = [
  [1400, -150],
  [2000, -150],
];
const DRAWN = [
  bothWays(
    'avenue',
    'jeepney',
    TERMINALS.kanluran,
    TERMINALS.silangan,
    [KANLURAN, J1, J2, SILANGAN],
    [SILANGAN, J2, ...WAY_BACK, J1, KANLURAN],
  ),
  bothWays(
    'north',
    'jeepney',
    TERMINALS.kanluran,
    TERMINALS.hilaga,
    [KANLURAN, ...SIDE_STREET_WEST, J1, J2, HILAGA],
    [HILAGA, J2, ...WAY_BACK, J1, ...[...SIDE_STREET_WEST].reverse(), KANLURAN],
  ),
  bothWays(
    'south',
    'bus',
    TERMINALS.timog,
    TERMINALS.silangan,
    [TIMOG, J1, J2, ...SIDE_STREET_EAST, SILANGAN],
    [SILANGAN, ...[...SIDE_STREET_EAST].reverse(), J2, ...WAY_BACK, J1, TIMOG],
  ),
  bothWays(
    'malayo',
    'e_jeepney',
    TERMINALS.malayoWest,
    TERMINALS.malayoEast,
    [
      [0, -2000],
      [1000, -2000],
    ],
    [
      [1000, -2000],
      [0, -2000],
    ],
  ),
];
/** The three routes on the shared road, by id. */
const SHARING = DRAWN.slice(0, 3);

export const SHARED_ROAD_TABLES = {
  route: DRAWN.map((d) => d.route),
  route_variant: DRAWN.flatMap((d) => d.directions),
  stop: [...Object.values(TERMINALS), ...outboundBoxes, ...wayBackBoxes],
  route_stop: SHARING.flatMap(({ directions: [out, back] }) => [
    ...outboundBoxes.map((s, i) => ({
      route_variant_id: out.id,
      stop_id: s.id,
      stop_sequence: i + 1,
    })),
    // The way back meets the places east to west.
    ...[...wayBackBoxes].reverse().map((s, i) => ({
      route_variant_id: back.id,
      stop_id: s.id,
      stop_sequence: i + 1,
    })),
  ]),
  draft: [],
  editor_name: [],
};
