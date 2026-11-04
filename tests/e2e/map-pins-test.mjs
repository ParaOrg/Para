// The hotspots' pins (src/features/routes/map/hotspot-pins.ts) on all three pages, from the
// committed map file (the public map and the contributor page) and the same hotspots in the
// studio's stand-in database: a pin at each box's middle from the zoom where the scale bar first
// reads 500 m, a dot below it, 6 px across at the public map's opening view, and the names from
// where the bar first reads 300 m.
//
//   npm run dev                          (in another terminal)
//   node tests/e2e/map-pins-test.mjs
//   PARA_SHOTS=dir node tests/e2e/map-pins-test.mjs   keeps each page at both zooms
//
// What it proves: on the public map and in the studio, the pins and dots stand over the boxes
// and the route lines and under the hotspots' names, and tapping a pin's head (off its box) or a
// dot opens that box's card, as tapping the box does; on the contributor page the hotspots come
// in after the map settles, in a chunk of their own, and a pin there is display-only: a tap on it
// reaches the map and marks nothing.
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { fakeContributions } from './lib/fake-contributions.mjs';
import { fakeStudioDb } from './lib/fake-studio-db.mjs';
import { BASE, bareStyle, harness, mapIdle, until, waitForSource } from './lib/harness.mjs';
import { signInAsEditor } from './lib/studio-session.mjs';

const { check, tally } = harness();
const SHOTS = process.env.PARA_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

/** Zoomed in, well past the pins' zoom (12.89, the scale bar at 500 m), and zoomed out (dots). */
const ZOOMED_IN = 17.5;
const ZOOMED_OUT = 12.5;
/** Just past the pins' zoom; either side of the names' (13.89, the scale bar at 300 m). */
const PINS_IN = 13;
const NAMES_OUT = 13.5;
const NAMES_IN = 14.2;
/** The middle of a pin's head from its point, in CSS px: 28 across, 48 tall, the stem at 2. */
const HEAD = { dx: -2 + 14, dy: -48 + 14 };
const LAYER = {
  fill: 'saved-stops-fill',
  dot: 'saved-stops-dot',
  pin: 'saved-stops-pin',
  hintuanLabel: 'saved-stops-label-hintuan',
  terminalLabel: 'saved-stops-label',
  routesHit: 'saved-routes-hit',
};

const index = JSON.parse(readFileSync('public/data/index.v5.json', 'utf8'));

const browser = await chromium.launch();

