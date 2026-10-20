// A loop's trip on the public map (UP – Ikot): the card slice of loops. The map
// file is the committed one with a made-up loop round a block near UP Diliman
// added — five hintuan boxes on a closed line, their links, and its line file —
// served in place of the real index, so no database is read.
//
//   npm run dev                          (in another terminal)
//   node tests/e2e/loop-test.mjs
//   PARAPO_NO_TILES=1 node tests/e2e/loop-test.mjs   no basemap tiles (a sandbox)
//
// What it proves, on a phone: a loop's trip has no SWITCH and says Ikot where
// Papunta stands; its tip is the first place its line passes with no location,
// the one nearest the commuter once the LocatorButton has a fix (chosen as the
// trip opens, never moved under the rider), the first when the fix is vague,
// and the place whose card it was opened from; its top and bottom row are the
// tip; the tiles show the whole loop and then the ride from the tip to a row;
// a start and an end above it wrap the ride, one fold between, and either end
// row rides on round to the tip; × Remove as start lets the ride go.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { BASE, bareStyle, harness } from './lib/harness.mjs';

const NO_TILES = !!process.env.PARAPO_NO_TILES;
const { check, tally } = harness();

// ------------------------------------------------------------------ the fixture
const published = JSON.parse(readFileSync('public/data/index.v5.json', 'utf8'));
const SCHEMA = Number(
  /MAP_FILE_SCHEMA = (\d+);/.exec(
    readFileSync('src/features/routes/published/map-file.ts', 'utf8'),
  )?.[1],
);

const M_LAT = 111_000;
const M_LNG = 111_000 * Math.cos((14.654 * Math.PI) / 180);
const metresBetween = (a, b) => Math.hypot((a[0] - b[0]) * M_LNG, (a[1] - b[1]) * M_LAT);

// The block, going round clockwise from its south-west corner: up the west edge,
// east along the top, down the east edge, west along the bottom, home.
const RING = [
  [121.07, 14.65],
  [121.07, 14.656],
  [121.078, 14.656],
  [121.078, 14.65],
  [121.07, 14.65],
];
const LOOP_METRES = RING.slice(1).reduce((sum, p, i) => sum + metresBetween(RING[i], p), 0);

// Where along the ring (metres from its start) a point on it lies.
const alongRing = (p) => {
  let walked = 0;
  for (let i = 1; i < RING.length; i++) {
    const [a, b] = [RING[i - 1], RING[i]];
    const leg = metresBetween(a, b);
    const onLeg = metresBetween(a, p) + metresBetween(p, b) - leg < 0.5;
    if (onLeg) return walked + metresBetween(a, p);
    walked += leg;
  }
  throw new Error(`${p} is not on the ring`);
};

// Five boxes on the ring, in the order the line passes them.
const PLACES = [
  { name: 'Palma Hall', at: [121.07, 14.652] },
  { name: 'Quezon Hall', at: [121.0725, 14.656] },
  { name: 'Sunken Garden', at: [121.0765, 14.656] },
  { name: 'Engineering', at: [121.078, 14.6535] },
  { name: 'Math Building', at: [121.0745, 14.65] },
].map((p, i) => ({ ...p, id: `loop-stop-${i + 1}`, metres: alongRing(p.at) }));
const [PALMA, QUEZON, SUNKEN, ENGINEERING, MATH] = PLACES;

const box = ({ id, name, at }) => {
  const d = 0.0003;
  const [x, y] = at;
  return {
    id,
    name,
    informal: name,
    aliases: [],
    kind: 'hintuan',
    point: { type: 'Point', coordinates: at },
    area: {
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
    },
    note: 'a made-up box for loop-test',
    created_at: '2026-10-17T00:00:00+00:00',
  };
};

