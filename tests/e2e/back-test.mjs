// The browser's Back, and Android's, on the public map: it takes the card on
// show away, one card at a time, and only with no card open does it leave the
// page. The map file is a made-up one, served in place of the real index, so
// no database is read: a loop round a block near UP Diliman with two hintuan
// boxes on it, and for the route list a second loop on the same streets.
//
//   npm run dev                          (in another terminal)
//   node tests/e2e/back-test.mjs
//   PARA_NO_TILES=1 node tests/e2e/back-test.mjs   no basemap tiles (a sandbox)
//
// What it proves, on a phone, each time from a page opened after a blank one,
// so that Back with no card open has somewhere to leave to: a trip opened on
// its own closes on Back and the page stays; Back again leaves. A trip opened
// from a place's card steps back to the card, the card closes on the next
// Back, and the one after leaves. The same from the route list. A card closed
// by its own ✕ leaves no Back behind it. The address never changes.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { BASE, bareStyle, harness } from './lib/harness.mjs';

const NO_TILES = !!process.env.PARA_NO_TILES;
const { check, tally } = harness();

// ------------------------------------------------------------------ the fixture
const published = JSON.parse(readFileSync('public/data/index.v5.json', 'utf8'));
const SCHEMA = Number(
  /MAP_FILE_SCHEMA = (\d+);/.exec(
    readFileSync('src/features/routes/published/map-file.ts', 'utf8'),
  )?.[1],
);

// The block, going round clockwise from its south-west corner.
const RING = [
  [121.07, 14.65],
  [121.07, 14.656],
  [121.078, 14.656],
  [121.078, 14.65],
  [121.07, 14.65],
];
const M_LAT = 111_000;
const M_LNG = 111_000 * Math.cos((14.654 * Math.PI) / 180);
const metresOf = (line) =>
  line
    .slice(1)
    .reduce(
      (sum, p, i) => sum + Math.hypot((p[0] - line[i][0]) * M_LNG, (p[1] - line[i][1]) * M_LAT),
      0,
    );

const PLACES = [
  { id: 'back-stop-1', name: 'Palma Hall', at: [121.07, 14.652] },
  { id: 'back-stop-2', name: 'Sunken Garden', at: [121.0765, 14.656] },
];
const [PALMA] = PLACES;

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
    note: 'a made-up box for back-test',
    created_at: '2026-11-11T00:00:00+00:00',
  };
};

const loop = (id, signboard, line) => ({
  variant: {
    id,
    route_id: `${id}-route`,
    direction_name: signboard,
    origin_terminal: null,
    destination_terminal: null,
    reversed: false,
    confidence: 'drawn',
    overview: { type: 'LineString', coordinates: line },
    metres: Math.round(metresOf(line)),
    signboards: [],
    route: {
      id: `${id}-route`,
      signboard,
      long_name: null,
      mode: 'jeepney',
      fare_note: null,
      head_stop_id: null,
      tail_stop_id: null,
      via: null,
      name: signboard,
      is_loop: true,
    },
  },
  lineFile: { schema: 2, id, shape: { type: 'LineString', coordinates: line } },
});
const IKOT = loop('back-ikot', 'UP – Ikot', RING);
const TOKI = loop('back-toki', 'UP – Toki', [...RING].reverse());

/** The made-up map: these loops and the two boxes, each loop linked to both. */
const fixtureOf = (loops) => ({
  ...published,
  schema: SCHEMA,
  variants: loops.map((l) => l.variant),
  stops: PLACES.map(box),
  links: loops.flatMap((l) =>
    PLACES.map((p, i) => ({ route_variant_id: l.variant.id, stop_id: p.id, stop_sequence: i + 1 })),
  ),
});

// ---------------------------------------------------------------------- helpers
const browser = await chromium.launch();
const json = (body) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

/** A phone on the made-up map, reached from a blank page: where Back leaves to. */
const phone = async (loops) => {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await context.route(/\/data\/index\.v\d+\.json(\?.*)?$/, (route) =>
    route.fulfill(json(fixtureOf(loops))),
  );
  for (const l of loops)
    await context.route(new RegExp(`/data/lines/${l.variant.id}\\.json`), (route) =>
      route.fulfill(json(l.lineFile)),
    );
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  if (NO_TILES) await bareStyle(page);
  await page.goto('about:blank');
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__map?.loaded(), null, { timeout: 30000 });
  await page.waitForFunction(
    () =>
      (document.querySelector('[data-directions]')?.getAttribute('data-directions') ?? '0') !== '0',
    null,
    { timeout: 30000 },
  );
  // The map's own first framing of the routes may still be settling: wait it out.
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__map.jumpTo({ center: [121.074, 14.653], zoom: 14.3 }));
  await page.waitForFunction(() => !window.__map.isMoving(), null, { timeout: 15000 });
  await page.waitForTimeout(400);
  return { context, page, errors };
};

const screenOf = (page, [lng, lat]) =>
  page.evaluate(
    ([x, y]) => {
      const p = window.__map.project([x, y]);
      return { x: p.x, y: p.y };
    },
    [lng, lat],
  );