async function open(page, url) {
  await bareStyle(page);
  await page.addInitScript(() => {
    window.__src = async (id) => {
      const s = window.__map?.getSource(id);
      return s ? await s.getData() : null;
    };
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
      errors.push(m.text().slice(0, 160));
    if (m.type() === 'warning' && /hotspot-pin|could not be loaded/.test(m.text()))
      errors.push(m.text().slice(0, 160));
  });
  await page.goto(`${BASE}${url}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__map && window.__map.loaded(), null, { timeout: 30000 });
  return errors;
}

/**
 * The pins' points, and one standing alone (no other box's middle within 250 m), so a dot
 * zoomed out is its own box's and nothing else's.
 */
async function lonePin(page) {
  const pins = await waitForSource(page, 'saved-stops-pins', 30000);
  const m = (a, b) => Math.hypot((a[0] - b[0]) * 107_600, (a[1] - b[1]) * 111_000);
  const alone = pins.filter((p) =>
    pins.every((q) => q === p || m(p.geometry.coordinates, q.geometry.coordinates) > 250),
  );
  return { count: pins.length, alone };
}

/** The camera on `at`, at `zoom`, and the map at rest. */
async function settle(page, at, zoom) {
  await page.evaluate(([c, z]) => window.__map.jumpTo({ center: c, zoom: z }), [at, zoom]);
  await mapIdle(page);
}

/** Whether `id`'s feature is drawn in `layer` now. */
const drawn = (page, layer, id) =>
  page.evaluate(
    ([layer, id]) =>
      !!window.__map.getLayer(layer) &&
      !window.__map.getLayer(layer).isHidden(window.__map.getZoom()) &&
      window.__map.queryRenderedFeatures({ layers: [layer] }).some((f) => f.properties.id === id),
    [layer, id],
  );

/** Whether `id`'s feature comes to be drawn in `layer` within 3 s: a pin fades in once placed. */
const comesIn = (page, layer, id) =>
  until(
    () => drawn(page, layer, id),
    (v) => v,
    3000,
  );

/** A point on the screen, from a [lng, lat] and an offset in px, and what is under it. */
const screenPoint = (page, at, [dx, dy] = [0, 0]) =>
  page.evaluate(
    ([at, dx, dy, fill]) => {
      const m = window.__map;
      const p = m.project(at);
      const [x, y] = [p.x + dx, p.y + dy];
      const r = m.getCanvas().getBoundingClientRect();
      return {
        x: r.left + x,
        y: r.top + y,
        onBox: m.queryRenderedFeatures([x, y], { layers: [fill] }).length > 0,
        reachesMap: document.elementFromPoint(r.left + x, r.top + y) === m.getCanvas(),
      };
    },
    [at, dx, dy, LAYER.fill],
  );

/** The box's feature state: `chosen` once a tap opened its card (hotspots-shown.ts). */
const isChosen = (page, id) =>
  page.evaluate((id) => !!window.__map.getFeatureState({ source: 'saved-stops', id }).chosen, id);

/** The layers' order: the pins and dots over the boxes and route lines, under the names. */
async function checkOrder(page, where) {
  // The pins' layer comes with its chunk, just after the boxes.
  await page
    .waitForFunction((pin) => !!window.__map.getLayer(pin), LAYER.pin, { timeout: 10000 })
    .catch(() => undefined);
  const order = await page.evaluate(() => window.__map.getLayersOrder());
  const at = (id) => order.indexOf(id);
  const above = [LAYER.fill, ...(at(LAYER.routesHit) >= 0 ? [LAYER.routesHit] : [])];
  check(
    `${where}: the dots and pins over the boxes${at(LAYER.routesHit) >= 0 ? ' and the route lines' : ''}, under the names`,
    [LAYER.dot, LAYER.pin].every(
      (id) => at(id) >= 0 && above.every((b) => at(id) > at(b)) && at(id) < at(LAYER.hintuanLabel),
    ),
    [LAYER.fill, LAYER.routesHit, LAYER.dot, LAYER.pin, LAYER.hintuanLabel]
      .map((id) => `${id} ${at(id)}`)
      .join(', '),
  );
}

/**
 * Taps a pin's head, then (afresh) its dot, on a page whose tap opens a card, and checks each
 * opened that box. `fresh` opens the page again with nothing chosen.
 */
async function checkTaps(page, where, pin, fresh) {
  const { id } = pin.properties;
  const at = pin.geometry.coordinates;
  await settle(page, at, ZOOMED_IN);
  check(
    `${where}: zoomed in (${ZOOMED_IN}), the box's pin, and no dot`,
    (await comesIn(page, LAYER.pin, id)) && !(await drawn(page, LAYER.dot, id)),
  );
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${where}-zoomed-in.png` });
  const head = await screenPoint(page, at, [HEAD.dx, HEAD.dy]);
  await page.mouse.click(head.x, head.y);
  check(
    `${where}: a tap on the pin's head${head.onBox ? '' : ', off its box,'} opens the box's card`,
    await until(
      () => isChosen(page, id),
      (v) => v,
      3000,
    ),
    `head at ${Math.round(head.x)},${Math.round(head.y)}${head.onBox ? ' (over the box)' : ''}`,
  );

  await fresh();
  await settle(page, at, ZOOMED_OUT);
  check(
    `${where}: zoomed out (${ZOOMED_OUT}), the box's dot, and no pin`,
    (await comesIn(page, LAYER.dot, id)) && !(await drawn(page, LAYER.pin, id)),
  );
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${where}-zoomed-out.png` });
  const dot = await screenPoint(page, at);
  await page.mouse.click(dot.x, dot.y);
  check(
    `${where}: a tap on the dot opens the box's card`,
    await until(
      () => isChosen(page, id),
      (v) => v,
      3000,
    ),
  );
}

/**
 * At the public map's opening zoom, `pin`'s dot is drawn with a radius of 3 px: a query 2 px off
 * its point finds it, one 4.5 px off does not (MapLibre's own hit test, by the circle's radius).
 */