const LOOP_ID = 'loop-ikot-out';
const loopVariant = {
  id: LOOP_ID,
  route_id: 'loop-ikot',
  direction_name: 'UP – Ikot',
  origin_terminal: null,
  destination_terminal: null,
  reversed: false,
  confidence: 'drawn',
  overview: { type: 'LineString', coordinates: RING },
  metres: Math.round(LOOP_METRES),
  signboards: [],
  route: {
    id: 'loop-ikot',
    signboard: 'UP – Ikot',
    long_name: null,
    mode: 'jeepney',
    fare_note: null,
    head_stop_id: null,
    tail_stop_id: null,
    via: null,
    name: 'UP – Ikot',
    is_loop: true,
  },
};
const fixture = {
  ...published,
  schema: SCHEMA,
  variants: [...published.variants, loopVariant],
  stops: [...published.stops, ...PLACES.map(box)],
  links: [
    ...published.links,
    ...PLACES.map((p, i) => ({
      route_variant_id: LOOP_ID,
      stop_id: p.id,
      stop_sequence: i + 1,
    })),
  ],
};
const lineFile = { schema: 2, id: LOOP_ID, shape: { type: 'LineString', coordinates: RING } };

const serveFixture = async (context) => {
  await context.route(/\/data\/index\.v\d+\.json(\?.*)?$/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) }),
  );
  await context.route(new RegExp(`/data/lines/${LOOP_ID}\\.json`), (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(lineFile) }),
  );
};

// ---------------------------------------------------------------------- helpers
const browser = await chromium.launch();

const phone = async ({ geolocation = null, init = null } = {}) => {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    ...(geolocation ? { geolocation, permissions: ['geolocation'] } : {}),
  });
  await serveFixture(context);
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  if (process.env.LOOP_DEBUG)
    page.on('console', (m) => console.log('console:', m.type(), m.text().slice(0, 300)));
  if (NO_TILES) await bareStyle(page);
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__map?.loaded(), null, { timeout: 30000 });
  await page.waitForFunction(
    () =>
      (document.querySelector('[data-directions]')?.getAttribute('data-directions') ?? '0') !== '0',
    null,
    { timeout: 30000 },
  );
  return { context, page, errors };
};

/** Where a point is on the screen, in CSS pixels. */
const screenOf = (page, [lng, lat]) =>
  page.evaluate(
    ([x, y]) => {
      const p = window.__map.project([x, y]);
      return { x: p.x, y: p.y };
    },
    [lng, lat],
  );

/** Takes the map to the block, whole in view above the card's room. */
const showBlock = async (page) => {
  // The map's own first framing of the routes may still be settling: wait it out.
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__map.jumpTo({ center: [121.074, 14.653], zoom: 14.3 }));
  await page.waitForFunction(() => !window.__map.isMoving(), null, { timeout: 15000 });
};

/** A tap on the loop's west edge, away from its boxes: its trip opens. */
const openTrip = async (page) => {
  await showBlock(page);
  await page.waitForTimeout(400);
  const at = await screenOf(page, [121.07, 14.654]);
  if (process.env.LOOP_DEBUG)
    console.log(
      'tap',
      at,
      await page.evaluate(
        ([x, y]) => ({
          n: document.querySelector('[data-directions]')?.getAttribute('data-directions'),
          f: window.__map.queryRenderedFeatures([x, y]).map((f) => f.layer.id),
        }),
        [at.x, at.y],
      ),
    );
  await page.touchscreen.tap(at.x, at.y);
  await page.locator('[data-testid="trip"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);
};

const originLabel = (page) => page.locator('[data-testid="trip-origin"]').innerText();
const destinationLabel = (page) => page.locator('[data-testid="trip-destination"]').innerText();
const km = async (page) => parseFloat(await page.locator('[data-testid="trip-km"]').innerText());
/** The timeline's hintuan rows, by their names, folded rows included. */
const rowNames = (page) =>
  page
    .locator('[data-testid="trip-hintuan"]')
    .evaluateAll((els) => els.map((e) => e.textContent?.trim() ?? ''));
const openFold = async (page) => {
  const fold = page.locator('[data-testid="trip-fold"]');
  if ((await fold.count()) > 0) await fold.first().click();
  await page.waitForTimeout(300);
};
const pickRow = (page, name) =>
  page.locator('[data-testid="trip-hintuan-pick"]', { hasText: name }).first().tap();
/** What a ride of `metres` reads as on the tile, one decimal of a kilometre. */
const asTile = (metres) => Math.round(metres / 100) / 10;
/** What the map's end labels say, one string each: which end, and where. */
const endLabels = async (page) =>
  (
    await page
      .locator('[data-testid="end-title"] button')
      .evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') ?? '').split(':')[0]))
  ).sort();
/** The places the map circles bare, with no name over them. */
const bareCircles = (page) =>
  page
    .locator('[data-testid="end-circle"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-name')));