/** A tap on the block's west edge, away from its boxes. */
const tapLine = async (page) => {
  const at = await screenOf(page, [121.07, 14.654]);
  await page.touchscreen.tap(at.x, at.y);
};
/** A tap inside a box, once it is drawn: the boxes reach the map after the routes. */
const tapBox = async (page, place) => {
  const at = await screenOf(page, place.at);
  await page.waitForFunction(
    ([x, y]) =>
      window.__map.queryRenderedFeatures([x, y], { layers: ['saved-stops-fill'] }).length > 0,
    [at.x, at.y],
    { timeout: 15000 },
  );
  await page.touchscreen.tap(at.x, at.y);
};

const TRIP = '[data-testid="trip"]';
const PLACE = '[data-testid="card"]:not([hidden]) [data-testid="card-place"]';
const LIST = '[data-testid="chooser"]:not([hidden])';
const shown = (page, selector) => page.locator(selector).count();
const gone = (page, selector) =>
  page.waitForFunction((s) => !document.querySelector(s), selector, { timeout: 15000 });
/**
 * The card on show raised off Low, where a tap on a row only raises it. The handle's own handler,
 * as a tap would reach it: the route list draws no handle, and keeps the button for a keyboard.
 */
const raise = async (page, card) => {
  await page
    .locator(card)
    .first()
    .getByTestId('dock-handle')
    .evaluate((el) => el.click());
  await page.waitForTimeout(400);
};
/** Still Para's map, at the address it opened on. */
const onPara = async (page) =>
  page.url() === `${BASE}/` && (await page.locator('[data-directions]').count()) === 1;
/** Back, as the browser's button and Android's do it. */
const back = async (page) => {
  await page.goBack();
  await page.waitForTimeout(400);
};

// ------------------------------------------------------- 1. a trip opened on its own
{
  const { context, page, errors } = await phone([IKOT]);
  await tapLine(page);
  await page.locator(TRIP).waitFor({ timeout: 15000 });
  check('a trip opens with the address as it was', page.url() === `${BASE}/`, page.url());

  await back(page);
  await gone(page, TRIP);
  check('Back closes the trip', (await shown(page, TRIP)) === 0);
  check('  and the page is still the map, at the same address', await onPara(page), page.url());

  await back(page);
  check('with no card open, Back leaves the page', page.url() === 'about:blank', page.url());
  check('no page errors', errors.length === 0, errors.join('; '));
  await context.close();
}

// ----------------------------------------------- 2. a trip opened from a place's card
{
  const { context, page, errors } = await phone([IKOT]);
  await tapBox(page, PALMA);
  await page.locator(PLACE).waitFor({ timeout: 15000 });
  await raise(page, '[data-testid="card"]');
  await page.locator('[data-testid="card-item"]').first().tap();
  await page.locator(TRIP).waitFor({ timeout: 15000 });

  await back(page);
  await gone(page, TRIP);
  check(
    "Back on a trip opened from a place's card closes the trip",
    (await shown(page, TRIP)) === 0,
  );
  check("  and the place's card is back", (await shown(page, PLACE)) === 1);
  check('  on the map still', await onPara(page), page.url());

  await back(page);
  await gone(page, PLACE);
  check("Back again closes the place's card", (await shown(page, PLACE)) === 0);
  check('  on the map still', await onPara(page), page.url());

  await back(page);
  check('and the next Back leaves the page', page.url() === 'about:blank', page.url());
  check('no page errors', errors.length === 0, errors.join('; '));
  await context.close();
}

// ------------------------------------------------- 3. a trip opened from the route list
{
  const { context, page, errors } = await phone([IKOT, TOKI]);
  await tapLine(page);
  await page.locator(LIST).waitFor({ timeout: 15000 });
  await raise(page, LIST);
  await page.locator('button[data-testid="chooser-item"]').first().tap();
  await page.locator(TRIP).waitFor({ timeout: 15000 });

  await back(page);
  await gone(page, TRIP);
  check(
    'Back on a trip opened from the route list closes the trip',
    (await shown(page, TRIP)) === 0,
  );
  check('  and the list is back', (await shown(page, LIST)) === 1);

  await back(page);
  await gone(page, LIST);
  check('Back again closes the list', (await shown(page, LIST)) === 0);
  check('  on the map still', await onPara(page), page.url());

  await back(page);
  check('and the next Back leaves the page', page.url() === 'about:blank', page.url());
  check('no page errors', errors.length === 0, errors.join('; '));
  await context.close();
}

// --------------------------------------------------- 4. a card closed by its own ✕
{
  const { context, page, errors } = await phone([IKOT]);
  await tapLine(page);
  await page.locator(TRIP).waitFor({ timeout: 15000 });
  // The trip card's own ✕: a toast on the page has a Close of its own.
  await page
    .locator('[data-testid="card"]', { has: page.locator(TRIP) })
    .getByRole('button', { name: 'Close' })
    .first()
    .tap();
  await gone(page, TRIP);
  await page.waitForTimeout(400);
  check('✕ closes the trip, on the map still', await onPara(page), page.url());

  await back(page);
  check(
    'and leaves no Back behind it: the first Back leaves the page',
    page.url() === 'about:blank',
    page.url(),
  );
  check('no page errors', errors.length === 0, errors.join('; '));
  await context.close();
}

await browser.close();
tally();
