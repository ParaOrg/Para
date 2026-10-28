// A made-up published map for the checks that must not wait on today's data:
// one jeepney route, Kanluran – Silangan, drawn both ways between two
// terminals, with four places along it, each a box on Papunta's road and a
// box on Pabalik's, 330 m apart. Nothing in it is read from the published map,
// so a nightly publish cannot make these checks skip.
//
// The terminals have no links, as five of the six on today's published map
// have none (public-map-01): a terminal's card lists no route.
//
// serveTwoWayMap(page) serves it in place of the index and its line files;
// phone-test's section 5d opens its trip.
import { readFileSync } from 'node:fs';

const SCHEMA = Number(
  /MAP_FILE_SCHEMA = (\d+);/.exec(
    readFileSync('src/features/routes/published/map-file.ts', 'utf8'),
  )?.[1],
);

const M_LAT = 111_000;
const M_LNG = 111_000 * Math.cos((14.6 * Math.PI) / 180);
const metresAlong = (line) =>
  line
    .slice(1)
    .reduce(
      (sum, p, i) =>
        sum + Math.hypot((p[0] - line[i][0]) * M_LNG, (p[1] - line[i][1]) * M_LAT),
      0,
    );

const PAPUNTA_LAT = 14.6;
const PABALIK_LAT = 14.597;
const WEST = [121.0185, 14.5985];
const EAST = [121.0515, 14.5985];

/** A road from x 121.020 to 121.050 at `lat`, a vertex every 100 m or so. */
const road = (lat) => Array.from({ length: 31 }, (_, i) => [+(121.02 + i * 0.001).toFixed(3), lat]);

const PAPUNTA_LINE = [WEST, ...road(PAPUNTA_LAT), EAST];
const PABALIK_LINE = [EAST, ...road(PABALIK_LAT).reverse(), WEST];

/** Where a tap finds Papunta alone: halfway between two of its places, 330 m from Pabalik. */
export const PAPUNTA_TAP = [121.035, PAPUNTA_LAT];

const square = ([x, y], d) => ({
  type: 'Polygon',
  coordinates: [
    [
      [x - d, y - d],
      [x + d, y - d],
      [x + d, y + d],
      [x - d, y + d],
      [x - d, y - d],
    ],
  ],
});

const stop = ({ id, name, informal = name, kind, at, size = 0.0003 }) => ({
  id,
  name,
  informal,
  aliases: [],
  kind,
  point: { type: 'Point', coordinates: at },
  area: square(at, size),
  note: 'a made-up box for the browser suites',
  created_at: '2026-10-28T00:00:00+00:00',
});

export const WEST_TERMINAL = stop({
  id: 'fixture-west',
  name: 'Kanluran Terminal',
  kind: 'terminal',
  at: WEST,
  size: 0.0004,
});
export const EAST_TERMINAL = stop({
  id: 'fixture-east',
  name: 'Silangan Terminal',
  kind: 'terminal',
  at: EAST,
  size: 0.0004,
});

// The places, west to east: Papunta passes them in this order, Pabalik in the other.
const PLACES = ['Bayan', 'Simbahan', 'Palengke', 'Paaralan'];
const PLACE_XS = [121.025, 121.031, 121.041, 121.046];
const papuntaBoxes = PLACES.map((place, i) =>
  stop({
    id: `fixture-papunta-${i + 1}`,
    name: `${place} Papunta`,
    informal: place,
    kind: 'hintuan',
    at: [PLACE_XS[i], PAPUNTA_LAT],
  }),
);
const pabalikBoxes = PLACES.map((place, i) =>
  stop({
    id: `fixture-pabalik-${i + 1}`,
    name: `${place} Pabalik`,
    informal: place,
    kind: 'hintuan',
    at: [PLACE_XS[i], PABALIK_LAT],
  }),
);

const ROUTE_ID = 'fixture-route';
export const PAPUNTA_ID = 'fixture-papunta';
export const PABALIK_ID = 'fixture-pabalik';
const route = {
  id: ROUTE_ID,
  signboard: null,
  long_name: null,
  mode: 'jeepney',
  fare_note: null,
  head_stop_id: WEST_TERMINAL.id,
  tail_stop_id: EAST_TERMINAL.id,
  via: null,
  name: 'Kanluran – Silangan',
};
const variant = (id, name, reversed, line) => ({
  id,
  route_id: ROUTE_ID,
  direction_name: name,
  origin_terminal: null,
  destination_terminal: null,
  reversed,
  confidence: 'drawn',
  overview: { type: 'LineString', coordinates: line },
  metres: Math.round(metresAlong(line) * 100) / 100,
  signboards: [],
  route,
});

export const TWO_WAY_MAP = {
  schema: SCHEMA,
  published_at: '2026-10-28T00:00:00Z',
  license: 'ODbL-1.0',
  attribution: 'Made up for the browser suites.',
  variants: [
    variant(PAPUNTA_ID, 'Kanluran → Silangan', false, PAPUNTA_LINE),
    variant(PABALIK_ID, 'Silangan → Kanluran', true, PABALIK_LINE),
  ],
  stops: [WEST_TERMINAL, EAST_TERMINAL, ...papuntaBoxes, ...pabalikBoxes],
  links: [
    ...papuntaBoxes.map((s, i) => ({
      route_variant_id: PAPUNTA_ID,
      stop_id: s.id,
      stop_sequence: i + 1,
    })),
    // Pabalik meets the places east to west.
    ...[...pabalikBoxes].reverse().map((s, i) => ({
      route_variant_id: PABALIK_ID,
      stop_id: s.id,
      stop_sequence: i + 1,
    })),
  ],
  source_revisions: { routes: { [ROUTE_ID]: 1 } },
};

const LINES = {
  [PAPUNTA_ID]: PAPUNTA_LINE,
  [PABALIK_ID]: PABALIK_LINE,
};

/** Serves TWO_WAY_MAP for every index the page asks for, and its two line files. */
export const serveTwoWayMap = async (page) => {
  await page.route(/\/data\/index\.v\d+\.json(\?.*)?$/, (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TWO_WAY_MAP) }),
  );
  await page.route(/\/data\/lines\/(fixture-[a-z]+)\.json(\?.*)?$/, (r) => {
    const id = /\/data\/lines\/(fixture-[a-z]+)\.json/.exec(r.request().url())[1];
    const line = LINES[id];
    return line
      ? r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ schema: 2, id, shape: { type: 'LineString', coordinates: line } }),
        })
      : r.fulfill({ status: 404, body: '' });
  });
};
