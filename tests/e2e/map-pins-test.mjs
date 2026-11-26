// The hotspots' pins and dots (src/features/routes/map/hotspot-pins.ts), off for now on every
// page (the owner's call): the public map's HOTSPOT_MARKS in public-map-app.tsx, the studio's in
// workshop.tsx and the contributor page's in published-hotspots.ts. The boxes and their names
// stay, from the studio's stand-in database and the committed map file.
//
//   npm run dev                          (in another terminal)
//   node tests/e2e/map-pins-test.mjs
//   PARA_SHOTS=dir node tests/e2e/map-pins-test.mjs   keeps each page at each zoom
//
// What it proves: on the public map, unchanged, no pin is drawn and its chunk is not fetched, no
// dot shows at any zoom, a terminal's or a hintuan's, and the boxes, their names and their taps
// (or, with taps off, none) work without either. In the studio, the same: no pin, its chunk never
// fetched, no dot, the boxes and names drawn, and a tap on a box opens its card; and no zoom or
// compass buttons, the map zooming by the keys, Ctrl and the wheel and a double click. On the
// contributor page the hotspots come in after the map settles, in a chunk of their own, with no
// pin or dot, and a box there is display-only: a tap on it reaches the map and marks nothing.
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { fakeContributions } from './lib/fake-contributions.mjs';
import { fakeStudioDb } from './lib/fake-studio-db.mjs';
import {
  BASE,
  bareStyle,
  emptyMapPoint,
  harness,
  mapIdle,
  until,
  waitForSource,
} from './lib/harness.mjs';
import { signInAsEditor } from './lib/studio-session.mjs';

const { check, tally } = harness();
const SHOTS = process.env.PARA_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

/** Zoomed in, well past where a pin would start (12.89, the scale bar at 500 m), and zoomed out. */
const ZOOMED_IN = 17.5;
const ZOOMED_OUT = 12.5;
/** Either side of the names' zoom (13.89, the scale bar at 300 m). */
const NAMES_OUT = 13.5;
const NAMES_IN = 14.2;
const LAYER = {
  fill: 'saved-stops-fill',
  dot: 'saved-stops-dot',
  pin: 'saved-stops-pin',
  hintuanLabel: 'saved-stops-label-hintuan',
  terminalLabel: 'saved-stops-label',
  routesHit: 'saved-routes-hit',
};

const index = JSON.parse(readFileSync('public/data/index.v6.json', 'utf8'));

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
  await page.evaluate(
    ([c, z]) => {
      window.__map.jumpTo({ center: c, zoom: z });
    },
    [at, zoom],
  );
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

/** A lone terminal and a lone hintuan among `alone`, the pins' points standing alone. */
const lonesOf = (alone) => ({
  terminal: alone.find((p) => p.properties.kind === 'terminal'),
  hintuan: alone.find((p) => p.properties.kind === 'hintuan'),
});

/** How many features of `layer` are drawn on the screen now; none for a layer the map lacks. */
const drawnIn = (page, layer) =>
  page.evaluate(
    (layer) =>
      window.__map.getLayer(layer)
        ? window.__map.queryRenderedFeatures({ layers: [layer] }).length
        : 0,
    layer,
  );

/**
 * No pin and no dot round a lone terminal and a lone hintuan, zoomed in and out, with each box
 * still drawn: the marks are off on this page (HOTSPOT_MARKS), the boxes stay.
 */
async function checkNoMarks(page, where, { terminal, hintuan }) {
  check(
    `${where}: no pins' layer`,
    !(await page.evaluate((pin) => !!window.__map.getLayer(pin), LAYER.pin)),
  );
  for (const [kind, hotspot] of [
    ['terminal', terminal],
    ['hintuan', hintuan],
  ]) {
    const { id } = hotspot.properties;
    for (const zoom of [9, 11, ZOOMED_OUT, ZOOMED_IN]) {
      await settle(page, hotspot.geometry.coordinates, zoom);
      const dots = await drawnIn(page, LAYER.dot);
      const isBoxDrawn =
        zoom < ZOOMED_OUT ||
        (await until(
          () => drawn(page, LAYER.fill, id),
          (v) => v,
          3000,
        ));
      check(
        `${where}: round a ${kind}, at zoom ${zoom}, no pin or dot${zoom < ZOOMED_OUT ? '' : '; its box drawn'}`,
        dots === 0 && isBoxDrawn,
        `${dots} dots`,
      );
      if (SHOTS && zoom >= ZOOMED_OUT)
        await page.screenshot({ path: `${SHOTS}/${where}-${kind}-${zoom}.png` });
    }
  }
}