const near = (value, metres) => Math.abs(value - metres / 1000) <= 0.16;
/** A click on a row the sheet has scrolled out of the screen: the button's own handler, as a tap would reach it. */
const press = (locator) => locator.evaluate((el) => el.click());
const closeTrip = async (page) => {
  await page.getByRole('button', { name: 'Close' }).first().tap();
  await page.waitForTimeout(400);
};

// ---------------------------------------------------- 1. no location: the first place
{
  const { context, page, errors } = await phone();
  await openTrip(page);
  const card = page.locator('[data-testid="card"]').first();
  check(
    "a loop's trip has no SWITCH",
    (await page.locator('[data-testid="card-switch"]').count()) === 0,
  );
  const header = await page.locator('[data-testid="trip-detail-header"]').innerText();
  check(
    "  and says Ikot where Papunta stands, with the loop's name beside it",
    /Ikot/.test(header) && !/Papunta|Pabalik/.test(header) && header.includes('UP – Ikot'),
    header.replace(/\n/g, ' | '),
  );
  check(
    '  nothing in the card says Papunta or Pabalik',
    !/Papunta|Pabalik/.test(await card.innerText()),
  );
  check(
    'with no location the trip leaves from the first place the line passes, and comes back to it',
    (await originLabel(page)).includes(PALMA.name) &&
      (await destinationLabel(page)).includes(PALMA.name),
    `${await originLabel(page)} / ${await destinationLabel(page)}`,
  );
  await openFold(page);
  const rows = await rowNames(page);
  check(
    '  the rows between follow going round: Quezon Hall, Sunken Garden, Engineering, Math Building',
    JSON.stringify(rows.map((r) => PLACES.find((p) => r.includes(p.name))?.name)) ===
      JSON.stringify([QUEZON, SUNKEN, ENGINEERING, MATH].map((p) => p.name)),
    rows.join(' | '),
  );
  check(
    'the tiles show the whole loop before a pick',
    near(await km(page), LOOP_METRES),
    `${await km(page)} km, the loop ${asTile(LOOP_METRES)} km`,
  );
  check(
    'at rest the map names the tip once, as the Start',
    JSON.stringify(await endLabels(page)) === JSON.stringify([`Start, ${PALMA.name}`]),
    JSON.stringify(await endLabels(page)),
  );

  // A row tapped: the ride goes from the tip forward to it.
  await pickRow(page, ENGINEERING.name);
  await page.waitForTimeout(400);
  const toEngineering = (ENGINEERING.metres - PALMA.metres + LOOP_METRES) % LOOP_METRES;
  check(
    'a row tapped: the Distance is the ride forward from the tip to it',
    near(await km(page), toEngineering),
    `${await km(page)} km, expected ${asTile(toEngineering)} km`,
  );
  await pickRow(page, ENGINEERING.name);

  // Set as start on Math Building, then a row above it: the ride wraps.
  await pickRow(page, MATH.name);
  await press(page.getByRole('button', { name: 'Set as start' }));
  await page.waitForTimeout(300);
  await pickRow(page, QUEZON.name);
  await page.waitForTimeout(500);
  const wrapped = (QUEZON.metres - MATH.metres + LOOP_METRES) % LOOP_METRES;
  check(
    'a start, then a row above it: the ride wraps across the seam, round to that row',
    near(await km(page), wrapped),
    `${await km(page)} km, expected ${asTile(wrapped)} km`,
  );
  check(
    '  the tip is passed through: a bare circle on the map, no Start over it',
    !(await endLabels(page)).some((l) => l.includes(PALMA.name)) &&
      (await bareCircles(page)).includes(PALMA.name),
    `${JSON.stringify(await endLabels(page))} / ${JSON.stringify(await bareCircles(page))}`,
  );
  check(
    '  the rows between the end and the start fold into one fold',
    (await page.locator('[data-testid="trip-fold"]').count()) === 1 &&
      (await page.locator('[data-testid="trip-fold"]').getAttribute('data-part')) === 'after',
  );

  // An end row with the start kept: either end is the tip, the ride goes on round to it.
  await press(page.locator('[data-testid="trip-destination"] button').first());
  await page.waitForTimeout(500);
  check(
    'the ride ending at the tip: the map marks it End, not Start',
    (await endLabels(page)).some((l) => l === `End, ${PALMA.name}`) &&
      !(await endLabels(page)).some((l) => l === `Start, ${PALMA.name}`),
    JSON.stringify(await endLabels(page)),
  );
  const toTip = (PALMA.metres - MATH.metres + LOOP_METRES) % LOOP_METRES;
  check(
    'the bottom row with a start: the ride runs from the start round to the tip',
    near(await km(page), toTip),
    `${await km(page)} km, expected ${asTile(toTip)} km`,
  );
  // The two rows are the one end: the top row, tapped with the bottom's ride picked, lets it go...
  await press(page.locator('[data-testid="trip-origin"] button').first());
  await page.waitForTimeout(500);
  check(
    '  the top row is the same end: tapped after the bottom row, it lets the ride go',
    near(await km(page), LOOP_METRES),
    `${await km(page)} km`,
  );
  // ...and tapped alone, it rides on round to the tip too.
  await press(page.locator('[data-testid="trip-origin"] button').first());
  await page.waitForTimeout(500);
  check(
    '  tapped again, it rides from the start round to the tip',
    near(await km(page), toTip),
    `${await km(page)} km, expected ${asTile(toTip)} km`,
  );

  // × Remove as start: the ride lets go, the whole loop's again.
  await press(page.getByRole('button', { name: 'Remove as start' }));
  await page.waitForTimeout(500);
  check(
    '× Remove as start: the tiles are the whole loop again',
    near(await km(page), LOOP_METRES),
    `${await km(page)} km`,
  );
  check('no page errors', errors.length === 0, errors.join('; '));
  await context.close();
}