async function checkOpeningDot(page, pin) {
  const { id } = pin.properties;
  const at = pin.geometry.coordinates;
  const opening = await page.evaluate(() => window.__map.getZoom());
  await settle(page, at, opening);
  const found = ([dx, dy]) =>
    page.evaluate(
      ([at, dx, dy, dot, id]) => {
        const p = window.__map.project(at);
        return window.__map
          .queryRenderedFeatures([p.x + dx, p.y + dy], { layers: [dot] })
          .some((f) => f.properties.id === id);
      },
      [at, dx, dy, LAYER.dot, id],
    );
  const around = (r) => [
    [r, 0],
    [-r, 0],
    [0, r],
    [0, -r],
  ];
  const onPoint = await until(
    () => found([0, 0]),
    (v) => v,
    3000,
  );
  const inside = [];
  for (const off of around(2)) inside.push(await found(off));
  const outside = [];
  for (const off of around(4.5)) outside.push(await found(off));
  check(
    `public map: at the opening zoom (${opening.toFixed(2)}), the dot's radius is 3 px`,
    opening <= 11 && onPoint && inside.every(Boolean) && outside.every((v) => !v),
    `on its point: ${onPoint}; 2 px off: ${inside.join(', ')}; 4.5 px off: ${outside.join(', ')}`,
  );
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/public-opening.png` });
}

/** How many hotspot names are drawn on the screen now. */
const namesShown = (page) =>
  page.evaluate(
    (layers) =>
      new Set(window.__map.queryRenderedFeatures({ layers }).map((f) => f.properties.name)).size,
    [LAYER.terminalLabel, LAYER.hintuanLabel],
  );

/**
 * The scale bar's two thresholds on the public map, around `pin`: its pin and no dot just past
 * the pins' zoom, with no name yet; then names a little past the names' zoom.
 */
async function checkThresholds(page, pin) {
  const { id } = pin.properties;
  const at = pin.geometry.coordinates;
  await settle(page, at, PINS_IN);
  check(
    `public map: at ${PINS_IN}, just past the pins' zoom, the box's pin, and no dot`,
    (await comesIn(page, LAYER.pin, id)) && !(await drawn(page, LAYER.dot, id)),
  );
  await settle(page, at, NAMES_OUT);
  const namesOut = await namesShown(page);
  await settle(page, at, NAMES_IN);
  const namesIn = await until(
    () => namesShown(page),
    (n) => n > 0,
    3000,
  );
  check(
    `public map: no hotspot names at ${NAMES_OUT}, some at ${NAMES_IN}`,
    namesOut === 0 && namesIn > 0,
    `${namesOut} at ${NAMES_OUT}, ${namesIn} at ${NAMES_IN}`,
  );
}

/** A lone pin whose head stands off its box, to prove the pin itself takes the tap; else any lone one. */
async function pinToTap(page, alone) {
  for (const pin of alone.slice(0, 12)) {
    await settle(page, pin.geometry.coordinates, ZOOMED_IN);
    const head = await screenPoint(page, pin.geometry.coordinates, [HEAD.dx, HEAD.dy]);
    if (!head.onBox) return pin;
  }
  return alone[0];
}

// ------------------------------------------------------------ the public map
let chosenPin;
{
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
  const errors = await open(page, '/');
  const { count, alone } = await lonePin(page);
  const boxes = index.stops.filter((s) => s.area).length;
  check(
    'public map: a pin point for every box in the map file',
    count === boxes,
    `${count} of ${boxes}`,
  );
  await checkOrder(page, 'public map');
  await checkOpeningDot(page, alone[0]);
  chosenPin = await pinToTap(page, alone);
  console.log(`      (the pin: ${chosenPin.properties.kind} ${chosenPin.properties.id})`);
  await checkThresholds(page, chosenPin);
  await checkTaps(page, 'public', chosenPin, async () => {
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__map && window.__map.loaded(), null, {
      timeout: 30000,
    });
    await waitForSource(page, 'saved-stops-pins', 30000);
  });
  check('public map: no page errors, no missing pin image', errors.length === 0, errors.join('; '));
  await page.close();
}

// ------------------------------------------------------------ the studio
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await signInAsEditor(page);
  const stop = index.stops.map((s) => ({
    ...s,
    owner_id: 'owner',
    status: 'approved',
    revision: 1,
    line: s.line ?? null,
  }));
  await fakeStudioDb(page, { stop });
  const errors = await open(page, '/studio/?e2e=1');
  const pin = chosenPin;
  const { count } = await lonePin(page);
  check(
    'studio: a pin point for every box',
    count === stop.filter((s) => s.area).length,
    `${count}`,
  );
  await checkOrder(page, 'studio');
  await checkTaps(page, 'studio', pin, async () => {
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__map && window.__map.loaded(), null, {
      timeout: 30000,
    });
    await waitForSource(page, 'saved-stops-pins', 30000);
  });
  check('studio: no page errors, no missing pin image', errors.length === 0, errors.join('; '));
  await page.close();
}

// ------------------------------------------------------------ the contributor page
{
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await fakeContributions(page);
  await page.addInitScript(() => localStorage.setItem('para.contribute.consent', 'yes'));
  // When the map loaded, by the page's own clock: the moment MapView hands the suites the map,
  // in its 'load' handler. The hotspots' chunk is asked for on the first 'idle' after that.
  await page.addInitScript(() => {
    let map;
    Object.defineProperty(window, '__map', {
      configurable: true,
      get: () => map,
      set: (value) => {
        window.__mapLoadedAt ??= Date.now();
        map = value;
      },
    });
  });
  const scripts = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(r);
  });
  const errors = await open(page, '/contribute/');
  const { count } = await lonePin(page);
  check(
    'contributor page: the hotspots come in after the map, a pin point for every box',
    count === index.stops.filter((s) => s.area).length,
    `${count}`,
  );
  // Timed by the browser's own clocks rather than by where the suite happens to look: whether
  // the chunk was asked for before open() saw the map loaded is a race the page may win, and
  // proves nothing about the page.
  const mapLoadedAt = await page.evaluate(() => window.__mapLoadedAt);
  // The chunk's own file, not use-published-hotspots.ts, which the page imports at its opening.
  const chunks = scripts.filter((r) => /\/published-hotspots[.-]/.test(new URL(r.url()).pathname));
  for (const r of chunks) await r.response();
  const askedAt = chunks.map((r) => r.timing().startTime);
  check(
    "  in a chunk of their own, fetched after the page's opening",
    chunks.length > 0 && askedAt.every((t) => t >= mapLoadedAt),
    `the map loaded at ${mapLoadedAt}; the chunk asked for at ${askedAt.join(', ') || 'never'}`,
  );
  await checkOrder(page, 'contributor page');
  const { id } = chosenPin.properties;
  const at = chosenPin.geometry.coordinates;
  await settle(page, at, ZOOMED_IN);
  check(
    `contributor page: zoomed in (${ZOOMED_IN}), the box's pin, and no dot`,
    (await comesIn(page, LAYER.pin, id)) && !(await drawn(page, LAYER.dot, id)),
  );
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/contribute-zoomed-in.png` });
  const head = await screenPoint(page, at, [HEAD.dx, HEAD.dy]);
  const cursorOver = async () => {
    await page.mouse.move(head.x, head.y);
    return page.evaluate(() => window.__map.getCanvas().style.cursor);
  };
  await page.touchscreen.tap(head.x, head.y);
  await page.waitForTimeout(500);
  check(
    '  a tap on the pin reaches the map and marks nothing: display-only',
    head.reachesMap &&
      !(await isChosen(page, id)) &&
      (await page.locator('[data-testid="card"], [data-testid="chooser"]').count()) === 0 &&
      (await cursorOver()) === '',
    `reaches the map: ${head.reachesMap}`,
  );
  await settle(page, at, ZOOMED_OUT);
  check(
    `contributor page: zoomed out (${ZOOMED_OUT}), the box's dot, and no pin`,
    (await comesIn(page, LAYER.dot, id)) && !(await drawn(page, LAYER.pin, id)),
  );
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/contribute-zoomed-out.png` });
  check(
    'contributor page: no page errors, no missing pin image',
    errors.length === 0,
    errors.join('; '),
  );
  await context.close();
}

await browser.close();
tally();