/** How many hotspot names are drawn on the screen now. */
const namesShown = (page) =>
  page.evaluate(
    (layers) =>
      new Set(window.__map.queryRenderedFeatures({ layers }).map((f) => f.properties.name)).size,
    [LAYER.terminalLabel, LAYER.hintuanLabel],
  );

/** The names round `hotspot`: none a little before the scale bar reads 300 m, some a little past. */
async function checkNames(page, where, hotspot) {
  const at = hotspot.geometry.coordinates;
  await settle(page, at, NAMES_OUT);
  const namesOut = await namesShown(page);
  await settle(page, at, NAMES_IN);
  const namesIn = await until(
    () => namesShown(page),
    (n) => n > 0,
    3000,
  );
  check(
    `${where}: the hotspots' names still drawn: none at ${NAMES_OUT}, some at ${NAMES_IN}`,
    namesOut === 0 && namesIn > 0,
    `${namesOut} at ${NAMES_OUT}, ${namesIn} at ${NAMES_IN}`,
  );
}

// ------------------------------------------------------------ the public map
{
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
  const pinChunks = [];
  page.on('request', (r) => {
    if (/hotspot-pin-images/.test(r.url())) pinChunks.push(r.url());
  });
  const errors = await open(page, '/');
  const { alone } = await lonePin(page);
  // A lone terminal and a lone hintuan, neither with a dot.
  const lone = (kind) => alone.find((p) => p.properties.kind === kind);
  const terminal = lone('terminal');
  const hintuan = lone('hintuan');
  check('public map: a lone terminal and a lone hintuan to look at', !!terminal && !!hintuan);
  const { id } = terminal.properties;
  const at = terminal.geometry.coordinates;
  const hintuanId = hintuan.properties.id;
  const hintuanAt = hintuan.geometry.coordinates;
  await settle(page, at, ZOOMED_IN);
  check(
    `public map: zoomed in (${ZOOMED_IN}), no pin; the box drawn`,
    !(await page.evaluate((pin) => !!window.__map.getLayer(pin), LAYER.pin)) &&
      (await until(
        () => drawn(page, LAYER.fill, id),
        (v) => v,
        3000,
      )),
  );
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/public-zoomed-in.png` });
  if (SHOTS) {
    await settle(page, at, ZOOMED_OUT);
    await page.screenshot({ path: `${SHOTS}/public-zoomed-out.png` });
  }
  // Zoomed out round each, where a dot would be drawn: no dot of any kind on the screen, and the
  // box still drawn where the dot gave way to it (below that, a terminal's box is too small).
  for (const [kind, near, boxId] of [
    ['terminal', at, id],
    ['hintuan', hintuanAt, hintuanId],
  ]) {
    for (const zoom of [9, 11, ZOOMED_OUT]) {
      await settle(page, near, zoom);
      const dots = await page.evaluate(
        (dot) =>
          window.__map.getLayer(dot)
            ? window.__map.queryRenderedFeatures({ layers: [dot] }).length
            : 0,
        LAYER.dot,
      );
      check(
        `public map: round a ${kind}, at zoom ${zoom}, no dot${zoom < ZOOMED_OUT ? '' : '; its box still drawn'}`,
        dots === 0 &&
          (zoom < ZOOMED_OUT ||
            (await until(
              () => drawn(page, LAYER.fill, boxId),
              (v) => v,
              3000,
            ))),
        `${dots} dots`,
      );
    }
  }
  await settle(page, at, NAMES_IN);
  const names = await until(
    () => namesShown(page),
    (n) => n > 0,
    3000,
  );
  check(`public map: the hotspots' names still drawn at ${NAMES_IN}`, names > 0, `${names}`);
  // A build without hotspot taps (VITE_HOTSPOT_TAPS) takes none on a box: the tap is the route's
  // under it, its trip or the list, or the empty map's, and no place's card opens.
  const isHotspotTapOn = (await page.locator('[data-hotspot-taps="on"]').count()) > 0;
  /** Whether a place's card is open: none may be, the box's taps off. */
  const placeOpen = () =>
    page.evaluate(() => !!document.querySelector('[data-testid="card-place"]'));
  /** After a tap on `boxId`'s box, taps off: whether it stays unchosen and no place's card opens. */
  const tookNoTap = async (boxId) =>
    (await until(
      async () => (await isChosen(page, boxId)) || (await placeOpen()),
      (v) => v,
      1500,
    )) === false;
  await settle(page, hintuanAt, ZOOMED_IN);
  const middle = await screenPoint(page, hintuanAt);
  await page.mouse.click(middle.x, middle.y);
  if (isHotspotTapOn)
    check(
      "public map: a tap on a hintuan's box opens its card, with no pin or dot there",
      await until(
        () => isChosen(page, hintuanId),
        (v) => v,
        3000,
      ),
      `on the box: ${middle.onBox}`,
    );
  else
    check(
      "public map, hotspot taps off: a tap on a hintuan's box opens no card of its place",
      await tookNoTap(hintuanId),
      `on the box: ${middle.onBox}`,
    );
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__map && window.__map.loaded(), null, { timeout: 30000 });
  await waitForSource(page, 'saved-stops-pins', 30000);
  await settle(page, at, ZOOMED_IN);
  const box = await screenPoint(page, at);
  await page.mouse.click(box.x, box.y);
  if (isHotspotTapOn)
    check(
      "public map: a tap on a terminal's box opens its card, with no pin or dot there",
      await until(
        () => isChosen(page, id),
        (v) => v,
        3000,
      ),
    );
  else
    check(
      "public map, hotspot taps off: a tap on a terminal's box opens no card of its place",
      await tookNoTap(id),
      `on the box: ${box.onBox}`,
    );
  check(
    "public map: the pins' chunk is never fetched",
    pinChunks.length === 0,
    pinChunks.join(', '),
  );
  check('public map: no page errors', errors.length === 0, errors.join('; '));
  await page.close();
}