// ------------------------------------------------------ 2. the commuter's place
{
  // Beside Sunken Garden, sharp.
  const here = { longitude: SUNKEN.at[0] + 0.0001, latitude: SUNKEN.at[1] - 0.0001, accuracy: 15 };
  const { context, page, errors } = await phone({ geolocation: here });
  await openTrip(page);
  check(
    'before there is a fix, the tip is the first place',
    (await originLabel(page)).includes(PALMA.name),
    await originLabel(page),
  );
  await closeTrip(page);
  await page.locator('[data-testid="where"]').tap();
  await page.locator('[data-testid="where"][data-state="on"]').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  await openTrip(page);
  check(
    'with a fix beside box 3, reopening starts at 3',
    (await originLabel(page)).includes(SUNKEN.name),
    await originLabel(page),
  );
  await openFold(page);
  const rows = await rowNames(page);
  check(
    '  and the rows wrap: Engineering, Math Building, Palma Hall, Quezon Hall',
    JSON.stringify(rows.map((r) => PLACES.find((p) => r.includes(p.name))?.name)) ===
      JSON.stringify([ENGINEERING, MATH, PALMA, QUEZON].map((p) => p.name)),
    rows.join(' | '),
  );
  check('  the tip is the bottom row too', (await destinationLabel(page)).includes(SUNKEN.name));

  // The commuter walks on across the block while the trip is open: the rows stay.
  await context.setGeolocation({
    longitude: MATH.at[0],
    latitude: MATH.at[1] + 0.0001,
    accuracy: 15,
  });
  await page.waitForTimeout(2500);
  check(
    'a fix 700 m away after the trip opened moves nothing under the rider',
    (await originLabel(page)).includes(SUNKEN.name),
    await originLabel(page),
  );
  await closeTrip(page);
  await openTrip(page);
  check(
    '  closed and opened again, the tip is chosen afresh: now Math Building',
    (await originLabel(page)).includes(MATH.name),
    await originLabel(page),
  );
  await closeTrip(page);

  // A vague fix chooses nothing.
  await context.setGeolocation({
    longitude: SUNKEN.at[0],
    latitude: SUNKEN.at[1],
    accuracy: 800,
  });
  await page.waitForTimeout(2500);
  await openTrip(page);
  check(
    'a fix vaguer than 200 m chooses nothing: the first place again',
    (await originLabel(page)).includes(PALMA.name),
    await originLabel(page),
  );
  await closeTrip(page);

  // A coarse fix sharpening on the spot, as a phone's does before its GPS has found itself.
  await context.setGeolocation({ longitude: SUNKEN.at[0], latitude: SUNKEN.at[1], accuracy: 10 });
  await page.waitForTimeout(2500);
  await openTrip(page);
  check(
    'the same point, vague and then sharp: the sharp one is heard, the tip is Sunken Garden',
    (await originLabel(page)).includes(SUNKEN.name),
    await originLabel(page),
  );
  await closeTrip(page);

  // Far away: nothing near the loop.
  await context.setGeolocation({ longitude: 121.01, latitude: 14.5, accuracy: 15 });
  await page.waitForTimeout(2500);
  await openTrip(page);
  check(
    'a commuter more than 1 km from every box chooses nothing either',
    (await originLabel(page)).includes(PALMA.name),
    await originLabel(page),
  );
  check('no page errors', errors.length === 0, errors.join('; '));
  await context.close();
}

// ------------------------------------------ 2b. the location taken back while a trip is open
{
  // A stand-in navigator.geolocation the test drives: a fix on demand, and the error a browser
  // gives when the permission is taken back (code 1).
  const stub = () => {
    const watchers = new Map();
    let nextId = 0;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: (ok, err) => {
          watchers.set(++nextId, { ok, err });
          return nextId;
        },
        clearWatch: (id) => watchers.delete(id),
        getCurrentPosition: () => {},
      },
    });
    window.__fix = (lng, lat, accuracy) =>
      watchers.forEach(({ ok }) =>
        ok({
          timestamp: Date.now(),
          coords: { longitude: lng, latitude: lat, accuracy, heading: null, speed: null },
        }),
      );
    window.__deny = () =>
      watchers.forEach(({ err }) =>
        err({
          code: 1,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: 'denied',
        }),
      );
  };
  const { context, page, errors } = await phone({ init: stub });
  await page.locator('[data-testid="where"]').tap();
  await page.evaluate(([x, y]) => window.__fix(x, y, 15), [SUNKEN.at[0] + 0.0001, SUNKEN.at[1]]);
  await page.waitForTimeout(1500);
  await openTrip(page);
  check(
    'with a fix, the trip leaves from the nearest place',
    (await originLabel(page)).includes(SUNKEN.name),
    await originLabel(page),
  );
  await page.evaluate(() => window.__deny());
  await page.waitForTimeout(1500);
  check(
    'the location taken back while the trip is open: the tip stays put',
    (await originLabel(page)).includes(SUNKEN.name),
    await originLabel(page),
  );
  await closeTrip(page);
  await openTrip(page);
  check(
    '  and reopened it starts at the first place: the old position is not kept',
    (await originLabel(page)).includes(PALMA.name),
    await originLabel(page),
  );
  check('no page errors', errors.length === 0, errors.join('; '));
  await context.close();
}

// ---------------------------------------------- 3. opened from a hintuan's card
{
  const { context, page, errors } = await phone();
  await showBlock(page);
  await page.waitForTimeout(400);
  // A tap inside Engineering's box opens its card.
  const at = await screenOf(page, ENGINEERING.at);
  await page.touchscreen.tap(at.x, at.y);
  await page.locator('[data-testid="card"]').first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  const row = (await page.locator('[data-testid="card-item"]').first().innerText()).trim();
  check("the place's card lists the loop with Ikot where its way goes", row === 'Ikot', row);
  check(
    '  and has no SWITCH over loops alone',
    (await page.locator('[data-testid="card-flip"]').count()) === 0,
  );
  await page.locator('[data-testid="card-item"]').first().tap();
  await page.locator('[data-testid="trip"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  check(
    "a trip opened from box 4's card starts at 4",
    (await originLabel(page)).includes(ENGINEERING.name),
    await originLabel(page),
  );
  check('no page errors', errors.length === 0, errors.join('; '));
  await context.close();
}

await browser.close();
tally();