// ------------------------------------------------------- the public map's footbridges
// The footbridges (.scratch/footbridges, ticket 02): nothing asked for below street level; from
// zoom 15 the file and the layer's chunk come once, the footbridges drawn under everything of
// ours, with their elevators; zoomed out again, none drawn. A footbridge with an elevator from
// the committed file.
{
  const file = JSON.parse(readFileSync('public/data/footbridges.v1.json', 'utf8'));
  const withLift = file.footbridges.find((f) =>
    (f.access ?? []).some((a) => a.kind === 'elevator'),
  );
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
  const asked = [];
  page.on('request', (r) => {
    if (/footbridges\.v1\.json|footbridge-layer/.test(r.url())) asked.push(r.url());
  });
  const errors = await open(page, '/');
  await mapIdle(page);
  const openingZoom = await page.evaluate(() => window.__map.getZoom());
  check(
    `public map: at the opening view (zoom ${openingZoom.toFixed(1)}), no footbridge file asked for`,
    openingZoom < 15 && asked.length === 0,
    asked.join(', '),
  );
  const lift = withLift.access.find((a) => a.kind === 'elevator').point;
  await settle(page, lift, 17);
  const shown = await until(
    () =>
      page.evaluate(() =>
        window.__map.getLayer('footbridges-line')
          ? {
              lines: window.__map.queryRenderedFeatures({ layers: ['footbridges-line'] }).length,
              lifts: window.__map.queryRenderedFeatures({ layers: ['footbridges-elevator'] })
                .length,
            }
          : null,
      ),
    (v) => v && v.lines > 0 && v.lifts > 0,
    10000,
  );
  const order = await page.evaluate(() => window.__map.getLayersOrder());
  const ours = order.findIndex((id) => /^saved-/.test(id));
  check(
    `public map: at zoom 17 on ${withLift.id}, its footbridge and elevator are drawn, under the routes and hotspots`,
    !!shown && shown.lines > 0 && shown.lifts > 0 && order.indexOf('footbridges-line') < ours,
    JSON.stringify(shown),
  );
  check(
    'public map: the file and the layer each asked for once',
    asked.filter((u) => /footbridges\.v1\.json/.test(u)).length === 1 &&
      asked.filter((u) => /footbridge-layer/.test(u)).length === 1,
    asked.join(', '),
  );
  await settle(page, lift, 14);
  const outOfZoom = await page.evaluate(
    () => window.__map.queryRenderedFeatures({ layers: ['footbridges-line'] }).length,
  );
  check('public map: zoomed out to 14, no footbridge drawn', outOfZoom === 0, `${outOfZoom}`);
  check('public map, footbridges: no page errors', errors.length === 0, errors.join('; '));
  await page.close();
}

// ------------------------------------------------------------ the studio's zoom
// No +, − or compass on the studio's map (the owner's call), and the map still zooms: by the + and
// − keys, Ctrl plus the wheel (a trackpad's pinch arrives as one) and a double click.
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await signInAsEditor(page);
  await fakeStudioDb(page, {});
  const errors = await open(page, '/studio/?e2e=1');
  await mapIdle(page);
  check(
    'studio: no zoom or compass buttons on the map',
    (await page
      .locator('.maplibregl-ctrl-zoom-in, .maplibregl-ctrl-zoom-out, .maplibregl-ctrl-compass')
      .count()) === 0,
  );
  const zoomNow = () => page.evaluate(() => window.__map.getZoom());
  /** Whether `act` moves the zoom by a tenth or more the way `sign` says, once at rest again. */
  const zooms = async (act, sign) => {
    await page.evaluate(() => {
      window.__map.jumpTo({ zoom: 14 });
    });
    await mapIdle(page);
    const before = await zoomNow();
    await act();
    await until(zoomNow, (z) => z !== before, 5000);
    await mapIdle(page);
    const after = await zoomNow();
    return {
      ok: (after - before) * sign >= 0.1,
      said: `${before.toFixed(2)} → ${after.toFixed(2)}`,
    };
  };
  await page.evaluate(() => window.__map.getCanvas().focus());
  const keyIn = await zooms(() => page.keyboard.press('Equal'), 1);
  check('studio: the + key zooms in', keyIn.ok, keyIn.said);
  const keyOut = await zooms(() => page.keyboard.press('Minus'), -1);
  check('studio: the − key zooms out', keyOut.ok, keyOut.said);
  const empty = await emptyMapPoint(page);
  check('studio: an empty point on the map to zoom at', !!empty);
  if (empty) {
    const wheel = await zooms(async () => {
      await page.mouse.move(empty.x, empty.y);
      await page.keyboard.down('Control');
      await page.mouse.wheel(0, -300);
      await page.keyboard.up('Control');
    }, 1);
    check('studio: Ctrl and the wheel (a pinch) zoom in', wheel.ok, wheel.said);
    const double = await zooms(() => page.mouse.dblclick(empty.x, empty.y), 1);
    check('studio: a double click zooms in', double.ok, double.said);
  }
  check('studio, zoom: no page errors', errors.length === 0, errors.join('; '));
  await page.close();
}

// ------------------------------------------------------------ the studio
// The lone terminal and hintuan the studio looks at, looked at again on the contributor page.
let looked;
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
  const pinChunks = [];
  page.on('request', (r) => {
    if (/hotspot-pin-images/.test(r.url())) pinChunks.push(r.url());
  });
  const errors = await open(page, '/studio/?e2e=1');
  const { count, alone } = await lonePin(page);
  check(
    'studio: a point for every box, for the boxes and their names',
    count === stop.filter((s) => s.area).length,
    `${count}`,
  );
  looked = lonesOf(alone);
  check(
    'studio: a lone terminal and a lone hintuan to look at',
    !!looked.terminal && !!looked.hintuan,
  );
  await checkNoMarks(page, 'studio', looked);
  await checkNames(page, 'studio', looked.hintuan);
  // A tap on the hintuan's box still opens it, with no pin or dot to tap.
  const { id } = looked.hintuan.properties;
  await settle(page, looked.hintuan.geometry.coordinates, ZOOMED_IN);
  const middle = await screenPoint(page, looked.hintuan.geometry.coordinates);
  await page.mouse.click(middle.x, middle.y);
  check(
    "studio: a tap on a hintuan's box opens its card",
    await until(
      () => isChosen(page, id),
      (v) => v,
      3000,
    ),
    `on the box: ${middle.onBox}`,
  );
  check("studio: the pins' chunk is never fetched", pinChunks.length === 0, pinChunks.join(', '));
  check('studio: no page errors', errors.length === 0, errors.join('; '));
  await page.close();
}

// --------------------------------------------------------- the studio's footbridges
// The studio's footbridges (.scratch/footbridges, ticket 03): off at first, so nothing is asked
// for even at street level; the Map Style card's Footbridges switch draws them, and off again
// hides them without asking for the file a second time.
{
  const file = JSON.parse(readFileSync('public/data/footbridges.v1.json', 'utf8'));
  const withLift = file.footbridges.find((f) =>
    (f.access ?? []).some((a) => a.kind === 'elevator'),
  );
  const lift = withLift.access.find((a) => a.kind === 'elevator').point;
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await signInAsEditor(page);
  await fakeStudioDb(page, {
    stop: index.stops.map((s) => ({
      ...s,
      owner_id: 'owner',
      status: 'approved',
      revision: 1,
      line: s.line ?? null,
    })),
  });
  const asked = [];
  page.on('request', (r) => {
    if (/footbridges\.v1\.json/.test(r.url())) asked.push(r.url());
  });
  const errors = await open(page, '/studio/?e2e=1');
  // The studio draws its possible terminals, never the commuter's markers: the markers drawn and
  // then taken away at street zoom once raced a wait for the map to rest.
  const markersAtOpen = await page.evaluate(() => {
    window.__markersAdded = 0;
    window.__map.on('sourcedata', (e) => {
      if (e.sourceId === 'osm-terminals' && e.sourceDataType === 'metadata')
        window.__markersAdded++;
    });
    return !!window.__map.getSource('osm-terminals');
  });
  await settle(page, lift, 17);
  check('studio: at zoom 17 with the switch off, no footbridge file asked for', asked.length === 0);
  const drawnNow = () =>
    page.evaluate(() =>
      window.__map.getLayer('footbridges-line')
        ? window.__map.queryRenderedFeatures({ layers: ['footbridges-line'] }).length
        : 0,
    );
  const flip = async () => {
    await page.getByRole('button', { name: 'Map design' }).click();
    await page.getByRole('switch', { name: 'Footbridges' }).click();
    await page.keyboard.press('Escape');
  };
  await flip();
  await settle(page, lift, 17);
  const on = await until(drawnNow, (n) => n > 0, 10000);
  check('studio: the Footbridges switch on, the footbridges drawn', on > 0, `${on}`);
  await flip();
  const off = await until(drawnNow, (n) => n === 0, 5000);
  check('studio: the switch off again, none drawn', off === 0, `${off}`);
  await flip();
  const again = await until(drawnNow, (n) => n > 0, 5000);
  check(
    'studio: on once more, drawn again, the file asked for once in all',
    again > 0 && asked.length === 1,
    `${again} drawn; ${asked.length} asked`,
  );
  const terminals = await until(
    () =>
      page.evaluate(() => ({
        dots: !!window.__map.getLayer('possible-terminals-dot'),
        markers: !!window.__map.getSource('osm-terminals'),
        added: window.__markersAdded,
      })),
    (t) => t.dots,
    10000,
  );
  check(
    "studio: the possible terminals at street zoom, and never the commuter's terminal markers",
    terminals.dots && !terminals.markers && !markersAtOpen && terminals.added === 0,
    JSON.stringify({ ...terminals, markersAtOpen }),
  );
  check('studio, footbridges: no page errors', errors.length === 0, errors.join('; '));
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
    'contributor page: the hotspots come in after the map, a point for every box',
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
  await checkNoMarks(page, 'contributor page', looked);
  await checkNames(page, 'contributor page', looked.hintuan);
  // A box is display-only: a tap on it reaches the map and marks nothing.
  const { id } = looked.hintuan.properties;
  const at = looked.hintuan.geometry.coordinates;
  await settle(page, at, ZOOMED_IN);
  const middle = await screenPoint(page, at);
  const cursorOver = async () => {
    await page.mouse.move(middle.x, middle.y);
    return page.evaluate(() => window.__map.getCanvas().style.cursor);
  };
  await page.touchscreen.tap(middle.x, middle.y);
  await page.waitForTimeout(500);
  check(
    '  a tap on a box reaches the map and marks nothing: display-only',
    middle.reachesMap &&
      !(await isChosen(page, id)) &&
      (await page.locator('[data-testid="card"], [data-testid="chooser"]').count()) === 0 &&
      (await cursorOver()) === '',
    `reaches the map: ${middle.reachesMap}`,
  );
  check('contributor page: no page errors', errors.length === 0, errors.join('; '));
  await context.close();
}

await browser.close();
tally();
