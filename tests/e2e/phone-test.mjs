// The public map at /, on a phone: 390×844, touch, a coarse pointer.
//
//   npm run dev                        (in another terminal)
//   node tests/e2e/phone-test.mjs
//
// Same rule as commuter-test: nothing is hard-coded about today's data. Every
// tap position is computed from the map's own sources — the script reads the
// route lines and hotspot rings out of `saved-routes` / `saved-stops`, finds a
// stretch of line no other route comes near, a vertex two routes share, and a
// hotspot edge with no line beside it, then projects those to screen pixels and
// taps them. A check today's data cannot support prints SKIP instead of failing.
//
// Covers: touch chrome — no zoom buttons, attribution moved to the top right,
// no horizontal scroll; the opening (the owner's Q1 and Q4, 2026-10-04) — the
// map made framed on the routes where their fit framed it and kept there,
// with the file still on its way the old opening and the routes framed as
// they come, unless a finger has moved the map first (or, at 1280×800, an
// arrow key or a shift-drag box zoom), the map file asked for by the page
// as it is read and that request taken by the app, and the page's own
// gray "Loading map…" before the app runs, taken over unchanged, and gone
// with the first frame that draws the routes, or at the map's 'load' when
// that comes first (the owner's answer to question A, 2026-10-06); the
// forgiving ±20 px tap, with a negative control well outside the box; the
// trip card a lone route opens (the owner's TimelineRouteDetailCard, 2026-09-29) —
// its ends and every stop,
// ⇅ turning it round keeping its
// colour, leaving it listing the routes sharing an end only where another runs its way; the
// route list where two routes share a road ("N Routes", a card per place), the trip a
// row opens in its card's colour and the empty map tapped back to the list, every card at rest; a tap
// just outside a hotspot, and the bottom sheet on a hotspot's card — tap and
// drag the handle, Middle → Max → Low → Middle → Low → gone (in a build with
// VITE_HOTSPOT_TAPS; without, a tap there opens no place's card); a trip opened
// by a tap on its own line (no ?r= link since the owner took trip links out,
// 2026-10-03), the view it frames, and leaving it listing the routes sharing an
// end with its own; the fine-pointer desktop control (±5 px, no zoom
// buttons for a mouse either since 2026-09-29, attribution bottom right,
// the pointer a hand over a line); a first tap at the opening view
// compiling no GL program, and asking the map what it landed on once
// (2026-10-04); and housekeeping.
import { chromium } from 'playwright';
import {
  BASE,
  cardsSettled,
  emptyMapPoint,
  harness,
  mapIdle,
  nodeFetch,
  takeHeldReload,
  until,
  waitForSource,
} from './lib/harness.mjs';
import { routesFraming } from './lib/framing.mjs';
import { centroidOf, pointInPolygon } from './lib/geo.mjs';
import {
  PAPUNTA_ID,
  PAPUNTA_TAP,
  TWO_WAY_MAP,
  WEST_TERMINAL,
  serveTwoWayMap,
} from './fixtures/two-way-map.mjs';
import {
  colourOf,
  endRings,
  lookReaders,
  paintNow,
  programsAtRest,
  programsSince,
  rideLook,
  ringVar,
  ringed,
} from './lib/looks.mjs';

// The checks today's published map cannot support, each for data it does
// not hold yet (CI on staging, 2026-10-28). A skip of any other check fails
// the run: it stopped proving anything. The sheet's own heights never skip:
// a sheet that will not get there fails (handleTo).
const {
  check,
  skip: skipLive,
  tally,
} = harness({
  knownSkips: [
    // The trip a tap opens has no other way drawn.
    '  ⇅ turns the trip round',
    // The picked card holds every route the list shows.
    '  and lights just its routes',
    // A trip with no hintuans, here and under "Other routes".
    '  its stops open folded, and open',
    '  its hintuans left open, as they were',
    // The place has one box.
    '  another box from its row: Selected, the card staying at full height, the map there',
    // No two hotspot polygons overlap.
    'two overlapping hotspots open the list',
  ],
});
/**
 * On the made-up map (section 5d) nothing may skip, known name or not: the map
 * holds everything its checks need, so a skip there is a check that broke.
 */
// PHONE_PART=k/3 runs part k of 3, so CI can run the parts side by side, by measured time:
// part 1 the forgiving tap and what reads its route (sections 2, 5 and 6), part 2 the trips
// and the made-up map with what runs on it (5b, 5c, 5d, 6b and 6c), part 3 the rest (1a, 1b,
// 3, and 4 to 4e). Section 1, the page's setup and 7 run in every part. Unset, one part runs it all.
const [PHONE_PART, PHONE_PARTS] = (process.env.PHONE_PART || '1/1').split('/').map(Number);
if (
  !(PHONE_PARTS === 1 ? PHONE_PART === 1 : PHONE_PARTS === 3 && PHONE_PART >= 1 && PHONE_PART <= 3)
)
  throw new Error(`PHONE_PART is 1/1 or k/3, not "${process.env.PHONE_PART}"`);
/** Whether this run holds part `k`'s sections. */
const runsPart = (k) => PHONE_PARTS === 1 || PHONE_PART === k;
let onMadeUpMap = false;
const skip = (name, reason) =>
  onMadeUpMap
    ? check(name, false, `skipped on the made-up map, which holds what it needs: ${reason}`)
    : skipLive(name, reason);

// ------------------------------------------------------------------ geometry
// Metres from degrees, flat-earth style. Everything here is within a few km of
// everything else, so a local equirectangular approximation is exact enough to
// decide "is another route within 60 m of this vertex".
const M_PER_DEG_LAT = 110_574;
const mPerDegLng = (lat) => 111_320 * Math.cos((lat * Math.PI) / 180);

/** Metres from point p to the segment a–b, in p's local metre frame. */
function distPointSegment(p, a, b, k) {
  const px = (p[0] - a[0]) * k;
  const py = (p[1] - a[1]) * M_PER_DEG_LAT;
  const bx = (b[0] - a[0]) * k;
  const by = (b[1] - a[1]) * M_PER_DEG_LAT;
  const len2 = bx * bx + by * by;
  let t = len2 ? (px * bx + py * by) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - bx * t, py - by * t);
}

/** Metres from point p to the nearest part of a polyline. */
function distToLine(p, coords, k) {
  let best = Infinity;
  for (let i = 1; i < coords.length; i++) {
    const d = distPointSegment(p, coords[i - 1], coords[i], k);
    if (d < best) best = d;
  }
  return best;
}

const bboxOf = (coords) => {
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of coords) {
    if (x < w) w = x;
    if (x > e) e = x;
    if (y < s) s = y;
    if (y > n) n = y;
  }
  return [w, s, e, n];
};

/** Rough metres from p to a bounding box; 0 when inside. Used only to skip work. */
function distToBbox(p, [w, s, e, n], k) {
  const dx = Math.max(w - p[0], 0, p[0] - e) * k;
  const dy = Math.max(s - p[1], 0, p[1] - n) * M_PER_DEG_LAT;
  return Math.hypot(dx, dy);
}

/** Metres from p to the nearest hotspot ring, 0 if p is inside one. */
function distToHotspots(p, polys, k) {
  let best = Infinity;
  for (const poly of polys) {
    if (pointInPolygon(p, poly.ring)) return 0;
    const d = distToLine(p, poly.ring, k);
    if (d < best) best = d;
  }
  return best;
}

/** Every route within `metres` of p, by variant id. */
function routesNear(p, routes, metres, k) {
  const near = [];
  for (const r of routes) {
    if (distToBbox(p, r.bbox, k) > metres) continue;
    if (distToLine(p, r.coords, k) <= metres) near.push(r);
  }
  return near;
}

/**
 * The nearest vertex on either side of `i` that is at least `metres` away, so
 * the direction of the line through vertex `i` can be measured without the
 * rounding noise between two points a metre apart. Null if the line is shorter.
 */
function neighbourAtLeast(coords, i, metres, k) {
  for (let step = 1; step < coords.length; step++) {
    for (const j of [i - step, i + step]) {
      if (j < 0 || j >= coords.length) continue;
      const d = Math.hypot(
        (coords[j][0] - coords[i][0]) * k,
        (coords[j][1] - coords[i][1]) * M_PER_DEG_LAT,
      );
      if (d >= metres) return coords[j];
    }
  }
  return null;
}

/**
 * Sample at most `max` vertices of a route, evenly. Metro Manila routes carry a
 * few thousand points each; we only need enough to find one good tap target.
 */
function sampleIndices(length, max) {
  const stride = Math.max(1, Math.ceil(length / max));
  const out = [];
  for (let i = 0; i < length; i += stride) out.push(i);
  return out;
}

// ---------------------------------------------------------------- the browser
const b = await chromium.launch();
const errors = [];
let osrmHit = false;
const watch = (p) => {
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 160));
  });
  p.on('request', (req) => {
    if (/router\.project-osrm\.org/.test(req.url())) osrmHit = true;
  });
};

let context = await b.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
let page = await context.newPage();
watch(page);

await nodeFetch(page);
/** In the page, before the app starts: the pointer presses it sees, and what might stop them. */
function pointerRecorder() {
  // Pointer presses the page has seen: on some GitHub runs Chromium stopped
  // making them from touches, and from the mouse, partway through the suite
  // (2026-09-29; see tapHandle).
  // What might have stopped them, and when the last one came: a long press's
  // context menu or drag, or a pointer the browser cancelled.
  window.__pointerdowns = 0;
  window.__lastDown = null;
  window.__odd = [];
  const tag = (e) =>
    e.target instanceof Element
      ? (e.target.closest('[data-testid]')?.getAttribute('data-testid') ??
        e.target.tagName.toLowerCase())
      : '';
  document.addEventListener(
    'pointerdown',
    (e) => {
      window.__pointerdowns++;
      if (e.isTrusted)
        window.__lastDown = `${Math.round(performance.now())} ${e.pointerType}@${tag(e)}`;
    },
    true,
  );
  for (const t of [
    'contextmenu',
    'dragstart',
    'dragend',
    'pointercancel',
    'touchcancel',
    'selectstart',
  ])
    document.addEventListener(
      t,
      (e) => window.__odd.push(`${Math.round(performance.now())} ${t}@${tag(e)}`),
      true,
    );
  window.__src = async (id) => {
    const s = window.__map?.getSource(id);
    return s ? await s.getData() : null;
  };
}
await page.addInitScript(pointerRecorder);
await page.addInitScript(lookReaders);

/**
 * In the page, before the app starts: the map from its making (MapView
 * hands it out as window.__mapEarly in dev, 2026-10-04) — the camera it was
 * made at, the camera at its 'load', and each move of it since, a
 * commuter's (`gesture`, one carrying the input that made it) or another.
 */
function openingRecorder() {
  let early = null;
  const cam = (m) => {
    const c = m.getCenter();
    return {
      lng: c.lng,
      lat: c.lat,
      zoom: m.getZoom(),
      bearing: m.getBearing(),
      pitch: m.getPitch(),
    };
  };
  window.__opening = { made: null, atLoad: null, moves: [] };
  Object.defineProperty(window, '__mapEarly', {
    configurable: true,
    get: () => early,
    set(m) {
      early = m;
      window.__opening.made = cam(m);
      m.on('movestart', (e) => window.__opening.moves.push(e?.originalEvent ? 'gesture' : 'other'));
      m.once('load', () => {
        window.__opening.atLoad = cam(m);
      });
    },
  });
}
await page.addInitScript(openingRecorder);

/**
 * In the page, before the app starts: the moment MapView's own "Loading
 * map…" goes, and the map then (the owner's answer to question A of the
 * cheap-phone report, 2026-10-06) — whether its 'load' had come
 * (window.__map, which MapView hands out at it) and how many of the routes
 * it drew on the screen (its resting line layer's rendered features).
 */
function liftRecorder() {
  window.__lift = null;
  let text = null;
  const look = () => {
    if (window.__lift) return;
    // MapView's own: index.html's, which has no class, goes as the app first renders.
    text ??=
      [...document.querySelectorAll('div.pointer-events-none > p')].find(
        (e) => e.textContent === 'Loading map…',
      ) ?? null;
    if (!text || text.isConnected) return;
    const m = window.__mapEarly;
    let drawn = null;
    try {
      // Every resting layer: the light blue's, and each train line's pale (2026-10-13).
      const resting = m.getLayersOrder().filter((l) => /^saved-routes-(line|rail-)/.test(l));
      drawn = m.getLayer('saved-routes-line')
        ? m.queryRenderedFeatures({ layers: resting }).length
        : 0;
    } catch {
      // The map or its style not there yet: nothing drawn so far.
    }
    window.__lift = { at: Math.round(performance.now()), loaded: !!window.__map, drawn };
  };
  new MutationObserver(look).observe(document, { subtree: true, childList: true });
}

/**
 * In the page, before its own scripts: index.html's request for the map file
 * (the cheap-phone plan, step 20, 2026-10-04), left for the app as
 * window.__paraMapFile — when the page's plain script left it, when the
 * app first read it, and how often (map-file.ts takes it once, and deletes it).
 */
function earlyFileRecorder() {
  let left;
  window.__earlyFile = { leftAt: null, takenAt: null, reads: 0 };
  Object.defineProperty(window, '__paraMapFile', {
    configurable: true,
    get() {
      window.__earlyFile.reads++;
      window.__earlyFile.takenAt ??= Math.round(performance.now());
      return left;
    },
    set(v) {
      left = v;
      window.__earlyFile.leftAt ??= Math.round(performance.now());
    },
  });
}
await page.addInitScript(earlyFileRecorder);
/**
 * The map file as the page asked for it: every request of the page's but
 * the checks' own (x-para-test), each with how it ended, and the page's
 * loads, so a second request says whether the page was loaded again.
 */
const mapFileAsks = [];
let pageLoads = 0;
page.on('request', (req) => {
  if (/\/data\/index\.v6\.json/.test(req.url()) && !req.headers()['x-para-test'])
    mapFileAsks.push({ req, end: 'no answer yet' });
});
page.on('requestfinished', async (req) => {
  const ask = mapFileAsks.find((a) => a.req === req);
  if (ask) ask.end = `${(await req.response().catch(() => null))?.status() ?? 'no response'}`;
});
page.on('requestfailed', (req) => {
  const ask = mapFileAsks.find((a) => a.req === req);
  if (ask) ask.end = `failed: ${req.failure()?.errorText}`;
});
page.on('framenavigated', (f) => {
  if (f === page.mainFrame()) pageLoads++;
});

// ------------------------------------------------------------- 1. the pointer
// Everything below assumes the page believes it is being touched. Playwright's
// mobile emulation usually reports `pointer: coarse` on its own; where it does
// not, CDP's emulated media does it, and it has to be sent before the first
// navigation (an addInitScript cannot change what matchMedia reports).
let cdp = await context.newCDPSession(page);
const coarse = () => page.evaluate(() => window.matchMedia('(pointer: coarse)').matches);
let isCoarse = await coarse();
let coarseVia = 'Playwright emulation';
if (!isCoarse) {
  await cdp
    .send('Emulation.setEmulatedMedia', { features: [{ name: 'pointer', value: 'coarse' }] })
    .catch(() => {});
  isCoarse = await coarse();
  coarseVia = 'CDP Emulation.setEmulatedMedia';
}
check(
  'the page reports a coarse pointer',
  isCoarse,
  isCoarse
    ? `via ${coarseVia}`
    : 'matchMedia("(pointer: coarse)") is false — every check below is meaningless',
);

/**
 * Locator calls that send a mouse or keys; a finger's are tap(), buttonTap and mapTap. fill() stays:
 * it enters text as a phone's own keyboard does, sending no key presses.
 */
const MOUSE_OR_KEYS = [
  'click',
  'dblclick',
  'hover',
  'press',
  'pressSequentially',
  'type',
  'dragTo',
];
const touchOnlyPages = new WeakSet();
let isLocatorGuarded = false;
const notByFinger = (call) =>
  new Error(
    `${call} on a phone touched by finger alone: tap it (buttonTap, mapTap, a CDP touch drag), or move the check to a phone of its own (newPhone)`,
  );
/**
 * Makes `p` a phone touched by finger alone: page.mouse, page.keyboard and every locator call that
 * sends a mouse or keys throw at the line that makes them. Chromium at times stops making pointer
 * events from emulated touches for good once another kind of input has come after them
 * (.scratch/ci-speed/issues/01-chromium-touch-drop.md), so on this phone none may.
 */
const guardTouchOnly = (p) => {
  touchOnlyPages.add(p);
  for (const name of ['mouse', 'keyboard'])
    Object.defineProperty(p, name, {
      configurable: true,
      get() {
        throw notByFinger(`page.${name}`);
      },
    });
  for (const name of ['click', 'dblclick', 'hover', 'press', 'type'])
    Object.defineProperty(p, name, {
      configurable: true,
      value: () => {
        throw notByFinger(`page.${name}()`);
      },
    });
  if (isLocatorGuarded) return;
  isLocatorGuarded = true;
  const locatorProto = Object.getPrototypeOf(p.locator('body'));
  for (const name of MOUSE_OR_KEYS) {
    const sent = locatorProto[name];
    locatorProto[name] = function (...args) {
      if (touchOnlyPages.has(this.page())) throw notByFinger(`locator.${name}()`);
      return sent.apply(this, args);
    };
  }
};
guardTouchOnly(page);
/** Whether the phone in use is touched by finger alone (guardTouchOnly): the shared one is. */
let isTouchOnly = true;
/** A new phone, its map loaded as the first one's is, beside the one in use. */
const openPhone = async () => {
  const phoneContext = await b.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const phonePage = await phoneContext.newPage();
  watch(phonePage);
  await nodeFetch(phonePage);
  await phonePage.addInitScript(pointerRecorder);
  await phonePage.addInitScript(lookReaders);
  const phoneCdp = await phoneContext.newCDPSession(phonePage);
  if (coarseVia !== 'Playwright emulation')
    await phoneCdp
      .send('Emulation.setEmulatedMedia', { features: [{ name: 'pointer', value: 'coarse' }] })
      .catch(() => {});
  await phonePage.goto(`${BASE}/`, { waitUntil: 'load' });
  await phonePage.waitForFunction(() => window.__map && window.__map.loaded(), null, {
    timeout: 30000,
  });
  await waitForSource(phonePage, 'saved-routes');
  await mapIdle(phonePage);
  return { context: phoneContext, page: phonePage, cdp: phoneCdp };
};
/**
 * A new phone in place of the one in use: touched by finger alone, or with `isTouchOnly` false,
 * for checks of the mouse or keys. A person rarely switches between finger, mouse and keys mid-task,
 * so each kind of input runs on a phone of its own.
 */
const newPhone = async ({ isTouchOnly: touchOnly = true } = {}) => {
  await context.close();
  ({ context, page, cdp } = await openPhone());
  isTouchOnly = touchOnly;
  if (touchOnly) guardTouchOnly(page);
};

// What the dev server holds for the next page to connect, taken first. A
// reload Tailwind's plugin sent for an edit made before this run began (to
// a README, say) loaded the page a second time the moment its client
// connected, and step 20's check below counts the page's requests for the
// map file and its loads (the owner's answer to question W of the
// cheap-phone report, 2026-10-06; harness.mjs).
const held = await takeHeldReload();
if (held.held)
  console.log(
    `(the dev server held a ${held.held.type} for the next page to connect, from before this run: taken first)`,
  );
else if (!held.socket)
  console.log(`(no dev server's socket at ${BASE}: nothing held for the page to take)`);
await page.goto(`${BASE}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__map && window.__map.loaded(), null, { timeout: 30000 });
await waitForSource(page, 'saved-routes');
await mapIdle(page);
// A build without hotspot taps (VITE_HOTSPOT_TAPS) reads a tap on a box as the route's under it or
// the empty map's, so no place's card opens from the map; the page's root says which. One build
// serves every phone this suite opens.
const isHotspotTapOn = (await page.locator('[data-hotspot-taps="on"]').count()) > 0;

check(
  'no Contributor button is on the public map',
  (await page.getByTestId('contributor-button').count()) === 0,
);

/**
 * A tap that reached its target and made no pointer events at all: Chromium's emulated touch on a
 * slow runner sometimes gives the page only touchstart and touchend (two probe runs on the runner,
 * draft #1012; .scratch/ci-speed/phone-test-sheet-snap.md). Such a tap, and only such a tap, is
 * sent again by hand, named in the log, at most once a part (CHROMIUM_DROPS_ALLOWED): more than
 * that is something else going on. A tap that could not reach its target (off the screen, under
 * another element, on something still moving) is never sent again: it fails. Re-checked on each
 * Chromium or Playwright update (.scratch/ci-speed/issues/01-chromium-touch-drop.md).
 */
let chromiumDrops = 0;
const CHROMIUM_DROPS_ALLOWED = 1;
await page.evaluate(() => {
  window.__clicks = 0;
  window.__map.on('click', () => window.__clicks++);
});
let lateClicks = 0;
/** A frame drawn after the input queue drained: the click a touch makes, if any, has been dispatched by now. */
const settled = () =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))));
/** Pointer presses the page has seen (the init script's count, trusted or sent by hand). */
const pointerPresses = () => page.evaluate(() => window.__pointerdowns);
/** A tap Chromium dropped, sent again by hand: counted and named. */
const handSent = (what) => {
  chromiumDrops++;
  console.log(`      by hand: Chromium made no pointer events from the touch on ${what}`);
};

/** The sheets' heights, for a failure to name. */
const snapsNow = () =>
  page.evaluate(
    () =>
      ['card', 'chooser']
        .map((id) => {
          const el = document.querySelector(`[data-testid="${id}"]:not([hidden])`);
          return el
            ? `${id} ${el.getAttribute('data-snap')} at ${Math.round(el.getBoundingClientRect().top)}`
            : null;
        })
        .filter(Boolean)
        .join(', ') || 'no sheet',
  );
/** A tap that did not reach its target, or did nothing: a FAIL naming why, and the sheets' heights. */
const missed = async (what, why) =>
  check(`a tap reaches ${what}`, false, `${why}; ${await snapsNow()}`);

/**
 * A finger on the map at page point (x, y), where the map itself is the topmost thing: a person's
 * tap on a marker or a card there would go to that instead, so a tap that would is a FAIL naming
 * it. The map's own click is waited for; a tap Chromium dropped (no pointer press at all) is sent
 * again by hand as the click the browser would have made, with `pointerType: 'touch'`.
 */
const mapTap = async (x, y) => {
  // Counted afresh on a page loaded since (openAlone): without it the count
  // never moved (the review of 2026-10-03).
  const before = await page.evaluate(() => {
    if (window.__clicks === undefined) {
      window.__clicks = 0;
      window.__map.on('click', () => window.__clicks++);
    }
    return window.__clicks;
  });
  const onTop = await page.evaluate(
    ([px, py]) => {
      const top = document.elementFromPoint(px, py);
      if (top && window.__map.getCanvasContainer().contains(top)) return null;
      return top
        ? (top.closest('[data-testid]')?.getAttribute('data-testid') ?? top.tagName)
        : 'nothing (off the screen)';
    },
    [x, y],
  );
  if (onTop) {
    await missed(`the map at (${Math.round(x)}, ${Math.round(y)})`, `${onTop} is over it there`);
    return;
  }
  const presses = await pointerPresses();
  await page.touchscreen.tap(x, y);
  // The page may be busy drawing for a while after the touch; only then does
  // the wait for its click start (a local run, 2026-09-25).
  await settled();
  const clicks = () => page.evaluate(() => window.__clicks);
  if ((await until(clicks, (n) => n !== before, 1500)) !== before) return;
  if ((await pointerPresses()) !== presses) {
    await missed(
      `the map at (${Math.round(x)}, ${Math.round(y)})`,
      'pressed, and no click in 1.5 s',
    );
    return;
  }
  handSent(`the map at (${Math.round(x)}, ${Math.round(y)})`);
  await page.evaluate(
    ([px, py]) => {
      window.__map.getCanvasContainer().dispatchEvent(
        new PointerEvent('click', {
          pointerType: 'touch',
          clientX: px,
          clientY: py,
          bubbles: true,
          cancelable: true,
        }),
      );
    },
    [x, y],
  );
  await settled();
  if ((await page.evaluate(() => window.__clicks)) > before + 1) lateClicks++;
};
/**
 * Where a finger taps `locator`, as a person would: scrolled into view, held still (its box the
 * same over two frames: a sheet or a list still moving has not), and the topmost thing at its
 * middle. A row below the screen (a sheet is translated, not scrolled, so scrolling brings none
 * up), a button under another element, or one still sliding returns the reason instead.
 */
const fingerOn = async (locator, isCentred = false) => {
  const el = locator.first();
  if ((await locator.count()) === 0) return { why: 'no such element' };
  if (isCentred) await el.evaluate((node) => node.scrollIntoView({ block: 'center' }));
  else await el.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
  let box = null;
  let isStill;
  const by = Date.now() + 3000;
  for (;;) {
    const before = await el.boundingBox().catch(() => null);
    await settled();
    box = await el.boundingBox().catch(() => null);
    isStill = !!before && !!box && ['x', 'y', 'width', 'height'].every((k) => before[k] === box[k]);
    if (isStill || Date.now() > by) break;
  }
  if (!box) return { why: 'not on the page' };
  const size = `${Math.round(box.width)}×${Math.round(box.height)}`;
  if (!isStill) return { why: `still moving after 3 s (${size})` };
  const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const onTop = await el.evaluate((node, { x, y }) => {
    const top = document.elementFromPoint(x, y);
    if (top && (top === node || node.contains(top))) return null;
    return top
      ? (top.closest('[data-testid]')?.getAttribute('data-testid') ?? top.tagName)
      : 'nothing (off the screen)';
  }, at);
  if (!onTop) return { at };
  // In view but under something drawn over the sheet's foot (the Controller): a person scrolls
  // it clear, to the middle of what scrolls, and looks again.
  const isInScroller = await el.evaluate((node) => {
    for (let p = node.parentElement; p; p = p.parentElement)
      if (/auto|scroll/.test(getComputedStyle(p).overflowY) && p.scrollHeight > p.clientHeight)
        return true;
    return false;
  });
  if (!isCentred && isInScroller) return fingerOn(locator, true);
  return { why: `${onTop} at its middle (${Math.round(at.x)}, ${Math.round(at.y)}), ${size}` };
};

/**
 * A finger on `locator` where a person would tap it (fingerOn), and `done()` true within 1.5 s.
 * False when there is no such element; a FAIL when the tap could not reach it or did nothing. A
 * tap Chromium dropped on a target fingerOn verified (no pointer press, the target still topmost
 * there) is sent again by hand as a finger sends it: pointerdown, pointerup, the click. `more`
 * adds to a FAIL's text what the caller knows of the moment (closeCard's: the cards on show).
 */
const buttonTap = async (locator, done, more = async () => '') => {
  if ((await locator.count()) === 0) return false;
  const { at, why } = await fingerOn(locator);
  if (!at) {
    await missed(locator, `${why}${await more()}`);
    return true;
  }
  const presses = await pointerPresses();
  await page.touchscreen.tap(at.x, at.y);
  await settled();
  if (!(await until(done, Boolean, 1500))) {
    const isStillOnTop = await locator.first().evaluate((node, { x, y }) => {
      const top = document.elementFromPoint(x, y);
      return !!top && (top === node || node.contains(top));
    }, at);
    if ((await pointerPresses()) !== presses || !isStillOnTop) {
      // Named, not waited for: whether it came at all, and how late.
      const t0 = Date.now();
      const late = (await until(done, Boolean, 3500))
        ? `, it came ${Date.now() - t0 + 1500} ms after the tap`
        : ', nor 3.5 s later';
      await missed(locator, `tapped, and nothing came of it in 1.5 s${late}${await more()}`);
    } else {
      handSent(locator);
      await locator.first().evaluate((node, { x, y }) => {
        const finger = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y };
        const pointer = {
          ...finger,
          pointerId: 91,
          pointerType: 'touch',
          isPrimary: true,
          button: 0,
        };
        node.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, buttons: 1 }));
        node.dispatchEvent(new PointerEvent('pointerup', { ...pointer, buttons: 0 }));
        node.dispatchEvent(new MouseEvent('click', { ...finger, detail: 1, button: 0 }));
      }, at);
      if (!(await until(done, Boolean, 1500)))
        await missed(locator, `sent again by hand, and nothing came of it in 1.5 s${await more()}`);
    }
  }
  // Whatever the tap set going, a sheet or the camera, come to rest.
  await cardsSettled(page);
  return true;
};

/** A finger's tap on `locator`, for a check that a click with no touch before it would pass by mistake: buttonTap's. */
const touchTap = (locator, done) => buttonTap(locator, done);

/** Where the camera is: its centre and zoom. */
const camNow = () =>
  page.evaluate(() => {
    const m = window.__map;
    const c = m.getCenter();
    return { lng: c.lng, lat: c.lat, zoom: m.getZoom() };
  });
/**
 * A finger dragging the map from (x, y) by (dx, dy), held still before letting go so it does not
 * fling: a pan with an `originalEvent`, as a commuter's is.
 */
const fingerPan = async (x, y, dx, dy) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + (dx * i) / 8, y: y + (dy * i) / 8 }],
    });
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(250);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page
    .waitForFunction(() => !window.__map.isMoving(), null, { timeout: 5000 })
    .catch(() => {});
};
/**
 * A finger thrown from (x, y) by `dy` px over `steps` moves `gap` ms apart and lifted at once, as a
 * sheet is thrown. Each touch carries its own time, so the speed the sheet reads is the throw's,
 * however long a busy runner takes to deliver it.
 */
const throwFrom = async (x, y, dy, steps, gap) => {
  const startedAt = Date.now() / 1000;
  const touch = (type, at, touchPoints) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints,
      timestamp: startedAt + at / 1000,
    });
  await touch('touchStart', 0, [{ x, y }]);
  for (let i = 1; i <= steps; i++) {
    await touch('touchMove', i * gap, [{ x, y: y + (dy * i) / steps }]);
  }
  await touch('touchEnd', steps * gap + 8, []);
  await cardsSettled(page);
};
/**
 * How much of a sheet shows, in px: its height less how far it is slid down, read against where it
 * stands unslid (its offset parent's top plus its own offset).
 */
const shownOf = (sheet) =>
  sheet.first().evaluate((el) => {
    const unslid = (el.offsetParent?.getBoundingClientRect().top ?? 0) + el.offsetTop;
    return Math.round(el.offsetHeight - (el.getBoundingClientRect().top - unslid));
  });
/** Whether two readings of camNow are one camera. */
const sameCamera = (a, b) =>
  Math.abs(a.zoom - b.zoom) < 0.01 &&
  Math.abs(a.lng - b.lng) < 1e-6 &&
  Math.abs(a.lat - b.lat) < 1e-6;

check(
  'no zoom buttons on a touch screen',
  (await page.locator('.maplibregl-ctrl-zoom-in').count()) === 0,
);
// The map's credits: its own ⓘ in the map's top-left corner (the owner, 2026-11-22; the studio and
// the contributor page keep theirs at the bottom left), MapLibre's corner credits stepped aside; the ⓘ opens them as the Map Data Source sheet
// (4494:10177), so the licences' credit is always a tap away. Checked by mouse and keys (Escape, Enter) on a
// phone of its own: the shared one is touched by finger alone (guardTouchOnly).
{
  const keysPhone = await openPhone();
  const keysPage = keysPhone.page;
  const info = keysPage.getByRole('button', { name: 'Map data sources' });
  const sheet = keysPage.getByRole('dialog', { name: 'Map Data Source' });
  const infoBox = await info.boundingBox();
  check(
    "the map's ⓘ sits in the top-left corner, 12 in from each side, 32 across, and MapLibre's corner credits are gone",
    !!infoBox &&
      Math.abs(infoBox.x - 12) < 1 &&
      Math.abs(infoBox.width - 32) < 1 &&
      Math.abs(infoBox.y - 12) < 1 &&
      !(await keysPage.locator('.maplibregl-ctrl-attrib').isVisible()),
    JSON.stringify(infoBox),
  );
  const isFocusOnInfo = () =>
    keysPage
      .waitForFunction(
        () => document.activeElement?.getAttribute('aria-label') === 'Map data sources',
        null,
        { timeout: 5000 },
      )
      .then(() => true)
      .catch(() => false);
  const isMapInert = () =>
    keysPage.evaluate(
      () => !!document.querySelector('[data-testid="map-view"]')?.closest('[inert]'),
    );
  await info.click();
  await sheet.waitFor();
  // Half way through its rise (map-data-source-sheet.css), held there: the sheet part way up from
  // below the screen.
  const midRise = await keysPage.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"].map-data-source-sheet');
    const [rise] = dialog?.getAnimations() ?? [];
    const duration = rise?.effect?.getTiming().duration;
    if (!dialog || !rise || typeof duration !== 'number') return null;
    rise.pause();
    rise.currentTime = duration / 2;
    const shift = new window.DOMMatrixReadOnly(getComputedStyle(dialog).transform).m42;
    rise.finish();
    return { shift: Math.round(shift), height: Math.round(dialog.getBoundingClientRect().height) };
  });
  check(
    '  the sheet rises from below the screen: half way through, part way up',
    !!midRise && midRise.shift > 0 && midRise.shift < midRise.height,
    JSON.stringify(midRise),
  );
  const links = await sheet
    .getByRole('link')
    .evaluateAll((all) => all.map((a) => ({ text: a.textContent, href: a.getAttribute('href') })));
  check(
    "  it opens Map Data Source: the map's credits as links, OpenStreetMap's among them, the map inert under it",
    links.some(
      (l) =>
        l.text?.startsWith('© OpenStreetMap contributors') &&
        l.href === 'https://www.openstreetmap.org/copyright',
    ) &&
      links.some((l) => l.text?.startsWith('© Para contributors')) &&
      (await isMapInert()) &&
      (await keysPage.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))),
    JSON.stringify(links),
  );
  await sheet.getByRole('button', { name: 'Close' }).click();
  await sheet.waitFor({ state: 'detached' });
  check(
    '  ✕ closes it, once it has slid down: focus back on the ⓘ, the map live again',
    (await isFocusOnInfo()) && !(await isMapInert()),
  );
  await info.click();
  await sheet.waitFor();
  await keysPage.keyboard.press('Escape');
  await sheet.waitFor({ state: 'detached' });
  check('  Escape closes it too, focus back on the ⓘ', await isFocusOnInfo());

  // Closed mid-rise, it goes down from where it is; opened again by keyboard while it slides
  // down, the new sheet stays open: the old one's slide is not the new one's close.
  await info.click();
  await keysPage.keyboard.press('Escape');
  await sheet.waitFor({ state: 'detached' });
  const isBackAfterMidRise = await isFocusOnInfo();
  await info.focus();
  await keysPage.keyboard.press('Enter');
  await sheet.waitFor();
  await keysPage.keyboard.press('Escape');
  await keysPage.keyboard.press('Enter');
  await keysPage.waitForTimeout(1200);
  check(
    '  closed mid-rise it goes, focus on the ⓘ; reopened by keyboard while it slides down, the new sheet stays, focus in it',
    isBackAfterMidRise &&
      (await sheet.count()) === 1 &&
      (await keysPage.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))),
  );
  await keysPage.keyboard.press('Escape');
  await sheet.waitFor({ state: 'detached' });

  // Less motion asked for: no slide either way, shown and gone at once.
  await keysPage.emulateMedia({ reducedMotion: 'reduce' });
  await info.click();
  await sheet.waitFor();
  const isStill = await keysPage.evaluate(
    () =>
      document
        .querySelector('[role="dialog"].map-data-source-sheet')
        ?.getAnimations()
        .filter((a) => a.playState === 'running').length === 0,
  );
  await sheet.getByRole('button', { name: 'Close' }).click();
  const isGoneAtOnce = (await sheet.count()) === 0;
  check(
    '  with less motion asked for, the sheet neither rises nor sinks: shown and gone at once',
    isStill && isGoneAtOnce && (await isFocusOnInfo()),
  );
  await keysPage.emulateMedia({ reducedMotion: null });
  await keysPhone.context.close();
}
const noHScroll = (p) =>
  p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
check(
  'no horizontal scroll at load',
  await noHScroll(page),
  `scrollWidth ${await page.evaluate(() => document.documentElement.scrollWidth)} vs innerWidth ${await page.evaluate(() => window.innerWidth)}`,
);

// ----------------------------------- 1a. the opening: framed, and its gray
// The owner's Q1 and Q4 (2026-10-04). The map is made framed on the routes,
// where their fit put it after the map's 'load' until then — the box round
// every overview in the published map, 100 px clear of the edges, zoom 13
// at most — so its first tiles are those of the view it keeps; the fit
// itself no longer moves it. With the file still on its way it opens as it
// always did and the fit frames the routes as they come, unless a finger has
// moved the map by then. And before the app's script has run, the page
// itself shows the map's gray "Loading map…", which the app's own replaces
// unchanged; that goes at the first frame that draws the routes, before
// the map's 'load' while the basemap's tiles are on their way, or at the
// 'load' when no route is drawn by then (the owner's answer to question A
// of the cheap-phone report, 2026-10-06).
if (runsPart(3)) {
  const camOf = (p) =>
    p.evaluate(() => {
      const m = window.__map;
      const c = m.getCenter();
      return {
        lng: c.lng,
        lat: c.lat,
        zoom: m.getZoom(),
        bearing: m.getBearing(),
        pitch: m.getPitch(),
      };
    });
  /** The same camera, to a billionth of a degree and of a zoom level. */
  const sameCam = (a, b) =>
    !!a &&
    !!b &&
    ['lng', 'lat', 'zoom', 'bearing', 'pitch'].every((k) => Math.abs(a[k] - b[k]) < 1e-9);
  const showCam = (c) =>
    c ? `${c.lng.toFixed(5)},${c.lat.toFixed(5)} z${c.zoom.toFixed(4)}` : 'none';

  const want = await routesFraming(page);
  const opening = await page.evaluate(() => window.__opening);
  const now = await camOf(page);
  check(
    "the map is made framed on the routes, where their fit framed it: padding 100, zoom 13 at most (the owner's Q1)",
    sameCam(opening.made, want),
    `made at ${showCam(opening.made)}; the fit's ${showCam(want)}`,
  );
  check(
    "  and stays there: the same camera at its 'load' and at rest, never moved since",
    sameCam(opening.atLoad, want) && sameCam(now, want) && opening.moves.length === 0,
    `at 'load' ${showCam(opening.atLoad)}, now ${showCam(now)}; ${opening.moves.length} move(s)${opening.moves.length ? ': ' + opening.moves.join(', ') : ''}`,
  );

  // Step 20, which Q1's opening rests on: the page asks for the map file as
  // it is read, and the app takes that request rather than asking again.
  // Without the page's script the app asks once itself, and the map opens
  // as well, a little later: no other check would say so (review of Q1,
  // 2026-10-05).
  const early = await page.evaluate(() => ({
    ...window.__earlyFile,
    still: '__paraMapFile' in window,
  }));
  check(
    '  the page asked for the map file as it was read, and the app took that request, once: the one request for it (step 20)',
    early.leftAt != null &&
      early.takenAt != null &&
      early.leftAt <= early.takenAt &&
      early.reads === 1 &&
      !early.still &&
      mapFileAsks.length === 1,
    `left by the page at ${early.leftAt ?? 'never'} ms, taken by the app at ${early.takenAt ?? 'never'} ms, read ${early.reads} time(s), ${early.still ? 'still there' : 'gone'}; ${mapFileAsks.length} request(s) for it (${mapFileAsks.map((a) => a.end).join(', ')}) in ${pageLoads} load(s) of the page`,
  );

  /** A fresh page on the phone (or in `ctx`) with the map file held back till `release()`: a first visit whose file is still on its way. */
  const heldBack = async (ctx = context) => {
    const p = await ctx.newPage();
    watch(p);
    await nodeFetch(p);
    await p.addInitScript(openingRecorder);
    await p.addInitScript(liftRecorder);
    let release;
    const held = new Promise((r) => (release = r));
    await p.route(/\/data\/index\.v6\.json/, async (route) => {
      await held;
      await route.fallback();
    });
    await p.goto(`${BASE}/`, { waitUntil: 'load' });
    await p.waitForFunction(() => window.__map && window.__map.loaded(), null, { timeout: 30000 });
    return { p, release };
  };
  /** Lets the file through, and waits for the routes on the map, then for anything their coming moves. */
  const routesCome = async (p, release) => {
    release();
    await until(
      () =>
        p.evaluate(
          async () =>
            ((await window.__map.getSource('saved-routes')?.getData())?.features.length ?? 0) > 0,
        ),
      Boolean,
      20000,
    );
    // Their fit, if the map's opening frames them otherwise, and its flight over.
    await cardsSettled(p);
  };

  // With no file to frame on, the old opening; the fit then frames the
  // routes as they come, and the camera ends where it always ended.
  {
    const { p, release } = await heldBack();
    const made = await p.evaluate(() => window.__opening.made);
    // Its 'load' before any route to draw: "Loading map…" goes at it, as it
    // always did (the owner's answer to question A, 2026-10-06).
    const lift = await p
      .waitForFunction(() => window.__lift, null, { timeout: 5000 })
      .then((h) => h.jsonValue())
      .catch(() => null);
    check(
      "  the file still on its way, the map's 'load' first: \"Loading map…\" goes at the 'load', with no route on the screen",
      !!lift && lift.loaded && lift.drawn === 0,
      lift
        ? `gone at ${lift.at} ms, ${lift.loaded ? "after the map's 'load'" : "before the map's 'load'"}, ${lift.drawn} route(s) drawn`
        : 'never gone',
    );
    await routesCome(p, release);
    const end = await camOf(p);
    const fit = await routesFraming(p);
    check(
      "  the file still on its way: the map opens as it did (zoom 11), and the routes are framed as they come, the fit's camera",
      made?.zoom === 11 && sameCam(end, fit),
      `made at ${showCam(made)}; ends at ${showCam(end)}; the fit's ${showCam(fit)}`,
    );
    await p.close();
  }

  // A finger on the map before they come keeps it where it took it.
  {
    const { p, release } = await heldBack();
    const before = await camOf(p);
    const x = 195;
    const y = 422;
    const pdc = await context.newCDPSession(p);
    let how = 'touch';
    try {
      await pdc.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let i = 1; i <= 8; i++) {
        await pdc.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: x - 15 * i, y: y - 20 * i }],
        });
        await p.waitForTimeout(16);
      }
      // Held still before letting go: no fling to carry it on.
      await p.waitForTimeout(250);
      await pdc.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } catch {
      // The runner refused the touch: the camera reads as unmoved, and the mouse drags instead.
    }
    await p
      .waitForFunction(() => !window.__map.isMoving(), null, { timeout: 5000 })
      .catch(() => {});
    if (sameCam(await camOf(p), before)) {
      // The runner made no touch of it: the same drag with a mouse.
      how = 'mouse';
      await p.mouse.move(x, y);
      await p.mouse.down();
      for (let i = 1; i <= 8; i++) {
        await p.mouse.move(x - 15 * i, y - 20 * i);
        await p.waitForTimeout(16);
      }
      await p.waitForTimeout(250);
      await p.mouse.up();
      await p
        .waitForFunction(() => !window.__map.isMoving(), null, { timeout: 5000 })
        .catch(() => {});
    }
    const dragged = await camOf(p);
    await routesCome(p, release);
    const end = await camOf(p);
    const fit = await routesFraming(p);
    const moves = await p.evaluate(() => window.__opening.moves);
    check(
      '  a finger moving the map before they come keeps it where it took it: the fit does not take it back',
      !sameCam(dragged, before) &&
        sameCam(end, dragged) &&
        !sameCam(end, fit) &&
        moves.every((m) => m === 'gesture'),
      `dragged by ${how} from ${showCam(before)} to ${showCam(dragged)}; ends at ${showCam(end)}; the fit's ${showCam(fit)}; moves: ${moves.join(', ') || 'none'}`,
    );
    await p.close();
  }

  // On a desktop, the two inputs no drag, zoom, turn or tilt event carries
  // (review of the owner's Q1, 2026-10-05): an arrow key's pan, which
  // MapLibre eases with its zoom, bearing and pitch kept, so only its
  // 'movestart' carries the key; and a shift-drag's box, which it zooms to
  // with no input at all. Either, made before the routes come, keeps the map
  // where the commuter took it, as a finger does.
  {
    const wide = await b.newContext({ viewport: { width: 1280, height: 800 } });
    for (const input of ['an arrow key', 'a shift-drag box zoom']) {
      const { p, release } = await heldBack(wide);
      const before = await camOf(p);
      const canvas = p.locator('canvas.maplibregl-canvas');
      if (input === 'an arrow key') {
        // The map's canvas takes the keys once it has the focus, as a click on it gives it.
        await canvas.focus();
        await p.keyboard.press('ArrowRight');
      } else {
        const r = await canvas.boundingBox();
        await p.keyboard.down('Shift');
        await p.mouse.move(r.x + 500, r.y + 300);
        await p.mouse.down();
        await p.mouse.move(r.x + 600, r.y + 380, { steps: 6 });
        await p.mouse.up();
        await p.keyboard.up('Shift');
      }
      await cardsSettled(p);
      const moved = await camOf(p);
      await routesCome(p, release);
      const end = await camOf(p);
      const fit = await routesFraming(p);
      const moves = await p.evaluate(() => window.__opening.moves);
      check(
        `  on a desktop, ${input} moving the map before they come keeps it where it took it`,
        !sameCam(moved, before) && sameCam(end, moved) && !sameCam(end, fit) && moves.length === 1,
        `from ${showCam(before)} to ${showCam(moved)}; ends at ${showCam(end)}; the fit's ${showCam(fit)}; moves: ${moves.join(', ') || 'none'}`,
      );
      await p.close();
    }
    await wide.close();
  }

  // The page before the app: its own gray "Loading map…", read with no
  // script at all, against the app's own while the map waits for its style;
  // then the app's, gone as the routes are drawn, the basemap's tiles held.
  /** "Loading map…" on page `p`: how many, and the first's text and the gray under it, as drawn. */
  // Measured once Livvic Regular, the face it is drawn in, has loaded on both sides: a width read
  // while the fallback still shows would compare two faces, not the page and the app.
  const loadingLook = (p) =>
    p.evaluate(async () => {
      await document.fonts.load("400 0.875rem 'Livvic'");
      await document.fonts.ready;
      const ps = [...document.querySelectorAll('p')].filter(
        (e) => e.textContent === 'Loading map…',
      );
      const el = ps[0];
      if (!el) return { count: 0 };
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      // The gray: the page's own screen, or MapView's wrapper under its map.
      const under = el.parentElement.style.backgroundColor
        ? el.parentElement
        : document.querySelector('.bg-surface-secondary');
      const g = under ? under.getBoundingClientRect() : null;
      return {
        count: ps.length,
        text: [s.fontFamily, s.fontSize, s.lineHeight, s.fontWeight, s.color].join(' / '),
        at: [r.x, r.y, r.width, r.height].map((v) => +v.toFixed(2)).join(','),
        gray: under
          ? `${getComputedStyle(under).backgroundColor} ${[g.x, g.y, g.width, g.height].join(',')}`
          : 'none',
        marks: document.querySelectorAll('[data-directions], [data-dock-host]').length,
      };
    });
  const still = await b.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    javaScriptEnabled: false,
  });
  const sp = await still.newPage();
  await sp.goto(`${BASE}/`, { waitUntil: 'load' });
  const own = await loadingLook(sp);
  await still.close();
  check(
    'before the app runs, the page shows the map\'s gray "Loading map…", with no data-directions or data-dock-host (the owner\'s Q4)',
    own.count === 1 && own.marks === 0 && own.gray.startsWith('oklch(0.97 0 none) 0,0,390,844'),
    `${own.count} "Loading map…"; ${own.marks} marked; gray ${own.gray}`,
  );
  const ap = await context.newPage();
  watch(ap);
  await nodeFetch(ap);
  await ap.addInitScript(liftRecorder);
  // The basemap's style held till `styleIn()`; then a stand-in's gray and
  // one source of its own, whose tiles are held till `tilesIn()`, so the
  // map's 'load' waits for them as it waits for a real basemap's (the
  // owner's answer to question A, 2026-10-06).
  let styleIn;
  const styleHeld = new Promise((r) => (styleIn = r));
  let tilesIn;
  const tilesHeld = new Promise((r) => (tilesIn = r));
  let tilesAsked = 0;
  await ap.route(/tiles\.openfreemap\.org\/styles\//, async (route) => {
    await styleHeld;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        version: 8,
        sources: {
          held: {
            type: 'vector',
            tiles: ['https://tiles.openfreemap.org/held/{z}/{x}/{y}.pbf'],
            maxzoom: 14,
          },
        },
        layers: [
          { id: 'bg', type: 'background', paint: { 'background-color': '#eee' } },
          { id: 'held', type: 'line', source: 'held', 'source-layer': 'transportation' },
        ],
      }),
    });
  });
  await ap.route(/tiles\.openfreemap\.org\/held\//, async (route) => {
    tilesAsked++;
    await tilesHeld;
    // An empty tile: nothing to draw, nothing to ask again.
    await route.fulfill({
      status: 200,
      contentType: 'application/x-protobuf',
      body: Buffer.alloc(0),
    });
  });
  await ap.goto(`${BASE}/`, { waitUntil: 'load' });
  await ap.waitForSelector('[data-directions]', { timeout: 30000 }).catch(() => {});
  const app = await loadingLook(ap);
  check(
    '  the app takes it over unchanged: its own, alone, the same gray, text and place',
    app.count === 1 && app.text === own.text && app.at === own.at && app.gray === own.gray,
    `page: ${own.text} at ${own.at} on ${own.gray} | app: ${app.count} of them, ${app.text} at ${app.at} on ${app.gray}`,
  );
  styleIn();
  const lift = await ap
    .waitForFunction(() => window.__lift, null, { timeout: 30000 })
    .then((h) => h.jsonValue())
    .catch(() => null);
  const asked = tilesAsked;
  check(
    "  and it goes at the first frame that draws the routes, the basemap's tiles still on their way: before the map's 'load' (the owner's answer to A)",
    !!lift && !lift.loaded && lift.drawn > 0 && asked > 0,
    lift
      ? `gone at ${lift.at} ms, ${lift.loaded ? "after the map's 'load'" : "before the map's 'load'"}, ${lift.drawn} route(s) drawn; ${asked} basemap tile(s) held`
      : `never gone; ${asked} basemap tile(s) held`,
  );
  tilesIn();
  await ap
    .waitForFunction(() => window.__map && window.__map.loaded(), null, { timeout: 30000 })
    .catch(() => {});
  const gone = await loadingLook(ap);
  const loaded = await ap.evaluate(() => !!window.__map);
  check(
    "  and stays gone through the map's 'load'",
    loaded && gone.count === 0,
    `'load' ${loaded ? 'came' : 'never came'}; ${gone.count} left`,
  );
  await ap.close();
}

// ------------------------------------------------------------------- the data
const snapshot = await page.evaluate(async () => {
  const routesFC = await window.__src('saved-routes');
  const hotspotsFC = await window.__src('saved-stops');
  // Each direction's full line, as the page reads it for a lit direction
  // (map-file.ts): the source holds overviews until then, and where two routes
  // share a road is found on the lines themselves, as before the index.
  const { fetchLine } = await import('/src/features/routes/published/fetch-line.ts');
  const routes = [];
  for (const f of routesFC?.features ?? []) {
    if (f.geometry.type !== 'LineString' || f.geometry.coordinates.length < 2) continue;
    const full = await fetchLine(f.properties.id).catch(() => null);
    routes.push({
      id: f.properties.id,
      routeId: f.properties.routeId,
      signboard: f.properties.name ?? '',
      coords: full?.coordinates ?? f.geometry.coordinates,
    });
  }
  return {
    routes,
    polys: (hotspotsFC?.features ?? [])
      .filter((f) => f.geometry.type === 'Polygon')
      .map((f) => ({
        id: f.properties.id,
        kind: f.properties.kind,
        name: f.properties.name,
        ring: f.geometry.coordinates[0],
      })),
  };
});
for (const r of snapshot.routes) r.bbox = bboxOf(r.coords);
console.log(
  `\n(${snapshot.routes.length} route directions, ${snapshot.polys.length} hotspots on the map today)\n`,
);

// What the features do not carry — each direction's way round, its name and
// its route's two end hotspots — from the published index, through the page's
// own reader (overviews as the lines: only whether one is drawn is asked).
const published = await page.evaluate(() =>
  import('/src/features/routes/published/fetch-index.ts')
    .then((f) => f.fetchIndex())
    .catch(() => null),
);
const fileDirections = published?.directions ?? [];
/**
 * The directions of loops: a loop's trip leaves from its tip and comes back
 * there, with no two ends to check. loop-test holds them; the checks here
 * that want a route's two ends pick a route that has them.
 */
const loopIds = new Set(fileDirections.filter((v) => v.route?.isLoop === true).map((v) => v.id));
/**
 * The directions of routes with no fare rule (fares.ts hasFareRule: a jeepney's
 * alone today), such as a point-to-point bus: their trip shows no pesos, so the
 * checks of a trip's pill and fare tile pick a route that has them.
 */
const farelessIds = new Set(
  await page.evaluate(
    (directions) =>
      import('/src/features/routes/model/fares.ts').then(({ hasFareRule }) =>
        directions.filter((v) => !hasFareRule(v.mode)).map((v) => v.id),
      ),
    fileDirections.map((v) => ({ id: v.id, mode: v.route?.mode })),
  ),
);
/**
 * What a trip on direction `id` lists behind its ‹ when it was opened on its
 * own (the owner's ask, 2026-09-29): the directions, drawn and the same way
 * round, of its route and of every route sharing its head or its tail — its
 * own included. The trip has ‹ when that is more than itself.
 */
const fanOf = (id) => {
  const v = fileDirections.find((d) => d.id === id);
  if (!v) return [];
  const { headHotspotId: head, tailHotspotId: tail } = v.route;
  const shares = (d) =>
    d.routeId === v.routeId ||
    (!!head && d.route.headHotspotId === head) ||
    (!!tail && d.route.tailHotspotId === tail);
  return fileDirections.filter(
    (d) => d.reversed === v.reversed && (d.shape?.coordinates?.length ?? 0) > 1 && shares(d),
  );
};

/** Every tap below is made at this zoom, so the map keeps one scale throughout. */
const ZOOM = 16;

// --------------------------------------------------------------- page helpers
const canvasBox = () => page.locator('canvas.maplibregl-canvas').boundingBox();
// A jump is done when the map is idle again, not half a second later: on a
// GitHub runner the zoom-18 tiles were still arriving 500 ms after the jump,
// and a tap then hit a route beside a hotspot instead of the hotspot (the
// second CI run, 2026-09-25). The desktop suite has always waited for `idle`.
const jumpTo = async (p, center, zoom = ZOOM) => {
  await p.evaluate(
    ([c, z]) =>
      new Promise((r) => {
        const m = window.__map;
        m.jumpTo({ center: c, zoom: z });
        m.once('idle', r);
        setTimeout(r, 10000);
      }),
    [center, zoom],
  );
  await mapIdle(p);
};
// A jump leaves the place in the map's middle, which the sheet at Middle
// covers: moved up into the quarter of the map above it, where a finger can tap.
const jumpAboveSheet = async (p, center) => {
  await jumpTo(p, center);
  await p.evaluate((at) => {
    const m = window.__map;
    m.panBy([0, m.project(at).y - m.getContainer().clientHeight / 4], { duration: 0 });
  }, center);
  await mapIdle(p);
};
/**
 * How many features `layer` draws at canvas point `xy` once it draws any,
 * polled for up to `ms`; 0 if it never does, -1 if there is no such layer.
 * A tap is made on what is on the screen: on a GitHub runner, a phone at
 * three device pixels per CSS pixel draws so slowly that a hotspot's box was
 * not there yet when the finger came, and the tap hit only the route beside
 * it (the third CI run, 2026-09-25).
 */
const drawnAt = (layer, xy, ms = 10000) =>
  until(
    () =>
      page.evaluate(
        ([l, q]) =>
          window.__map.getLayer(l)
            ? window.__map.queryRenderedFeatures(q, { layers: [l] }).length
            : -1,
        [layer, xy],
      ),
    (n) => n !== 0,
    ms,
  );
const project = (p, lngLat) =>
  p.evaluate((c) => {
    const q = window.__map.project(c);
    return [q.x, q.y];
  }, lngLat);
const unproject = (p, xy) =>
  p.evaluate((q) => {
    const c = window.__map.unproject(q);
    return [c.lng, c.lat];
  }, xy);
/**
 * Unit vector perpendicular to the line a→b, in screen pixels, pointing to the
 * side where a step of `away` px ends up farthest from the whole of `line`.
 * At a bend the route's own next stretch can lie a few pixels off one side, so
 * "20 px beside the line" would really be 10 px from it there.
 */
const perpendicular = (p, a, bPt, line = [a, bPt], away = 20) =>
  p.evaluate(
    ([u, v, coords, step]) => {
      const m = window.__map;
      const s = m.project(u);
      const t = m.project(v);
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const len = Math.hypot(dx, dy) || 1;
      const n = [-dy / len, dx / len];
      const pts = coords.map((c) => m.project(c));
      const segD = (q, e, f) => {
        const ex = f.x - e.x,
          ey = f.y - e.y;
        const k = Math.max(
          0,
          Math.min(1, ((q.x - e.x) * ex + (q.y - e.y) * ey) / (ex * ex + ey * ey || 1)),
        );
        return Math.hypot(q.x - e.x - k * ex, q.y - e.y - k * ey);
      };
      const clearance = (sign) => {
        const q = { x: s.x + n[0] * step * sign, y: s.y + n[1] * step * sign };
        let d = Infinity;
        for (let i = 0; i + 1 < pts.length; i++) d = Math.min(d, segD(q, pts[i], pts[i + 1]));
        return d;
      };
      const sign = clearance(1) >= clearance(-1) ? 1 : -1;
      return [n[0] * sign, n[1] * sign];
    },
    [a, bPt, line, away],
  );

const card = () => page.locator('[data-testid="card"]');
// Every sheet locator is scoped to the card — never to the page — so the
// route list, which is `chooser`, never answers for it. Every card is the
// one BottomSheet since the owner's ask of 2026-09-30 ("make it a universal
// rule as component"), a hotspot's and a trip's alike, with its handle,
// `dock-handle` — a trip's card with its rail of stops in it
// (TimelineRouteDetailCard, 2026-09-29), named for its direction, "Tala → Novaliches".
const handle = () => card().locator('button[data-testid="dock-handle"]');
const trip = () => card().locator('[data-testid="trip"]');
const tripLabel = async () =>
  (await trip().count()) ? ((await card().first().getAttribute('aria-label')) ?? '') : '';
const tripRow = async (id) => {
  const name = card().locator(`[data-testid="${id}"] [data-part="name"]`);
  return (await name.count()) ? (await name.first().innerText()).replace(/\s+/g, ' ').trim() : '';
};

/**
 * A trip card's own parts, on whichever trip is open: its Distance and
 * Expected fare tiles (the owner's 3778:3183), its hintuans folding into one
 * row that opens and folds again (a lone hintuan is shown as it is), and
 * ⇅ on its ends card turning it round. Run where a trip opens — a lone route's tap, a row
 * of the route list — as today's data allows.
 */
const tripChecks = async () => {
  // Two tiles under the card: the whole ride's length and pesos, as the app's
  // own sums give them on the published line (read from the dev server's
  // modules; a server that cannot serve them skips the check). The pesos
  // left the rail for their tile with this set.
  const [tripId] = (await litIds(page)) ?? [];
  const want = await page.evaluate(async (id) => {
    try {
      const [{ rideFare }, { kmLabel, lineLength }, { directionLine }] = await Promise.all([
        import('/src/features/routes/model/fares.ts'),
        import('/src/shared/utils/geo.ts'),
        import('/src/features/routes/model/routes.ts'),
      ]);
      // The direction with its full line, as the page reads them (map-file.ts).
      const { fetchIndex } = await import('/src/features/routes/published/fetch-index.ts');
      const { fetchLine } = await import('/src/features/routes/published/fetch-line.ts');
      const found = (await fetchIndex()).directions.find((x) => x.id === id);
      const v = found && { ...found, shape: (await fetchLine(id)) ?? found.shape };
      const metres = v && lineLength(directionLine(v));
      return v ? { km: kmLabel(metres), fare: rideFare(v.route?.mode, metres) ?? null } : null;
    } catch {
      return null;
    }
  }, tripId);
  const tile = async (id) => {
    const t = card().locator(`[data-testid="${id}"]`);
    return (await t.count()) ? (await t.first().innerText()).trim() : null;
  };
  const [km, fare] = [await tile('trip-km'), await tile('trip-fare')];
  if (!want)
    skip(
      '  its tiles: the Distance and Expected fare of the whole ride',
      'the sums cannot be read from this server',
    );
  else
    check(
      '  its tiles: the Distance and Expected fare of the whole ride',
      km === want.km && fare === want.fare,
      `"${km}" / "${fare}", the sums "${want.km}" / "${want.fare}"`,
    );

  // The stops are reached at full height, as a person reaches them: at Low the sheet shows its
  // top 80 px, and raised a third (its top near 430 of 844) its stops sit at y 847–1,027, below
  // the screen. The sheet is translated, not scrolled, so nothing but its handle brings them up.
  // Pulled to full by the handle when a stop is below the screen (a trip opened from the list at
  // 95% shows them all already), then let down again as it opened when the trip is done with.
  const openedAt = await sheetState();
  const isAStopBelowTheScreen = () =>
    card()
      .first()
      .evaluate((c) =>
        [...c.querySelectorAll('[data-testid="trip-hintuan"]')].some(
          (e) => e.getBoundingClientRect().bottom > innerHeight,
        ),
      );
  if ((await isAStopBelowTheScreen()) && !(await handleTo('full')))
    check(
      '  the card rises to full by its handle, to reach its stops',
      false,
      `data-snap=${await sheetState()}`,
    );

  // Every stop shows, and nothing folds: every hintuan's row is drawn and
  // in a keyboard's reach, and there is no View more.
  {
    const stops = await card()
      .first()
      .evaluate((c) => ({
        rows: c.querySelectorAll('[data-testid="trip-hintuan"]').length,
        inert: c.querySelectorAll('[data-testid="trip"] [inert]').length,
        fold: c.querySelectorAll('[data-testid="trip-view-more"]').length,
      }));
    check(
      '  every stop shows, in reach, and nothing folds',
      stops.inert === 0 && stops.fold === 0,
      JSON.stringify(stops),
    );
  }

  // A hintuan's row picks it (the owner's Timeline State=Selected,
  // 2026-09-29): that one row Selected, its name set heavier, a pill with the pesos
  // from where the trip leaves to there — the app's own sums over rideCut's
  // metres on the published line — on the surface's secondary fill; the
  // tiles keep the whole ride; the route left whole on the map, and a circle
  // popping up at the hintuan (the owner's ask of 2026-09-30: "now I don't
  // want to cut the route") ringed in the line's colour, the card's surface
  // (his call of 2026-10-12, "match the line"; the trip's rail colour until
  // then), no get-off circles,
  // the camera gliding the hintuan clear of the card, and no padding left
  // on the map; a second tap lets it go, circle and all. Checked
  // once, on the first trip with a hintuan; it is picked again after, for
  // ⇅, or leaving the trip, to let go.
  let picked = false;
  const rows = card().locator('[data-testid="trip-hintuan"]');
  // A build without ride picking (VITE_RIDE_PICKS) lists the stops as plain rows, with no button
  // to pick one: nothing here to check.
  const isRidePicking = (await card().locator('[data-testid="trip-hintuan-pick"]').count()) > 0;
  let didPicks = false;
  if (!picksChecked && (await rows.count()) > 0 && !isRidePicking) {
    picksChecked = true;
    // Let down after as if the picks ran, so the checks after this trip read the sheet where
    // they always have.
    didPicks = true;
    console.log(
      'SKIP  a hintuan row picks it, Set as start and an end, the ends picked: picking is off in this build (VITE_RIDE_PICKS)',
    );
  } else if (!picksChecked && (await rows.count()) > 0) {
    picksChecked = true;
    didPicks = true;
    const pickedIndex = Math.floor(((await rows.count()) - 1) / 2);
    const row = rows.nth(pickedIndex);
    const rowId = await row.getAttribute('data-hintuan');
    const pickWant = await page.evaluate(
      async ([id, rowId]) => {
        try {
          const [{ rideFare }, { rideCut }, { kmLabel }] = await Promise.all([
            import('/src/features/routes/model/fares.ts'),
            import('/src/features/routes/model/ride.ts'),
            import('/src/shared/utils/geo.ts'),
          ]);
          const { fetchIndex } = await import('/src/features/routes/published/fetch-index.ts');
          const { fetchLine } = await import('/src/features/routes/published/fetch-line.ts');
          const m = await fetchIndex();
          const found = m.directions.find((x) => x.id === id);
          const v = found && { ...found, shape: (await fetchLine(id)) ?? found.shape };
          const cut = v && rideCut(v, m.hotspots, rowId);
          return cut
            ? {
                fare: rideFare(v.route?.mode, cut.metres) ?? null,
                km: kmLabel(cut.metres),
                at: cut.at,
              }
            : null;
        } catch {
          return null;
        }
      },
      [tripId, rowId],
    );
    const pickButton = row.locator('button[data-testid="trip-hintuan-pick"]');
    const isPicked = async () => (await row.getAttribute('data-state')) === 'selected';
    await pickButton.scrollIntoViewIfNeeded();
    await page
      .waitForFunction(() => !window.__map.isMoving(), null, { timeout: 3000 })
      .catch(() => {});
    // A trip opening no longer fits its route (the owner, 2026-10-21), so the
    // pick starts from out at zoom 12, where the whole route used to leave it.
    await page.evaluate(() => {
      window.__map.jumpTo({ zoom: 12 });
    });
    await page
      .waitForFunction(() => !window.__map.isMoving(), null, { timeout: 3000 })
      .catch(() => {});
    const camBeforePick = await camNow();
    await buttonTap(pickButton, isPicked);
    const selectedRows = await card()
      .locator('[data-testid="trip-hintuan"][data-state="selected"]')
      .count();
    check(
      '  a hintuan row picks it: that one row Selected',
      (await isPicked()) &&
        selectedRows === 1 &&
        (await pickButton.getAttribute('aria-pressed')) === 'true',
      `${selectedRows} Selected`,
    );
    // The ride runs from the origin to the picked row, which ends it (SelectedBottom); the stops
    // after it stand alone, their dots without the rail (RouteStopsTimeline, T4).
    const rails = await card().evaluate((c) => {
      const railOf = (el) => el?.querySelector('[data-rail]')?.getAttribute('data-rail') ?? null;
      const rows = [...c.querySelectorAll('[data-testid="trip-hintuan"]')];
      const at = rows.findIndex((r) => r.getAttribute('data-state') === 'selected');
      return {
        origin: railOf(c.querySelector('[data-testid="trip-origin"]')),
        before: rows.slice(0, at).map(railOf),
        picked: railOf(rows[at]),
        after: rows.slice(at + 1).map(railOf),
        destination: railOf(c.querySelector('[data-testid="trip-destination"]')),
      };
    });
    check(
      '  the rail runs from the origin to the pick, the stops after it standing alone',
      rails.origin === 'below' &&
        rails.before.every((r) => r === 'through') &&
        rails.picked === 'above' &&
        rails.after.every((r) => r === 'disconnected') &&
        rails.destination === 'disconnected',
      JSON.stringify(rails),
    );
    const pill = row.locator('[data-testid="trip-hintuan-fare"]');
    // On a train the station's code comes first, "GL04 ₱20" (the owner,
    // 2026-10-13): the pesos are their own half then.
    const pesosOf = async (p) =>
      (await p.locator('[data-part="pesos"]').count())
        ? (await p.locator('[data-part="pesos"]').innerText()).trim()
        : (await p.innerText()).trim();
    const pillText = (await pill.count()) ? await pesosOf(pill.first()) : null;
    // The pill and the fare tile both hold the pesos to there (the owner,
    // 2026-09-30: the pill's "Calculated Fare" gave way to its value).
    const pickedTile = await tile('trip-fare');
    if (!pickWant)
      skip(
        '  its pill and the fare tile the pesos from where the trip leaves to there',
        'the sums cannot be read from this server',
      );
    else if (pickWant.fare == null)
      skip(
        '  its pill and the fare tile the pesos from where the trip leaves to there',
        'an unpriced route shows no pill',
      );
    else
      check(
        '  its pill and the fare tile the pesos from where the trip leaves to there',
        pillText === pickWant.fare && pickedTile === pickWant.fare,
        `pill "${pillText}"; tile "${pickedTile}", the sums "${pickWant.fare}"`,
      );
    const colours = await page.evaluate(() => {
      // A train's pill is two halves (RouteTripLineDetailPill's Two), the surface between them:
      // the colours are the pesos' half's. On the sheet's surface, every livery's pill is the
      // secondary surface with Text/primary words (STOP_PILL).
      const fare = document.querySelector('[data-testid="trip-hintuan-fare"]');
      const pill = fare?.querySelector('[data-part="pesos"]') ?? fare;
      if (!pill) return null;
      const p = getComputedStyle(pill);
      const probe = document.createElement('i');
      probe.style.backgroundColor = 'var(--bg-surface-secondary)';
      probe.style.color = 'var(--text-primary)';
      document.body.append(probe);
      const want = getComputedStyle(probe);
      const seen = {
        isWorn: p.backgroundColor === want.backgroundColor && p.color === want.color,
        detail: `${p.color} on ${p.backgroundColor}; asked ${want.color} on ${want.backgroundColor}`,
      };
      probe.remove();
      return seen;
    });
    if (pickWant && pickWant.fare == null)
      skip("  on the surface's secondary fill, in Text/primary", 'an unpriced route shows no pill');
    else
      check(
        "  on the surface's secondary fill, in Text/primary",
        !!colours?.isWorn,
        colours?.detail ?? 'no pill',
      );
    // The Distance tile follows the pick too (the owner, 2026-09-30).
    const pickedKm = await tile('trip-km');
    if (!pickWant)
      skip(
        '  the Distance tile the ride from where the trip leaves to there',
        'the sums cannot be read from this server',
      );
    else
      check(
        '  the Distance tile the ride from where the trip leaves to there',
        pickedKm === pickWant.km,
        `"${pickedKm}", the sums "${pickWant.km}"`,
      );
    // The glide starts after the card has drawn the pick: let it start, then end.
    await cardsSettled(page);
    const drawn = await page.evaluate(async (at) => {
      const m = window.__map;
      const pins = [...document.querySelectorAll('[data-testid="hintuan-pin"]')];
      const pin = pins[0];
      const trip = document.querySelector('[data-testid="trip"]');
      // The circle: the first thing in the pin, its name beside it (HintuanLabel).
      const ring = pin?.querySelector(':scope > span:first-child');
      // The circle's centre on the screen, and the hintuan's.
      const r = pin?.getBoundingClientRect();
      const c = m.getCanvas().getBoundingClientRect();
      const q = at && m.project(at);
      // A road ride's rest: a line at rest, Map/RouteLine/surface-default (its own variable; the
      // @theme inline alias is never emitted), as the DOM computes it, oklch as the
      // rings come: what the dots along the rest wear.
      const probe = document.createElement('span');
      // A train's is its line's, Map/Rail/<line>/surface-pale (2026-10-13).
      const livery = trip?.dataset.livery ?? '';
      probe.style.backgroundColor = /rail-way/.test(livery)
        ? `var(--map-rail-${livery}-surface-pale)`
        : livery === 'ferry'
          ? 'var(--map-ferry-surface-pale)'
          : 'var(--map-route-line-surface-default)';
      document.body.append(probe);
      const cardPale = getComputedStyle(probe).backgroundColor;
      // The line's colour is a card's surface in the trip's livery (livery-line.ts): read off
      // CARD_SURFACE's classes: the colour the map draws the trip's line in.
      const { CARD_SURFACE } = await import('/src/features/routes/cards/livery-card.ts');
      probe.style.backgroundColor = '';
      probe.className = CARD_SURFACE[livery] ?? '';
      const lineColour = getComputedStyle(probe).backgroundColor;
      probe.className = '';
      // The picked end's circle is End's red, whatever the line.
      probe.style.backgroundColor = 'var(--card-red-surface)';
      const endRed = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return {
        lit: (await window.__lit('saved-routes')) ?? [],
        rest: ((await window.__src('ride-rest'))?.features ?? []).length,
        restLayer: !!m.getLayer('ride-rest-line'),
        restColour: m.getLayer('ride-rest-line')
          ? m.getPaintProperty('ride-rest-line', 'line-color')
          : null,
        // The dots along the line (StationLabels): along the rest past the pick, or before it, and their rings.
        stations: [...document.querySelectorAll('[data-testid="station-label"]')].map((e) => ({
          paled: e.hasAttribute('data-paled'),
          ring: getComputedStyle(e.querySelector('.station-label-tap > span:first-child'))
            .backgroundColor,
          // The name's opacity, 0.6 outside the ride (Label's Unselected); null, the dot alone.
          fade: e.querySelector('[data-part="label"]')
            ? getComputedStyle(e.querySelector('[data-part="label"]')).opacity
            : null,
        })),
        pins: pins.length,
        off:
          r && q
            ? Math.hypot(
                r.left + r.width / 2 - (c.left + q.x),
                r.top + r.height / 2 - (c.top + q.y),
              )
            : null,
        ring: ring ? getComputedStyle(ring).backgroundColor : null,
        line: lineColour,
        pale: cardPale,
        endRed,
        livery: pin?.dataset.livery ?? null,
        marks: pin?.dataset.marks ?? null,
        tripLivery: trip?.dataset.livery ?? null,
        taps: pin ? getComputedStyle(pin).pointerEvents : null,
        dots: document.querySelectorAll('[data-testid="ride-dot"]').length,
        padding: Object.values(m.getPadding()).every((v) => v === 0),
      };
    }, pickWant?.at ?? null);
    // The rest of the line past the pick, over the lit line in the card's
    // surface-pale (the owner's ask, 2026-10-12).
    const pale = LOOKS?.byLivery[drawn.tripLivery]?.pale ?? null;
    check(
      "  the map: the trip still lit and whole — the rest past the hintuan drawn over it in the card's surface-pale",
      drawn.lit.length === 1 &&
        drawn.lit[0] === tripId &&
        drawn.rest === 1 &&
        drawn.restLayer &&
        (!LOOKS || drawn.restColour === pale),
      `${drawn.lit.length} lit; ${drawn.rest} stretch(es) at rest, the rest layer ${drawn.restLayer ? 'there' : 'never added'}, in ${drawn.restColour}${LOOKS ? ` (the ${drawn.tripLivery} card's pale ${pale})` : ''}`,
    );
    check(
      "  a circle pops up at the hintuan, ringed in End's red, taking no taps",
      drawn.pins === 1 &&
        (!pickWant || (drawn.off !== null && drawn.off < 2)) &&
        drawn.livery === drawn.tripLivery &&
        drawn.marks === 'end' &&
        !!drawn.ring &&
        drawn.ring === drawn.endRed &&
        drawn.taps === 'none',
      `${drawn.pins} circle(s), ${drawn.off === null ? 'not measured' : Math.round(drawn.off) + ' px'} off the hintuan, marking the ${drawn.marks}; ${drawn.livery} line, ring ${drawn.ring}, End's red ${drawn.endRed}; pointer-events ${drawn.taps}`,
    );
    // The dots along the rest ring in its pale, the ones before the pick in
    // the line's colour (the owner's ask, 2026-10-12, with a screenshot of
    // them still in the line's): the rows after the picked one.
    const paled = drawn.stations.filter((s) => s.paled);
    const before = drawn.stations.filter((s) => !s.paled);
    const rowsAfter = (await rows.count()) - 1 - pickedIndex;
    const rings = (dots) => [...new Set(dots.map((s) => s.ring))].join(', ') || 'none';
    check(
      "  the dots along the rest ringed in the card's pale, the ones before the hintuan in the line's colour",
      paled.length === rowsAfter &&
        before.length === pickedIndex &&
        drawn.pale !== 'rgba(0, 0, 0, 0)' &&
        drawn.pale !== drawn.line &&
        paled.every((s) => s.ring === drawn.pale) &&
        before.every((s) => s.ring === drawn.line),
      `${paled.length} dot(s) along the rest for ${rowsAfter} row(s) past the pick, ringed ${rings(paled)} (the pale ${drawn.pale}); ${before.length} before it for ${pickedIndex} row(s), ringed ${rings(before)} (the line ${drawn.line})`,
    );
    // Their names: outside the ride the Label's Unselected, at 60%, inside it
    // whole (Figma 4200:13645, the owner's ask of 2026-10-16).
    const fades = (names) =>
      [...new Set(names.filter((s) => s.fade !== null).map((s) => s.fade))].join(', ') ||
      'none shown';
    check(
      '  the names along the rest at 60%, the ones before the hintuan whole',
      // At least one name read on each side, so a name that stops showing fails it.
      paled.some((s) => s.fade !== null) &&
        before.some((s) => s.fade !== null) &&
        paled.every((s) => s.fade === null || s.fade === '0.6') &&
        before.every((s) => s.fade === null || s.fade === '1'),
      `${fades(paled)} along the rest, ${fades(before)} before it`,
    );
    check('  no get-off circles on the public map', drawn.dots === 0, `${drawn.dots}`);
    // Beside the circle, the hintuan's name on End's red, a white End pill
    // before it (HintuanLabel's HintuanEnd, Figma 4068:4791): 8px right of it
    // and centred on it, in Livvic.
    const rowName = (
      await pickButton.evaluate((b) => b.querySelector('[data-part="name"]').textContent)
    ).trim();
    const title = await page.evaluate(() => {
      // The label: on a train line, End and the station's code in a pill of
      // their own before the name's pill (CodeSignEnd); else End's pill in it.
      const name = document.querySelector('[data-testid="hintuan-pin"] [data-part="hintuan-name"]');
      const label = name?.querySelector('[data-part="label"]');
      const t = name?.querySelector('[data-part="name"]');
      const pin = document.querySelector('[data-testid="hintuan-pin"]');
      if (!name || !label || !t || !pin) return null;
      // What End wears on every line: its red, with white words.
      const probe = document.createElement('i');
      probe.style.backgroundColor = 'var(--card-red-surface)';
      probe.style.color = 'var(--content-inverse)';
      document.body.append(probe);
      const want = getComputedStyle(probe);
      const [a, b] = [label.getBoundingClientRect(), pin.getBoundingClientRect()];
      const ts = getComputedStyle(t);
      const seen = {
        // The name alone: a screen reader's "End, " sits before it, unseen.
        text: t.querySelector('[data-part="words"]')?.textContent.trim(),
        colours: ts.backgroundColor === want.backgroundColor && ts.color === want.color,
        font: ts.fontFamily.startsWith('"Livvic"') || ts.fontFamily.startsWith('Livvic'),
        detail: `${ts.color} on ${ts.backgroundColor}; End's red ${want.color} on ${want.backgroundColor}; ${ts.fontFamily}`,
        icon:
          !!name.querySelector('[data-part="end"]') && !name.querySelector('[data-part="start"]'),
        code: name.querySelector('[data-part="code"]')?.textContent.trim() ?? null,
        gap: a.left - b.right,
        drop: a.top + a.height / 2 - (b.top + b.height / 2),
      };
      probe.remove();
      return seen;
    });
    check(
      "  its name beside the circle, on End's red in Livvic, End's pill before it",
      !!title &&
        title.text === rowName &&
        title.colours &&
        title.font &&
        title.icon &&
        Math.abs(title.gap - 8) < 1.5 &&
        Math.abs(title.drop) < 1.5,
      title
        ? `"${title.text}" for "${rowName}"${title.code ? `, code ${title.code}` : ''}; ${title.detail}; End ${title.icon}; ${title.gap.toFixed(1)} px right, ${title.drop.toFixed(1)} px low`
        : 'no title',
    );
    // The ride ends at the hintuan now (HintuanLabel's HintuanEnd, Figma
    // 4068:4791): End's pill before its name, and the route's own tail keeps
    // its name without one; Start's pill still before the start.
    const words = await page.evaluate(() => {
      const iconIn = (sel) => {
        const pill = document.querySelector(sel);
        if (!pill) return null;
        if (pill.querySelector('[data-part="start"]')) return 'Start';
        return pill.querySelector('[data-part="end"]') ? 'End' : 'none';
      };
      return {
        pin: iconIn('[data-testid="hintuan-pin"] [data-part="hintuan-name"]'),
        head: iconIn('[data-testid="end-title"][data-end="head"] [data-part="name"]'),
        tail: iconIn('[data-testid="end-title"][data-end="tail"] [data-part="name"]'),
        tails: document.querySelectorAll(
          '[data-testid="end-title"][data-end="tail"] [data-part="name"]',
        ).length,
      };
    });
    check(
      "  End's pill before its name, Start's pill still before the start, the tail named without one",
      words.pin === 'End' && words.head === 'Start' && words.tail === 'none' && words.tails > 0,
      `pin "${words.pin}"; head "${words.head}", tail "${words.tail}", ${words.tails} tail name(s)`,
    );
    if (pickWant) {
      const where = await page.evaluate((at) => {
        const m = window.__map;
        const c = m.getCanvas().getBoundingClientRect();
        const q = m.project(at);
        const d = document.querySelector('[data-testid="card"]').getBoundingClientRect();
        return {
          x: c.left + q.x,
          y: c.top + q.y,
          left: c.left,
          right: c.right,
          top: c.top,
          // The camera frames a sheet raised past 55% of the map as if it stood at 55% (framedAt).
          floor: Math.max(d.top, c.bottom - Math.round(c.height * 0.55)),
        };
      }, pickWant.at);
      const snapAtPick = await sheetState();
      check(
        '  picked at full height, the card stays there, the camera gliding it into the map above the framed height',
        snapAtPick === 'full' &&
          where.y > where.top + 16 &&
          where.y < where.floor - 16 &&
          where.x > where.left + 16 &&
          where.x < where.right - 16,
        `data-snap=${snapAtPick}; at ${Math.round(where.x)},${Math.round(where.y)}; the map ${Math.round(where.top)}–${Math.round(where.floor)} above the framed height`,
      );
    }
    check('  and leaves no padding on the map for later moves', drawn.padding);
    // The pick does not zoom (the owner, 2026-10-21); a second tap takes the
    // camera back where it was before the pick (the owner's ask, 2026-10-02).
    if (pickWant) {
      const kept = await camNow();
      check(
        '  the zoom stays where the commuter had it',
        Math.abs(kept.zoom - camBeforePick.zoom) < 0.01,
        `zoom ${kept.zoom.toFixed(2)}, was ${camBeforePick.zoom.toFixed(2)}`,
      );
    }
    await buttonTap(pickButton, async () => !(await isPicked()));
    await cardsSettled(page);
    const camAfterLetGo = await camNow();
    check(
      '  and let go, the camera back where it was before the pick',
      Math.abs(camAfterLetGo.zoom - camBeforePick.zoom) < 0.01 &&
        Math.abs(camAfterLetGo.lng - camBeforePick.lng) < 1e-6 &&
        Math.abs(camAfterLetGo.lat - camBeforePick.lat) < 1e-6,
      JSON.stringify({ camBeforePick, camAfterLetGo }),
    );
    // Closer in than 300 m on the scale bar, a pick keeps the commuter's zoom
    // (the owner's ask, 2026-10-13: "if it's below 300m and tapped the
    // hintuan, don't zoom out, remain where the user camera was"): with the
    // hintuan in view above the card the camera stays put; off the screen,
    // it slides there at the same zoom (his pick, the same day).
    if (pickWant) {
      const settle = async () => {
        await cardsSettled(page);
      };
      // 150 m on the scale bar, the hintuan halfway up the map above the card, or a screen and a half aside.
      // Done when the map is idle again, as jumpTo is: on a slow machine the
      // page was still drawing the new view's tiles when the pick was tapped,
      // its button gave no box in time, and no pick was made at all (a local
      // run under load, 2026-10-16).
      const closeIn = async (offScreen) => {
        await page.evaluate(
          async ({ at, offScreen }) => {
            const m = window.__map;
            const { zoomForScale } = await import('/src/shared/utils/geo.ts');
            const idle = new Promise((r) => {
              m.once('idle', r);
              setTimeout(r, 10000);
            });
            m.jumpTo({ center: at, zoom: zoomForScale(150, at[1]) });
            const c = m.getCanvas().getBoundingClientRect();
            const d = document.querySelector('[data-testid="card"]').getBoundingClientRect();
            // Halfway up the map above the framed height (framedAt): the card is at full.
            const floor = Math.max(d.top, c.bottom - Math.round(c.height * 0.55));
            const wantY = (Math.min(floor, c.bottom) - c.top) / 2;
            m.panBy(offScreen ? [1.5 * c.width, 0] : [0, m.project(at).y - wantY], {
              duration: 0,
            });
            await idle;
          },
          { at: pickWant.at, offScreen },
        );
        return camNow();
      };
      const inView = await closeIn(false);
      await buttonTap(pickButton, isPicked);
      await settle();
      const stayed = await camNow();
      check(
        '  closer in than 300 m on the scale bar, a hintuan in view above the framed height: the camera stays where it was',
        (await isPicked()) &&
          Math.abs(stayed.zoom - inView.zoom) < 0.01 &&
          Math.abs(stayed.lng - inView.lng) < 1e-6 &&
          Math.abs(stayed.lat - inView.lat) < 1e-6,
        JSON.stringify({ inView, stayed }),
      );
      await buttonTap(pickButton, async () => !(await isPicked()));
      await settle();
      const away = await closeIn(true);
      await buttonTap(pickButton, isPicked);
      await settle();
      const slid = await page.evaluate((at) => {
        const m = window.__map;
        const c = m.getCanvas().getBoundingClientRect();
        const q = m.project(at);
        const d = document.querySelector('[data-testid="card"]').getBoundingClientRect();
        return {
          zoom: m.getZoom(),
          x: c.left + q.x,
          y: c.top + q.y,
          left: c.left,
          right: c.right,
          top: c.top,
          floor: Math.max(d.top, c.bottom - Math.round(c.height * 0.55)),
        };
      }, pickWant.at);
      check(
        '  and off the screen, it slides into view above the framed height at the same zoom',
        (await isPicked()) &&
          Math.abs(slid.zoom - away.zoom) < 0.01 &&
          slid.y > slid.top + 16 &&
          slid.y < slid.floor - 16 &&
          slid.x > slid.left + 16 &&
          slid.x < slid.right - 16,
        `zoom ${slid.zoom.toFixed(2)}, was ${away.zoom.toFixed(2)}; at ${Math.round(slid.x)},${Math.round(slid.y)}, the map ${Math.round(slid.top)}–${Math.round(slid.floor)} above the framed height`,
      );
      await buttonTap(pickButton, async () => !(await isPicked()));
      await settle();
      // Back where the first pick began, for the checks after.
      await page.evaluate((cam) => {
        window.__map.jumpTo({ center: [cam.lng, cam.lat], zoom: cam.zoom });
      }, camBeforePick);
    }
    const letGo = await page.evaluate(async () => ({
      pins: document.querySelectorAll('[data-testid="hintuan-pin"]').length,
      paled: document.querySelectorAll('[data-testid="station-label"][data-paled]').length,
      lit: (await window.__lit('saved-routes')) ?? [],
    }));
    check(
      '  a second tap lets it go: no pill, no circle, no dot along a rest, the trip still lit, both tiles the whole ride again',
      !(await isPicked()) &&
        (await pill.count()) === 0 &&
        letGo.pins === 0 &&
        letGo.paled === 0 &&
        letGo.lit.length === 1 &&
        (await tile('trip-fare')) === fare &&
        (await tile('trip-km')) === km,
      `${letGo.pins} circle(s), ${letGo.paled} dot(s) along a rest, ${letGo.lit.length} lit; tiles "${await tile('trip-km')}", "${await tile('trip-fare')}", the whole "${km}", "${fare}"`,
    );
    // A ride's start and end (the owner's TimelineRouteDetail, 2026-10-15):
    // Set as start under a picked row makes it the start, S before it; a row
    // after it tapped is the end, E before it. The Distance tile reads the
    // ride between them, the app's own sums over rideSpan on the published
    // line, and so does the fare tile on a jeep; on the map, the start's
    // circle and the end's sit where the ride starts and ends, the line
    // before and after it pale. × Remove as start, then a second tap on the
    // end, let both go.
    {
      const count = await rows.count();
      const startIndex = Math.floor((count - 1) / 3);
      const endIndex = Math.min(count - 1, startIndex + Math.max(1, Math.floor(count / 3)));
      if (count < 2 || endIndex <= startIndex) {
        skip(
          '  Set as start, then an end: the tiles and the map read the ride between them',
          'fewer than two hintuans',
        );
      } else {
        const startRow = rows.nth(startIndex);
        const endRow = rows.nth(endIndex);
        const ids = [
          await startRow.getAttribute('data-hintuan'),
          await endRow.getAttribute('data-hintuan'),
        ];
        // The app's own sums over rideSpan on the published line, from a start
        // row to an end row of this trip.
        const rideOf = (startId, endId) =>
          page.evaluate(
            async ([id, startId, endId]) => {
              try {
                const [{ rideFare }, { rideSpan }, { kmLabel }] = await Promise.all([
                  import('/src/features/routes/model/fares.ts'),
                  import('/src/features/routes/model/ride.ts'),
                  import('/src/shared/utils/geo.ts'),
                ]);
                const { fetchIndex } =
                  await import('/src/features/routes/published/fetch-index.ts');
                const { fetchLine } = await import('/src/features/routes/published/fetch-line.ts');
                const m = await fetchIndex();
                const found = m.directions.find((x) => x.id === id);
                const v = found && { ...found, shape: (await fetchLine(id)) ?? found.shape };
                const span = v && rideSpan(v, m.hotspots, startId, endId);
                return span
                  ? {
                      km: kmLabel(span.metres),
                      fare: rideFare(v.route?.mode, span.metres) ?? null,
                      from: span.from,
                      at: span.at,
                    }
                  : null;
              } catch {
                return null;
              }
            },
            [tripId, startId, endId],
          );
        const rideWant = await rideOf(...ids);
        const isSelected = async (r) => (await r.getAttribute('data-state')) === 'selected';
        const startPick = startRow.locator('button[data-testid="trip-hintuan-pick"]');
        await startPick.scrollIntoViewIfNeeded();
        await buttonTap(startPick, () => isSelected(startRow));
        const setStart = card().getByRole('button', { name: 'Set as start' });
        await setStart.scrollIntoViewIfNeeded();
        await buttonTap(
          setStart,
          async () => (await startRow.locator('[data-part="start"]').count()) === 1,
        );
        // A start alone is no ride yet (the owner's Variant3, 2026-10-16:
        // "Nothing yet, just the S"): the tiles the whole trip's, its circle
        // there and the one S, the route's own ends named without theirs, and
        // no E on the card until an end is picked. The whole line is on the
        // pale, every other dot and end with it, their names at 60% (his ask
        // that night: "When start is only selected can you unselected all the
        // unselected hintuan/station or labels?, and the rouline would be in
        // pale").
        const alone = await page.evaluate(async () => {
          const stations = [...document.querySelectorAll('[data-testid="station-label"]')];
          const ends = [
            ...document.querySelectorAll('[data-testid="end-title"], [data-testid="end-circle"]'),
          ];
          const names = [
            ...document.querySelectorAll(
              '[data-testid="station-label"] [data-part="label"], [data-testid="end-title"] [data-part="name"]',
            ),
          ];
          return {
            pins: document.querySelectorAll('[data-testid="hintuan-pin"]').length,
            rest: ((await window.__src('ride-rest'))?.features ?? []).length,
            ends: document.querySelectorAll('[data-testid="trip"] [data-part="end"]').length,
            titleMarks: document.querySelectorAll(
              '[data-testid="end-title"] [data-part="start"], [data-testid="end-title"] [data-part="end"]',
            ).length,
            stations: stations.length,
            stationsPaled: stations.filter((e) => e.hasAttribute('data-paled')).length,
            endsPaled: ends.filter((e) => e.hasAttribute('data-paled')).length,
            endCount: ends.length,
            fades: [...new Set(names.map((e) => getComputedStyle(e).opacity))],
          };
        });
        const aloneKm = await tile('trip-km');
        check(
          '  a start alone is no ride yet: its circle, the tiles the whole trip, no E, the ends unmarked',
          alone.pins === 1 && alone.ends === 0 && alone.titleMarks === 0 && aloneKm === km,
          `${alone.pins} circle(s), ${alone.ends} E; ${alone.titleMarks} S or E on the route's ends; Distance "${aloneKm}", the whole "${km}"`,
        );
        check(
          '  and the whole line on the pale, every other dot and both ends with it, their names at 60%',
          alone.rest === 1 &&
            alone.stationsPaled === alone.stations &&
            alone.endCount === 2 &&
            alone.endsPaled === 2 &&
            alone.fades.every((o) => o === '0.6'),
          `${alone.rest} pale stretch(es); ${alone.stationsPaled} of ${alone.stations} dot(s) paled, ${alone.endsPaled} of ${alone.endCount} end(s); names at ${alone.fades.join(', ') || 'none shown'}`,
        );
        // Then the end, at full height where the stops are in reach: the sheet stays there, as
        // nothing moves the sheet for the commuter (README decision 17), and the camera takes in
        // the ride from the start to the end above the framed height (framedAt).
        const endPick = endRow.locator('button[data-testid="trip-hintuan-pick"]');
        await endPick.scrollIntoViewIfNeeded();
        await buttonTap(endPick, () => isSelected(endRow));
        await cardsSettled(page);
        const settled = await sheetState();
        const inView = await page.evaluate(() => {
          const c = window.__map.getCanvas().getBoundingClientRect();
          const sheetTop = document
            .querySelector('[data-testid="card"]')
            .getBoundingClientRect().top;
          const floor = Math.max(sheetTop, c.bottom - Math.round(c.height * 0.55));
          const pins = [...document.querySelectorAll('[data-testid="hintuan-pin"]')].map((p) =>
            p.getBoundingClientRect(),
          );
          return {
            pins: pins.length,
            clear: pins.every(
              (r) => r.top >= c.top && r.bottom <= floor && r.left >= c.left && r.right <= c.right,
            ),
          };
        });
        check(
          '  the end picked after a start at full height: the sheet stays at full, the ride taken in above the framed height',
          settled === 'full' && inView.pins === 2 && inView.clear,
          `data-snap=${settled}; ${inView.pins} circle(s), ${inView.clear ? 'both' : 'not both'} clear of the framed height`,
        );
        const rideKm = await tile('trip-km');
        const rideFareShown = await tile('trip-fare');
        const marks = await card().evaluate((c) => ({
          origin: !!c.querySelector('[data-testid="trip-origin"] [data-part="start"]'),
          destination: !!c.querySelector('[data-testid="trip-destination"] [data-part="end"]'),
          rows: [
            ...c.querySelectorAll(
              '[data-testid="trip-hintuan"] [data-part="start"], [data-testid="trip-hintuan"] [data-part="end"]',
            ),
          ].map(
            (e) => `${e.closest('[data-testid="trip-hintuan"]').dataset.hintuan}:${e.dataset.part}`,
          ),
        }));
        const onMap = await page.evaluate(
          ([from, at]) => {
            const m = window.__map;
            const c = m.getCanvas().getBoundingClientRect();
            const offOf = (el, lngLat) => {
              if (!el || !lngLat) return null;
              const r = el.getBoundingClientRect();
              const q = m.project(lngLat);
              return Math.hypot(
                r.left + r.width / 2 - (c.left + q.x),
                r.top + r.height / 2 - (c.top + q.y),
              );
            };
            return {
              pins: document.querySelectorAll('[data-testid="hintuan-pin"]').length,
              start: offOf(
                document.querySelector('[data-testid="hintuan-pin"][data-marks="start"]'),
                from,
              ),
              end: offOf(
                document.querySelector('[data-testid="hintuan-pin"][data-marks="end"]'),
                at,
              ),
            };
          },
          [rideWant?.from ?? null, rideWant?.at ?? null],
        );
        const fareOk = !rideWant || rideWant.fare == null || rideFareShown === rideWant.fare;
        check(
          '  Set as start, then an end: S and E on their rows, the tiles and the map read the ride between them',
          !!rideWant &&
            !marks.origin &&
            !marks.destination &&
            marks.rows.join() === `${ids[0]}:start,${ids[1]}:end` &&
            rideKm === rideWant.km &&
            fareOk &&
            onMap.pins === 2 &&
            onMap.start !== null &&
            onMap.start < 3 &&
            onMap.end !== null &&
            onMap.end < 3,
          `${JSON.stringify(marks)}; Distance "${rideKm}", the sums "${rideWant?.km}"; fare "${rideFareShown}", the sums "${rideWant?.fare}"; ${onMap.pins} circle(s), S ${onMap.start?.toFixed(1)} px off, E ${onMap.end?.toFixed(1)} px off`,
        );
        // The start's pill its station's code alone, no price; the end's its
        // code and the ride's pesos (the owner, 2026-10-16: "Pill on start is
        // only the codesign of that station, no price / the end should have
        // both price and codesign").
        const pesosIn = async (where) => {
          const pill = where.locator('[data-testid="trip-hintuan-fare"]').first();
          if (!(await pill.count())) return null;
          const half = pill.locator('[data-part="pesos"]');
          if (await half.count()) return (await half.innerText()).trim();
          return (await pill.getAttribute('data-part')) === 'code'
            ? null
            : (await pill.innerText()).trim();
        };
        const startPesos = await pesosIn(startRow);
        const endPesos = await pesosIn(endRow);
        check(
          "  the start's pill has no price, the end's the ride's pesos",
          startPesos === null &&
            (endPesos === null ? rideWant?.fare == null : endPesos === rideFareShown),
          `start's ${startPesos ?? 'none'}; end's ${endPesos ?? 'none'}; the fare tile ${rideFareShown}`,
        );
        // Another end picked, the sheet still at full: it stays, and the camera takes in the new
        // ride, though the map was moved away. Then the first end again, for what follows.
        const ANOTHER_END =
          '  another end picked at full height, the map moved away: the sheet stays, the new ride taken in above the framed height';
        const nextIndex = endIndex - 1 > startIndex ? endIndex - 1 : endIndex + 1;
        if (nextIndex >= count || (await sheetState()) !== 'full') {
          skip(
            ANOTHER_END,
            `no other row after the start, or the sheet not at full: data-snap=${await sheetState()}`,
          );
        } else {
          const nextRow = rows.nth(nextIndex);
          await page.evaluate(() => {
            const c = window.__map.getCenter();
            window.__map.jumpTo({ center: [c.lng + 0.3, c.lat + 0.3] });
          });
          const nextPick = nextRow.locator('button[data-testid="trip-hintuan-pick"]');
          await nextPick.scrollIntoViewIfNeeded();
          await buttonTap(nextPick, () => isSelected(nextRow));
          await cardsSettled(page);
          const again = await page.evaluate(() => {
            const c = window.__map.getCanvas().getBoundingClientRect();
            const sheetTop = document
              .querySelector('[data-testid="card"]')
              .getBoundingClientRect().top;
            const floor = Math.max(sheetTop, c.bottom - Math.round(c.height * 0.55));
            const pins = [...document.querySelectorAll('[data-testid="hintuan-pin"]')].map((p) =>
              p.getBoundingClientRect(),
            );
            return {
              pins: pins.length,
              clear: pins.every(
                (r) =>
                  r.top >= c.top && r.bottom <= floor && r.left >= c.left && r.right <= c.right,
              ),
            };
          });
          const stayed = await sheetState();
          check(
            ANOTHER_END,
            stayed === 'full' && again.pins === 2 && again.clear,
            `data-snap=${stayed}; ${again.pins} circle(s), ${again.clear ? 'both' : 'not both'} clear of the framed height`,
          );
          await endPick.scrollIntoViewIfNeeded();
          await buttonTap(endPick, () => isSelected(endRow));
        }
        const removeStart = card().getByRole('button', { name: 'Remove as start' });
        await removeStart.scrollIntoViewIfNeeded();
        await buttonTap(removeStart, async () => !(await isSelected(startRow)));
        await endPick.scrollIntoViewIfNeeded();
        await buttonTap(endPick, async () => !(await isSelected(endRow)));
        check(
          '  × Remove as start, then the end tapped again: the whole ride again',
          (await tile('trip-km')) === km &&
            (await page.evaluate(
              () => document.querySelectorAll('[data-testid="hintuan-pin"]').length,
            )) === 0,
          `Distance "${await tile('trip-km')}", the whole "${km}"`,
        );
        // A row above the start stays the end, the ride run back along the
        // trip's own line, its arrows flowing from the S to the E (the owner,
        // 2026-10-16: "reverse the arrow, dont' switch please"; his Variant5).
        // The later row is made the start, and the earlier one tapped: the
        // ride is the one the check above read, turned round.
        const BACK =
          '  a row above the start: the end, above it; the ride back on this line, its arrows S to E';
        if (!rideWant) {
          skip(BACK, 'no ride between the two rows on the published line');
        } else {
          await endPick.scrollIntoViewIfNeeded();
          await buttonTap(endPick, () => isSelected(endRow));
          const setStartAgain = card().getByRole('button', { name: 'Set as start' });
          await setStartAgain.scrollIntoViewIfNeeded();
          await buttonTap(
            setStartAgain,
            async () => (await endRow.locator('[data-part="start"]').count()) === 1,
          );
          await startPick.scrollIntoViewIfNeeded();
          await buttonTap(
            startPick,
            async () => (await startRow.locator('[data-part="end"]').count()) === 1,
          );
          await cardsSettled(page);
          const backMarks = await card().evaluate((c) =>
            [
              ...c.querySelectorAll(
                '[data-testid="trip-hintuan"] [data-part="start"], [data-testid="trip-hintuan"] [data-part="end"]',
              ),
            ].map(
              (e) =>
                `${e.closest('[data-testid="trip-hintuan"]').dataset.hintuan}:${e.dataset.part}`,
            ),
          );
          const railOf = (row) => row.locator('[data-rail]').first().getAttribute('data-rail');
          const backRails = [await railOf(startRow), await railOf(endRow)];
          const backKm = await tile('trip-km');
          const back = await page.evaluate(
            async ([s, e]) => {
              const m = window.__map;
              const c = m.getCanvas().getBoundingClientRect();
              const offOf = (el, lngLat) => {
                if (!el) return null;
                const r = el.getBoundingClientRect();
                const q = m.project(lngLat);
                return Math.hypot(
                  r.left + r.width / 2 - (c.left + q.x),
                  r.top + r.height / 2 - (c.top + q.y),
                );
              };
              // The chevrons between the two pins: each points from its inner
              // tip (the ring's fourth corner) to its tip (the first), which
              // way along the ride from the S to the E (chevrons.ts).
              const [ex, ey] = [e[0] - s[0], e[1] - s[1]];
              const len2 = ex * ex + ey * ey;
              const chevrons = ((await window.__src('direction-arrows'))?.features ?? []).filter(
                (f) => {
                  const ring = f.geometry.coordinates[0];
                  const t = ((ring[0][0] - s[0]) * ex + (ring[0][1] - s[1]) * ey) / len2;
                  return t > 0.1 && t < 0.9;
                },
              );
              const toE = chevrons.filter((f) => {
                const ring = f.geometry.coordinates[0];
                return (ring[0][0] - ring[3][0]) * ex + (ring[0][1] - ring[3][1]) * ey > 0;
              }).length;
              return {
                start: offOf(
                  document.querySelector('[data-testid="hintuan-pin"][data-marks="start"]'),
                  s,
                ),
                end: offOf(
                  document.querySelector('[data-testid="hintuan-pin"][data-marks="end"]'),
                  e,
                ),
                chevrons: chevrons.length,
                toE,
              };
            },
            [rideWant.at, rideWant.from],
          );
          check(
            BACK,
            backMarks.join() === `${ids[0]}:end,${ids[1]}:start` &&
              backRails.join() === 'below,above' &&
              backKm === rideWant.km &&
              back.start !== null &&
              back.start < 3 &&
              back.end !== null &&
              back.end < 3 &&
              back.chevrons > 0 &&
              back.toE >= 0.8 * back.chevrons,
            `${backMarks.join()}; rails ${backRails.join()}; Distance "${backKm}", the sums "${rideWant.km}"; S ${back.start?.toFixed(1)} px off, E ${back.end?.toFixed(1)} px off; ${back.toE} of ${back.chevrons} chevron(s) between them toward the E`,
          );
          // Let both go again, for what follows: × Remove as start, then the end.
          const removeBack = card().getByRole('button', { name: 'Remove as start' });
          await removeBack.scrollIntoViewIfNeeded();
          await buttonTap(removeBack, async () => !(await isSelected(endRow)));
          await startPick.scrollIntoViewIfNeeded();
          await buttonTap(startPick, async () => !(await isSelected(startRow)));
          // The destination's row tapped with a start set keeps the start
          // (the owner, 2026-10-16: "keep the start"; until then it let the
          // start go): the ride on to it, its E there, on the card and on the
          // map, the tiles the ride's.
          const KEEP =
            "  the destination's row with a start: the start kept, the ride on to it, its E and pill there";
          const toDestination = await rideOf(ids[1], null);
          await endPick.scrollIntoViewIfNeeded();
          await buttonTap(endPick, () => isSelected(endRow));
          const setStartLater = card().getByRole('button', { name: 'Set as start' });
          await setStartLater.scrollIntoViewIfNeeded();
          await buttonTap(
            setStartLater,
            async () => (await endRow.locator('[data-part="start"]').count()) === 1,
          );
          const destination = card().locator('[data-testid="trip-destination"]');
          const destinationPick = destination.locator('button').first();
          await destinationPick.scrollIntoViewIfNeeded();
          await buttonTap(
            destinationPick,
            async () => (await destination.getAttribute('data-state')) === 'selected',
          );
          await cardsSettled(page);
          const kept = await page.evaluate(() => ({
            card: [
              ...document.querySelectorAll(
                '[data-testid="trip"] [data-part="start"], [data-testid="trip"] [data-part="end"]',
              ),
            ].map(
              (e) =>
                `${e.closest('[data-hintuan]')?.getAttribute('data-hintuan') ?? e.closest('li')?.dataset.testid}:${e.dataset.part}`,
            ),
            map: [
              ...document.querySelectorAll(
                '[data-testid="end-title"] [data-part="start"], [data-testid="end-title"] [data-part="end"]',
              ),
            ].map(
              (mark) =>
                `${mark.closest('[data-testid="end-title"]').dataset.end}:${mark.dataset.part}`,
            ),
          }));
          const keptKm = await tile('trip-km');
          const keptFare = await tile('trip-fare');
          const keptPill = await pesosIn(destination);
          if (!toDestination)
            skip(KEEP, 'no ride from the start to the destination on the published line');
          else
            check(
              KEEP,
              kept.card.join() === `${ids[1]}:start,trip-destination:end` &&
                kept.map.join() === 'tail:end' &&
                keptKm === toDestination.km &&
                (toDestination.fare == null ||
                  (keptFare === toDestination.fare && keptPill === toDestination.fare)),
              `card ${kept.card.join()}; map ${kept.map.join()}; Distance "${keptKm}", the sums "${toDestination.km}"; fare "${keptFare}", its pill "${keptPill}", the sums "${toDestination.fare}"`,
            );
          // Let it go again: the destination's row, then × Remove as start.
          await destinationPick.scrollIntoViewIfNeeded();
          await buttonTap(
            destinationPick,
            async () => (await destination.getAttribute('data-state')) !== 'selected',
          );
          const removeKept = card().getByRole('button', { name: 'Remove as start' });
          await removeKept.scrollIntoViewIfNeeded();
          await buttonTap(removeKept, async () => !(await isSelected(endRow)));
        }
      }
    }
    // The ends are picked at full height too, where they are in reach.
    // The ends are buttons too (the owner's asks, 2026-09-29): with a
    // hintuan picked, a tap on where the trip goes, then on where it leaves
    // from, picks that end in its place, its dot the Selected one — the hintuan's
    // circle gone, the trip still lit — and glides the map to that end of the
    // line, above the card. Picking the hintuan again lets the end go.
    const ends = await page.evaluate(async (id) => {
      try {
        const { travelLine } = await import('/src/features/routes/model/ride.ts');
        const { fetchIndex } = await import('/src/features/routes/published/fetch-index.ts');
        const { fetchLine } = await import('/src/features/routes/published/fetch-line.ts');
        const m = await fetchIndex();
        const found = m.directions.find((x) => x.id === id);
        const line = travelLine(
          { ...found, shape: (await fetchLine(id)) ?? found.shape },
          m.hotspots,
        );
        return line.length > 1 ? { from: line[0], to: line[line.length - 1] } : null;
      } catch {
        return null;
      }
    }, tripId);
    // The camera before the first pick below: a second tap on the end picked
    // last takes it back there, as a hintuan's does (the owner's ask, 2026-10-03).
    const camBeforeEnds = await camNow();
    const originRow = card().locator('[data-testid="trip-origin"] button');
    for (const [end, testId] of [
      ['to', 'trip-destination'],
      ['from', 'trip-origin'],
    ]) {
      const endButton = card().locator(`[data-testid="${testId}"] button`);
      // The last pass scrolled the card to its far end: back to the row first.
      await pickButton.scrollIntoViewIfNeeded();
      await buttonTap(pickButton, isPicked);
      const wasPicked = await isPicked();
      // On the second pass the destination was picked: the hintuan picked
      // again has let it go, before the origin is tapped.
      const destinationBefore = await card()
        .locator('[data-testid="trip-destination"]')
        .first()
        .getAttribute('data-state');
      await endButton.first().scrollIntoViewIfNeeded();
      await buttonTap(endButton, async () => !(await isPicked()));
      await cardsSettled(page);
      const destination = await card()
        .locator('[data-testid="trip-destination"]')
        .first()
        .getAttribute('data-state');
      const origin = await card()
        .locator('[data-testid="trip-origin"]')
        .first()
        .getAttribute('data-state');
      // Where the camera brings the end in: above the card, or, with the card
      // raised past the framed height (55%), above that height, as the camera
      // frames a sheet higher than it (framedAt).
      const after = await page.evaluate(async (at) => {
        const m = window.__map;
        const c = m.getCanvas().getBoundingClientRect();
        const d = document.querySelector('[data-testid="card"]').getBoundingClientRect();
        const floor = Math.max(d.top, c.bottom - Math.round(c.height * 0.55));
        const q = at && m.project(at);
        return {
          pins: document.querySelectorAll('[data-testid="hintuan-pin"]').length,
          lit: (await window.__lit('saved-routes')) ?? [],
          above: q
            ? c.top + q.y > c.top + 16 && c.top + q.y < floor - 16 && q.x > 16 && q.x < c.width - 16
            : null,
          padding: Object.values(m.getPadding()).every((v) => v === 0),
        };
      }, ends?.[end] ?? null);
      check(
        `  ${end === 'to' ? 'where the trip goes' : 'where it leaves from'}, tapped at full height, is picked in the hintuan's place, its circle gone, the map gliding there above the framed height`,
        wasPicked &&
          destinationBefore === 'rest' &&
          !(await isPicked()) &&
          destination === (end === 'to' ? 'selected' : 'rest') &&
          origin === (end === 'from' ? 'selected' : 'rest') &&
          after.pins === 0 &&
          after.lit.length === 1 &&
          after.lit[0] === tripId &&
          after.above !== false &&
          after.padding,
        `picked first ${wasPicked}; the destination ${destinationBefore} → ${destination}, the origin ${origin}; ${after.pins} circle(s), ${after.lit.length} lit; in the map above the card ${after.above ?? 'not measured'} (data-snap=${await sheetState()})`,
      );
      const zoomed = await camNow();
      check(
        '    the zoom stays where the commuter had it, as for a hintuan',
        Math.abs(zoomed.zoom - camBeforeEnds.zoom) < 0.01,
        `zoom ${zoomed.zoom.toFixed(2)}, was ${camBeforeEnds.zoom.toFixed(2)}`,
      );
    }
    await originRow.first().scrollIntoViewIfNeeded();
    await buttonTap(
      originRow,
      async () =>
        (await card().locator('[data-testid="trip-origin"]').first().getAttribute('data-state')) ===
        'rest',
    );
    await cardsSettled(page);
    const camAfterEnd = await camNow();
    check(
      '  where it leaves from, tapped again, lets go, the camera back where it was before the picks',
      (await card().locator('[data-testid="trip-origin"]').first().getAttribute('data-state')) ===
        'rest' &&
        Math.abs(camAfterEnd.zoom - camBeforeEnds.zoom) < 0.01 &&
        Math.abs(camAfterEnd.lng - camBeforeEnds.lng) < 1e-6 &&
        Math.abs(camAfterEnd.lat - camBeforeEnds.lat) < 1e-6,
      JSON.stringify({ camBeforeEnds, camAfterEnd }),
    );
    // Picked again, for ⇅ — or leaving the trip — to let go.
    await pickButton.scrollIntoViewIfNeeded();
    await buttonTap(pickButton, isPicked);
    picked = await isPicked();
  }

  // ⇅ on the ends card turns the trip round: the same route, the other way (the Controller's
  // PAPUNTA gone, the owner, 2026-11-21).
  const sw = card().locator('button[data-testid="trip-ends-switch"]');
  if ((await sw.count()) === 0 || (await sw.first().isDisabled())) {
    skip(
      '  ⇅ turns the trip round',
      (await sw.count()) === 0 ? 'no ⇅ on the card' : "this route's other way is not drawn yet",
    );
  } else {
    const before = await tripLabel();
    const colour = await trip().first().getAttribute('data-livery');
    const pickedBefore = picked
      ? await card()
          .locator('[data-testid="trip-hintuan"][data-state="selected"]')
          .first()
          .getAttribute('data-hintuan')
      : null;
    await buttonTap(sw, async () => (await tripLabel()) !== before);
    const after = await tripLabel();
    const same = (s) => s.split(' → ').sort().join(' | ');
    check(
      '  ⇅ turns the trip round',
      after !== before && same(after) === same(before),
      `"${before}" → "${after}"`,
    );
    // Turned round, it is the same card: its colour stays (the owner, 2026-09-29).
    const now = await trip().first().getAttribute('data-livery');
    check('  and keeps its colour', !!colour && now === colour, `${colour} → ${now}`);
    if (picked) {
      // The pick and SWITCH (the owner, 2026-10-15: "trains reset, jeeps
      // keep"): on a jeep it comes along, landing where HintuanCard's SWITCH
      // would (boxTheOtherWay, by the published links); on a train it goes.
      const want = await page.evaluate(async (pickedId) => {
        try {
          const [{ fetchIndex }, { boxTheOtherWay }, { railLineOf }] = await Promise.all([
            import('/src/features/routes/published/fetch-index.ts'),
            import('/src/features/routes/model/places.ts'),
            import('/src/features/routes/model/routes.ts'),
          ]);
          const [nowId] = (await window.__lit('saved-routes')) ?? [];
          const m = await fetchIndex();
          const now = m.directions.find((d) => d.id === nowId);
          const box = m.hotspots.find((s) => s.id === pickedId);
          if (!now || !box) return null;
          if (railLineOf(now)) return { train: true, landing: null };
          const passes = (id) => m.links.some((l) => l.hotspotId === id && l.directionId === nowId);
          return { train: false, landing: boxTheOtherWay(box, m.hotspots, passes)?.id ?? null };
        } catch {
          return null;
        }
      }, pickedBefore);
      const pins = await page.evaluate(
        () => document.querySelectorAll('[data-testid="hintuan-pin"]').length,
      );
      const selected = await card()
        .locator('[data-testid="trip-hintuan"][data-state="selected"]')
        .evaluateAll((els) => els.map((e) => e.dataset.hintuan));
      check(
        want?.train
          ? '  and, on a train, lets the picked hintuan go'
          : '  and, on a jeep, keeps the picked hintuan, on a box the other way passes',
        want !== null &&
          (want.landing === null
            ? selected.length === 0 && pins === 0
            : selected.length === 1 && selected[0] === want.landing && pins === 1),
        `${JSON.stringify(want)}; ${JSON.stringify(selected)} Selected, ${pins} circle(s)`,
      );
      picked = selected.length > 0;
    }
  }
  // A hintuan picked on the trip as it is left, for the caller's leaving to
  // let go: ⇅ may have let the checked one go.
  if (!picked && (await rows.count()) > 0) {
    const any = card().locator('button[data-testid="trip-hintuan-pick"]:visible').first();
    if ((await any.count()) > 0) {
      const on = async () => (await any.getAttribute('aria-pressed')) === 'true';
      await buttonTap(any, on);
      picked = await on();
    }
  }
  // Let down by its handle as a person does when done with the stops: where the trip opened, or,
  // after the picks, raised a third, as the checks after a trip have always read it.
  if (didPicks) {
    if (!(await toRaised()))
      check(
        '  let down by its handle to a third, after the picks',
        false,
        `data-snap=${await sheetState()}`,
      );
  } else if (openedAt && (await sheetState()) !== openedAt && !(await handleTo(openedAt))) {
    check(
      `  let down by its handle to ${openedAt}, as it opened`,
      false,
      `data-snap=${await sheetState()}`,
    );
  }
  return { picked };
};
/**
 * Whether the hintuan pick has been checked: once, on the first trip with a hintuan, which is
 * section 2's (part 1); a part without it starts as checked, so the pick runs where a full run
 * runs it. 5d checks it again on the made-up map, in every run that holds it.
 */
let picksChecked = !runsPart(1);
/** The picked hintuan's circle, gone, and the pale rest with it — and no get-off circle, which the public map never draws. */
const noPickLeft = async () =>
  page.evaluate(
    async () =>
      ((await window.__src('ride-rest'))?.features ?? []).length +
        document.querySelectorAll('[data-testid="ride-dot"], [data-testid="hintuan-pin"]')
          .length ===
      0,
  );
const cardText = async () => ((await card().count()) ? await card().first().innerText() : '');
/** The card's height: 'low', 'full', or 'free' between (BottomSheet's data-snap). */
const sheetState = async () =>
  (await card().count()) ? await card().first().getAttribute('data-snap') : null;
/** The card's top on the screen: a step between two heights both called `free` moves it. */
const sheetTop = () =>
  card()
    .first()
    .evaluate((el) => Math.round(el.getBoundingClientRect().top))
    .catch(() => null);
/**
 * Whether the sheet `sel`, at full height and scrolled to its end, shows its last row clear of the
 * footer drawn over its foot: a finger at the row's middle reaches the row. Checked on a small
 * phone (375×667), where the body runs longer than the screen, and only where it does: a body with
 * nothing to scroll would pass whatever the sheet pads it by. Back on this phone's screen after.
 */
const endClearsFooter = async (sel) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await cardsSettled(page);
  const result = await page.evaluate((sheetSel) => {
    const sheet = document.querySelector(`${sheetSel}:not([hidden])`);
    // The body is the sheet's own child that scrolls; the footer, drawn before it, may hold a
    // scrolling part of its own.
    const body =
      sheet && [...sheet.children].find((el) => getComputedStyle(el).overflowY === 'auto');
    if (!body) return { ok: false, why: 'no scrolling body: is the sheet at full height?' };
    const footer = [...sheet.children].find((el) => el.hasAttribute('data-sheet-footer'));
    const overflow = body.scrollHeight - body.clientHeight;
    body.scrollTop = body.scrollHeight;
    // What a finger reaches at the end, and a trip's last stop: with picking off (VITE_RIDE_PICKS)
    // its rows are no controls, yet the last of them must still clear the footer.
    const reach = [
      ...body.querySelectorAll('button, a[href], [tabindex="0"], [data-testid="trip-destination"]'),
    ].filter((el) => el.getClientRects().length > 0 && !el.closest('[inert]'));
    const last = reach.at(-1);
    if (!last) return { ok: false, why: 'nothing in the body to reach' };
    const r = last.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      ok: overflow > 0 && !!hit && (hit === last || last.contains(hit)),
      last: (last.textContent ?? '').trim().slice(0, 40),
      at: [Math.round(r.top), Math.round(r.bottom)],
      footerTop: footer ? Math.round(footer.getBoundingClientRect().top) : null,
      overflow,
      hit: hit?.closest('[data-testid]')?.getAttribute('data-testid') ?? hit?.tagName ?? null,
    };
  }, sel);
  await page.setViewportSize({ width: 390, height: 844 });
  await cardsSettled(page);
  return result;
};
/**
 * Taps the handle until the sheet rests at `target`, Low or full (a third a tap, up from Low to
 * full and down again), each tap as a person's (buttonTap): it reaches the handle at rest, and
 * moves the sheet, its data-snap or, between two heights both `free`, its top. Whether it got
 * there within `ms`: a sheet that never does is a failure, not a skip.
 */
const handleTo = async (target, ms = 30000) => {
  if (await isNotchless()) return dragSheetTo(target);
  const by = Date.now() + ms;
  for (;;) {
    const was = await sheetState();
    if (was === target) return true;
    if (was === null || Date.now() > by) return false;
    const wasTop = await sheetTop();
    await buttonTap(
      handle(),
      async () => (await sheetState()) !== was || (await sheetTop()) !== wasTop,
    );
  }
};
/**
 * How far to drag the handle for the sheet to come to rest at `to` from
 * where it is, by the heights BottomSheet gives it: Low 133, `half` 55% of
 * the map (where a drag may leave it, past Low's magnet), full all of it but
 * its 24 px strip at the top. Negative is up.
 */
const dragTo = async (from, to) => {
  const h = await card()
    .first()
    .evaluate((el) => el.offsetHeight);
  const shown = { low: 133, half: Math.round(h * 0.55), full: h - 24 };
  return shown[from] - shown[to];
};
/**
 * The sheet raised a third from Low, a free height near half the map: a raised sheet, for the
 * checks that want one. Whether it got there.
 */
const toRaised = async () => {
  if (!(await handleTo('low'))) return false;
  if (await isNotchless()) {
    const h = await card()
      .first()
      .evaluate((el) => el.offsetHeight);
    await dragSheet(-Math.round(h / 3));
  } else await buttonTap(handle(), async () => (await sheetState()) !== 'low');
  return (await until(sheetState, (state) => state === 'free', 5000)) === 'free';
};
/**
 * Whether the card's handle draws no notch (BottomSheet's `handle="hidden"`, a trip's and the
 * route list's): nothing there for a finger, which moves the sheet itself instead.
 */
const isNotchless = async () => {
  if ((await handle().count()) === 0) return false;
  const box = await handle().first().boundingBox();
  return !box || box.width <= 1 || box.height <= 1;
};
/** A finger 24 in from the sheet's top-left, moved `dy` and held before it lifts: no throw. */
const dragSheet = async (dy) => {
  const box = await card().first().boundingBox();
  if (!box) return;
  await fingerPan(box.x + 24, Math.max(box.y, 0) + 24, 0, dy);
  await cardsSettled(page);
};
/**
 * A notchless sheet brought to rest at `target` by a finger, as a person does: past the top for
 * full, and down to within Low's magnet for Low (its `data-low-px`). Whether it got there.
 */
const dragSheetTo = async (target) => {
  for (let i = 0; i < 3 && (await sheetState()) !== target; i++) {
    if ((await sheetState()) === null) return false;
    if (target === 'full') {
      const h = await card()
        .first()
        .evaluate((el) => el.offsetHeight);
      await dragSheet(-h);
    } else {
      const low = Number(await card().first().getAttribute('data-low-px'));
      await dragSheet((await shownOf(card())) - low - 20);
    }
  }
  return (await sheetState()) === target;
};
/**
 * A trip, or the route list, left as a commuter leaves it, with no ‹ or ✕ (the owner, 2026-11-21):
 * a finger on the empty map above its sheet; at full height, where no map shows, the phone's Back.
 * Whether `done()` came true within 3 s.
 */
const leaveTrip = async (done) => {
  await cardsSettled(page);
  const at = await emptyMapPoint(page);
  if (at) await mapTap(at.x, at.y);
  else await page.goBack();
  return (await until(done, Boolean, 3000)) === true;
};
const closeCard = async () => {
  const closed = async () => (await card().count()) === 0;
  if (isTouchOnly) {
    // A phone touched by finger alone: by finger, never a mouse's click or Escape. Cards stack (a
    // trip over the place it was opened from, which shows ‹ in place of ✕): a place's card is left
    // by its ✕ or its ‹, a trip and the route list, which have neither (the owner, 2026-11-21), by
    // the empty map (leaveTrip), in turn, as a person does, until none is open.
    const leave = page
      .locator('[data-testid="card"]:not([hidden])')
      .getByRole('button', { name: /^(Close|Back)$/ })
      .first();
    const atTop = () =>
      page.evaluate(
        () =>
          [
            ...document.querySelectorAll(
              '[data-testid="card"]:not([hidden]), [data-testid="chooser"]:not([hidden])',
            ),
          ]
            .map((c) => c.innerText.slice(0, 80))
            .join('|') || null,
      );
    const isListOpen = async () =>
      (await page.locator('[data-testid="chooser"]:not([hidden])').count()) > 0;
    for (let i = 0; i < 5 && !((await closed()) && !(await isListOpen())); i++) {
      const before = await atTop();
      const moved = async () => (await atTop()) !== before;
      if ((await leave.count()) > 0) {
        // For a FAIL to say which card was open and what the tap met (ci-flakes ticket 07): where
        // the button was, where this tap's pointerdown landed, and the cards' tops before and now.
        // Read, not waited for: a button not drawn yet must not hold up the tap's own reading.
        const box = await leave.evaluate((button) => {
          window.__leaveDown = 'none';
          document.addEventListener(
            'pointerdown',
            (e) => {
              const at = e.target instanceof Element ? e.target : null;
              window.__leaveDown = button.contains(at)
                ? 'on the button'
                : `on ${at?.closest('[data-testid]')?.getAttribute('data-testid') ?? at?.tagName.toLowerCase() ?? 'nothing'} at (${Math.round(e.clientX)}, ${Math.round(e.clientY)})`;
            },
            { capture: true, once: true },
          );
          const r = button.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        });
        const more = async () =>
          `; the button at ${box ? `(${Math.round(box.x)}, ${Math.round(box.y)}) ${Math.round(box.width)}×${Math.round(box.height)}` : 'no box'}; the tap's pointerdown ${await page.evaluate(() => window.__leaveDown)}; on show before "${before}", now "${await atTop()}"`;
        if (!(await buttonTap(leave, moved, more))) break;
      } else if (!(await leaveTrip(moved))) break;
      await cardsSettled(page);
    }
    return;
  }
  // A place's card by its ✕; a trip and the route list, which have none, by Escape, a trip back to
  // what it was opened from: one sheet at a time, until none is open.
  const allClosed = async () =>
    (await closed()) && (await page.locator('[data-testid="chooser"]:not([hidden])').count()) === 0;
  for (let i = 0; i < 5 && !(await allClosed()); i++) {
    const close = page
      .locator('[data-testid="card"]:not([hidden])')
      .getByRole('button', { name: 'Close' });
    if ((await close.count()) > 0)
      await close
        .first()
        .click({ timeout: 1500 })
        .catch(() => {});
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  await until(allClosed, Boolean, 1500);
  await cardsSettled(page);
};
/**
 * Where a route's box lands once the camera stops: a trip opening takes in
 * its whole route, clear of the card (the owner's ask, 2026-10-01). `inside`
 * is every corner on the map and above the card, 2 px either way.
 */
const framedAboveCard = async (bbox, sheet = 'card') =>
  page.evaluate(
    ([[w, s, e, n], sheet]) =>
      new Promise((done) => {
        const m = window.__map;
        const read = () => {
          const c = m.getCanvas().getBoundingClientRect();
          const d = document
            .querySelector(`[data-testid="${sheet}"]:not([hidden])`)
            ?.getBoundingClientRect();
          const nw = m.project([w, n]);
          const se = m.project([e, s]);
          const box = {
            left: c.left + nw.x,
            top: c.top + nw.y,
            right: c.left + se.x,
            bottom: c.top + se.y,
          };
          const floor = d && d.right >= c.right - 1 ? d.top : c.bottom;
          const inside =
            box.left >= c.left - 2 &&
            box.right <= c.right + 2 &&
            box.top >= c.top - 2 &&
            box.bottom <= floor + 2;
          done({
            inside,
            box: Object.fromEntries(Object.entries(box).map(([k, v]) => [k, Math.round(v)])),
            map: [Math.round(c.top), Math.round(c.bottom)],
            width: Math.round(c.width),
            floor: Math.round(floor),
            zoom: +m.getZoom().toFixed(2),
          });
        };
        if (m.isMoving()) m.once('moveend', () => setTimeout(read, 50));
        else read();
        setTimeout(read, 5000);
      }),
    [bbox, sheet],
  );
// The owner's two looks for the lines (2026-09-29): every one opaque in
// Map/RouteLine/surface-default, the lit ones drawn over them in
// …/surface-selected, and no layer shading a line. The hexes are
// map-colours.ts's, read from the dev server; a server that cannot serve it
// is held to two different colours.
const MAP = await page.evaluate(async () => {
  try {
    return (await import('/src/design-system/foundation/map-colours.ts')).MAP_COLOURS;
  } catch {
    return null;
  }
});
const twoLooks = (p, lit = MAP?.['Map/RouteLine/surface-selected']) =>
  !!p &&
  p.shaded.length === 0 &&
  (MAP
    ? p.rest === MAP['Map/RouteLine/surface-default'] && p.lit === lit
    : !!p.rest && p.rest !== p.lit);

// What is lit wears the colour of the card it answers — a picked RouteCard's,
// an open trip's — its chevrons in the card's words' colour and its end
// circles ringed in the line's; with no card picked, the selected blue (the
// owner's ask, 2026-09-29). The looks are livery-line.ts's, read from the dev
// server; a server that cannot serve it skips the colour.
const LOOKS = await page.evaluate(async () => {
  try {
    const m = await import('/src/features/routes/map/livery-line.ts');
    return { byLivery: m.LIVERY_LINE, lit: m.LIT_LINE };
  } catch {
    return null;
  }
});
/** Whether the lit line wears `want` (a LineLook), chevrons too; true when the looks cannot be read. */
const wears = (seen, want) =>
  !LOOKS || (!!want && seen.line === want.line && seen.arrow === want.arrow);
/** Whether the unsigned end circles ring in `livery`'s surface, or the selected blue for null, and the signed ones in Start's green or End's red (EndTitles), as the page computes them. */
const endsWear = async (livery) => {
  const rings = await endRings(page);
  const want = await colourOf(page, ringVar(livery));
  return {
    ok: ringed(rings, want),
    detail: `${rings.circles} circle(s), ${rings.signed} signed (in their sign's colour: ${rings.signsWorn}), the rest ringed ${rings.rings.join(', ') || 'none'}${rings.paledRings.length ? `, paled ${rings.paledRings.join(', ')}` : ''} (asked ${want})`,
  };
};
/** The directions lit now, by id. */
const litIds = (p) => p.evaluate(() => window.__lit('saved-routes'));

// ------------------------------------ 1b. a first tap compiles no GL program
// MapLibre compiles a GL program the first time it draws with it, on the
// main thread: 5-50 ms on a phone, a second and more in a runner's software
// GPU. The first tap that lit a route compiled two as its card came up, the
// end circles' and the orange stretches'. Since 2026-10-04 the stretches are
// drawn with the lit line's program, and the lit layers' are compiled while
// the map is idle (the cheap-phone plan, steps 2 and 3; the circles' too,
// until they became DOM markers on 2026-10-12). So, on the view the map
// opened on with nothing tapped yet: the warm-up has drawn its twins, and a
// finger on a route line, its card up and the map settled, adds none. Then
// the page is loaded again, for the sections below to start as they did.
if (runsPart(3)) {
  const rest = await programsAtRest(page);
  check(
    'at rest, before any tap, the warm-up has drawn its twins (warmPrograms)',
    rest.warmed,
    rest.warmed
      ? `after ${(rest.ms / 1000).toFixed(1)} s more`
      : `none in ${rest.ms / 1000} s: ${rest.keys.length} programs`,
  );
  // A vertex clear of every hotspot by more than a finger reaches, at the
  // opening view, and the farthest from any other route: a trip where the
  // map allows, else a list; the first that is on the open map.
  const view = await page.evaluate(() => ({
    zoom: window.__map.getZoom(),
    lat: window.__map.getCenter().lat,
  }));
  const reach =
    (20 * Math.SQRT2 + 9) *
    ((40075016.686 * Math.cos((view.lat * Math.PI) / 180)) / (512 * 2 ** view.zoom));
  const spots = [];
  for (const r of snapshot.routes) {
    for (const vi of sampleIndices(r.coords.length, 1500 / Math.max(1, snapshot.routes.length))) {
      const p = r.coords[vi];
      const k = mPerDegLng(p[1]);
      if (distToHotspots(p, snapshot.polys, k) < reach) continue;
      let clear = Infinity;
      for (const o of snapshot.routes) {
        if (o.routeId === r.routeId || distToBbox(p, o.bbox, k) > clear) continue;
        clear = Math.min(clear, distToLine(p, o.coords, k));
      }
      spots.push({ p, clear });
    }
  }
  spots.sort((a, b) => b.clear - a.clear);
  const at = await page.evaluate(
    (ps) => {
      const m = window.__map;
      const c = m.getCanvas().getBoundingClientRect();
      for (const p of ps) {
        const q = m.project(p);
        if (q.x < 40 || q.x > innerWidth - 40 || q.y < 160 || q.y > innerHeight - 160) continue;
        if (
          !document
            .elementFromPoint(c.left + q.x, c.top + q.y)
            ?.classList.contains('maplibregl-canvas')
        )
          continue;
        return [c.left + q.x, c.top + q.y];
      }
      return null;
    },
    spots.slice(0, 400).map((s) => s.p),
  );
  if (!at) {
    skip(
      'a first tap on a route at the opening view compiles no GL program',
      'no route vertex clear of the hotspots on the open map',
    );
    skip(
      "  and asks the map what it landed on once: no hover's queries, one answer for both hooks",
      'no tap',
    );
  } else {
    // Every query of the rendered features, until the click's last listener
    // (added after the app's two, so it hears the click after them). The
    // page is loaded again below, which puts the map's own back.
    await page.evaluate(() => {
      const m = window.__map;
      const query = m.queryRenderedFeatures;
      window.__queries = 0;
      window.__queriesByClick = null;
      m.queryRenderedFeatures = function (...args) {
        window.__queries++;
        return query.apply(this, args);
      };
      m.on('click', () => {
        window.__queriesByClick ??= window.__queries;
      });
    });
    await mapTap(at[0], at[1]);
    const shown = page.locator(
      '[data-testid="card"]:not([hidden]), [data-testid="chooser"]:not([hidden])',
    );
    await shown
      .first()
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(() => {});
    const opened = (await page.locator('[data-testid="chooser"]:not([hidden])').count())
      ? 'the route list'
      : (await trip().count())
        ? 'a trip'
        : (await card().count())
          ? 'a card'
          : 'nothing';
    const { added, standIn } = await programsSince(page, rest.keys);
    check(
      'a first tap on a route at the opening view compiles no GL program',
      opened !== 'nothing' && added.length === 0,
      `${opened} opened; ${added.length} added${added.length ? ': ' + added.join(', ') : ''}` +
        (standIn.length
          ? `; and ${standIn.length} a real basemap compiles at load, which the stand-in does not: ${standIn.map((k) => k.split('/')[0]).join(', ')}`
          : ''),
    );
    // A finger cannot hover, so the routes' and the hotspots' hooks ask
    // nothing as it moves (bindHover, tap.ts), and the tap's question —
    // inside a box? a route in the finger's box? a box near it? — is asked
    // once, by the first hook, and kept for the second (tap.ts): three
    // queries at most.
    // Until 2026-10-04 a tap on a route asked eight: four for the hover
    // pairs on the mousemove a touch makes, and two by each hook (the
    // cheap-phone plan, step 7).
    const queries = await page.evaluate(() => window.__queriesByClick);
    check(
      "  and asks the map what it landed on once: no hover's queries, one answer for both hooks",
      queries !== null && queries <= 3,
      queries === null
        ? 'the map heard no click'
        : `${queries} queries of the rendered features by the end of the click`,
    );
  }
}
await page.goto(`${BASE}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__map && window.__map.loaded(), null, { timeout: 30000 });
await waitForSource(page, 'saved-routes');
await mapIdle(page);

// How far a pixel reaches on the ground — measured off the map, not looked up.
// MapLibre serves 512 px tiles, so its zoom 16 is the scale a 256 px table calls
// 17: about 1.2 m per CSS pixel here, half what the table says. Every metre
// threshold below is written against this, so they stay right if ZOOM changes.
await jumpTo(page, snapshot.routes[0]?.coords[0] ?? [121.0244, 14.5995]);
const M_PER_PX = await page.evaluate(() => {
  const m = window.__map;
  const a = m.unproject([0, 0]);
  const c = m.unproject([100, 0]);
  const k = 111320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot((c.lng - a.lng) * k, (c.lat - a.lat) * 110574) / 100;
});
/** How far the coarse ±20 px tap box reaches on the ground, in metres. */
const BOX_M = 20 * M_PER_PX;
/** Where the negative control taps: 40 px off the line. */
const FAR_M = 40 * M_PER_PX;
console.log(
  `(at zoom ${ZOOM} a pixel is ${M_PER_PX.toFixed(2)} m, so the ±20 px tap box reaches ${Math.round(BOX_M)} m)\n`,
);

/**
 * The direction an open trip card shows: with a trip open only it is lit.
 * Its name, the card's label, is the fallback; two directions can share a
 * name (a via is not in it), so it is not the first resort.
 */
const openedDirection = async () => {
  if (!(await trip().count())) return null;
  const lit = (await litIds(page)) ?? [];
  if (lit.length === 1) return fileDirections.find((d) => d.id === lit[0]) ?? null;
  const label = await tripLabel();
  return label ? (fileDirections.find((d) => d.name === label) ?? null) : null;
};

/**
 * Opens direction `d`'s trip on its own from a fresh page, as a commuter would:
 * a tap on its line where nothing else runs — the vertex with the most room
 * from every other line and every box, more than a tap reaches (the box's
 * corner, 20√2 px, and half the hit line's width, at the suite's zoom). Its
 * own way back may share the road where `d` is the way out: a tap there opens
 * the way out (use-route-taps.ts, the outbound rule). The trip links that opened a
 * given trip went on 2026-10-03; false when no vertex has the room, or the
 * card opened is another.
 */
async function openAlone(d) {
  const r = snapshot.routes.find((o) => o.id === d.id);
  if (!r) return false;
  const reach = (20 * Math.SQRT2 + 9) * M_PER_PX;
  let best = null;
  for (const vi of sampleIndices(r.coords.length, 400)) {
    const p = r.coords[vi];
    const k = mPerDegLng(p[1]);
    if (distToHotspots(p, snapshot.polys, k) < reach) continue;
    let clear = Infinity;
    for (const o of snapshot.routes) {
      if (
        o.id === r.id ||
        (!d.reversed && o.routeId === r.routeId) ||
        distToBbox(p, o.bbox, k) > clear
      )
        continue;
      clear = Math.min(clear, distToLine(p, o.coords, k));
    }
    if (!best || clear > best.clear) best = { p, clear };
  }
  if (!best || best.clear < reach) return false;
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__map && window.__map.loaded(), null, { timeout: 30000 });
  await waitForSource(page, 'saved-routes');
  await jumpTo(page, best.p);
  const at = await project(page, best.p);
  const box = await canvasBox();
  await mapTap(box.x + at[0], box.y + at[1]);
  await trip()
    .first()
    .waitFor({ state: 'visible', timeout: 10000 })
    .catch(() => {});
  await cardsSettled(page);
  return (await openedDirection())?.id === d.id;
}

// ------------------------------------------------ 2. a forgiving tap, ±20 px
// Route A: the vertex with the most clearance from every other route's line,
// and clear of the hotspot polygons, so only one thing can possibly be there;
// on a route with two ends, never a loop, and with a fare, for the trip card's
// checks below.
let routeA = null;
if (runsPart(1)) {
  if (snapshot.routes.length === 0) {
    skip('a tap 14 px beside a lone route line selects it', 'no saved routes on the map today');
  } else {
    let best = null;
    for (const [ri, r] of snapshot.routes.entries()) {
      if (loopIds.has(r.id) || farelessIds.has(r.id)) continue;
      for (const vi of sampleIndices(r.coords.length, 1500 / snapshot.routes.length)) {
        const p = r.coords[vi];
        const k = mPerDegLng(p[1]);
        let clear = Infinity;
        for (const [oi, o] of snapshot.routes.entries()) {
          if (oi === ri) continue;
          if (distToBbox(p, o.bbox, k) > clear) continue;
          const d = distToLine(p, o.coords, k);
          if (d < clear) clear = d;
        }
        if (clear < 60) continue;
        if (distToHotspots(p, snapshot.polys, k) < 60) continue;

        // Which way the line runs here. A route's vertices can be metres apart, so
        // the immediate neighbour gives a direction that is mostly rounding noise
        // — walk along the line until the neighbour is far enough to trust.
        const nb = neighbourAtLeast(r.coords, vi, 30, k);
        if (!nb) continue;

        // The negative control taps 40 px out along the perpendicular, so prefer a
        // vertex on a straight stretch: where the line bends back, its own
        // geometry is inside the tap box there and the control cannot run.
        const dx = (nb[0] - p[0]) * k;
        const dy = (nb[1] - p[1]) * M_PER_DEG_LAT;
        const len = Math.hypot(dx, dy) || 1;
        const straight = [1, -1].some((side) => {
          const off = [
            p[0] + ((-dy / len) * FAR_M * side) / k,
            p[1] + ((dx / len) * FAR_M * side) / M_PER_DEG_LAT,
          ];
          const ko = mPerDegLng(off[1]);
          const clearThere = Math.min(
            ...snapshot.routes.map((o) => distToLine(off, o.coords, ko)),
            distToHotspots(off, snapshot.polys, ko),
          );
          return clearThere > BOX_M + 10;
        });
        const score = clear + (straight ? 1e6 : 0);
        if (!best || score > best.score)
          best = { route: r, index: vi, point: p, neighbour: nb, clear, straight, score };
      }
    }
    routeA = best;
  }

  if (snapshot.routes.length > 0 && !routeA) {
    skip(
      'a tap 14 px beside a lone route line selects it',
      'no route vertex today is 60 m clear of every other route and hotspot',
    );
  }

  if (routeA) {
    const r = routeA.route;
    const neighbour = routeA.neighbour;
    const desc = `"${r.signboard}" (${Math.round(routeA.clear)} m clear)`;
    await jumpTo(page, routeA.point);
    const anchor = await project(page, routeA.point);
    const perp = await perpendicular(page, routeA.point, neighbour, routeA.route.coords, 40);
    const box = await canvasBox();
    const at = (px) => [box.x + anchor[0] + perp[0] * px, box.y + anchor[1] + perp[1] * px];

    const [tx, ty] = at(14);
    const camBeforeLineTap = await camNow();
    await mapTap(tx, ty);
    await cardsSettled(page);

    const text = await cardText();
    check(
      `a tap 14 px beside a lone route line selects it`,
      (await card().count()) > 0,
      `${desc}; [data-testid="card"] count ${await card().count()}`,
    );
    // The owner's trip card (2026-09-29), named for its direction: it runs from
    // where that leaves (the top row, no pesos on it since 3778:3183) to where
    // it goes (the bottom row). Which way round is the tap's to decide, so the
    // route's two ends are checked, not their order.
    const label = await tripLabel();
    const [from = '', to = ''] = label.split(' → ');
    const origin = await tripRow('trip-origin');
    const end = await tripRow('trip-destination');
    check(
      '  it opens the trip card, from where its direction leaves to where it goes',
      !!from && !!to && origin === from && end === to,
      `"${label}": top "${origin}", bottom "${end}"`,
    );
    // Opened, the camera stays where the commuter had it (the owner, 2026-11-23: choosing a route
    // never moves the map), and the Overview is offered. Pressed, it takes in the whole route above
    // the sheet at its opening height, and at that overview it hides.
    await page
      .waitForFunction(() => !window.__map.isMoving(), null, { timeout: 5000 })
      .catch(() => {});
    const camAfterLineTap = await camNow();
    const overview = page.getByRole('button', { name: 'Overview' });
    const isOfferedAtOpen = await overview.isVisible();
    check(
      '  the camera stays where it was, and the Overview is offered',
      sameCamera(camBeforeLineTap, camAfterLineTap) && isOfferedAtOpen,
      JSON.stringify({ camBeforeLineTap, camAfterLineTap, isOfferedAtOpen }),
    );
    if (isOfferedAtOpen) await buttonTap(overview, async () => !(await overview.isVisible()));
    await page
      .waitForFunction(() => !window.__map.isMoving(), null, { timeout: 5000 })
      .catch(() => {});
    const openFit = await framedAboveCard(r.bbox);
    const isShownAtFit = await overview.isVisible();
    check(
      '  the Overview takes in the whole route, above the sheet, and then hides',
      openFit.inside && !isShownAtFit,
      JSON.stringify({ openFit, isShownAtFit }),
    );
    const routeEnds = r.signboard.split(' – ').map((e) => e.replace(/ via .*$/, ''));
    check(
      "  its ends are the route's two ends",
      routeEnds.length === 2 && routeEnds.every((e) => text.includes(e)),
      r.signboard,
    );
    // Dropped by the owner for now, to design later. The boards uploaded in the
    // studio are pictures on their own card, "Signboard" over them (4680:25123),
    // left out here with their heading.
    const extras = await card()
      .first()
      .evaluate((c) => {
        const k = c.cloneNode(true);
        k.querySelector('[data-testid="trip-signboards"]')?.remove();
        return k.textContent;
      });
    const gone = ['Length', 'Mode', 'Status', 'Share', 'Signboard'].filter((s) =>
      extras.includes(s),
    );
    check(
      "  the old card's extras are gone: no Length, Mode, Status, Share or signboard words",
      text !== '' && gone.length === 0,
      gone.join(', '),
    );

    // The tap opens the route's drawn outbound, whichever direction was under the finger (2026-09-22).
    const sameRoute = snapshot.routes.filter((o) => o.routeId === r.routeId).map((o) => o.id);
    const lit = (await litIds(page)) ?? [];
    check(
      '  one direction of that route is lit',
      lit.length === 1 && sameRoute.includes(lit[0]),
      JSON.stringify(lit),
    );
    // No list is behind it: leaving it lists the routes sharing an end only where another is
    // drawn its way round (the owner's ask, 2026-09-29); checked as it is left, below.
    const fanned = fanOf(lit[0]).length > 1;
    const looks = await paintNow(page);
    const openColour = (await trip().count())
      ? await trip().first().getAttribute('data-livery')
      : null;
    check(
      "  the rest stay as they rest, opaque light blue, the trip's line in its card's colour: nothing fades (two looks)",
      twoLooks(looks, LOOKS?.byLivery[openColour]?.line ?? MAP?.['Map/RouteLine/surface-selected']),
      `${openColour}: ${JSON.stringify(looks)}`,
    );
    // Each end named in a pill over its circle, its pointer at the circle, in
    // the line's colour, or, led by Start's S or End's E, in that icon's
    // (End&TailRoute, Figma 3848:12135; the owner's redrawing of 2026-10-12,
    // its icons in place of the words Start and End the same day).
    const ends = await page.evaluate(async () => {
      const m = window.__map;
      const all = window.__ends();
      const named = all.filter((e) => e.named);
      const pills = [...document.querySelectorAll('[data-testid="end-title"]')];
      // The line's colour as the page computes it: a plain pill wears it inline (livery-line.ts's hex).
      const probe = document.createElement('i');
      probe.style.color = m.getPaintProperty('saved-routes-selected', 'line-color');
      document.body.append(probe);
      const ringRgb = getComputedStyle(probe).color;
      probe.remove();
      // Colours as the screen paints them: a token class computes to oklch(), the
      // line's hex to rgb(), so they are held against each other as pixels.
      const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const rgbOf = (colour) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = colour;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      };
      const same = (a, b) => {
        const [x, y] = [rgbOf(a), rgbOf(b)];
        return x.every((v, i) => Math.abs(v - y[i]) <= 2);
      };
      // What a Head Route wears, read off its own class: Start's green.
      const startGreen = (() => {
        const p = document.createElement('i');
        p.className = 'bg-map-hotspots-card-hintuan-surface';
        document.body.append(p);
        const colour = getComputedStyle(p).backgroundColor;
        p.remove();
        return colour;
      })();
      const endRed = (() => {
        const p = document.createElement('i');
        p.className = 'bg-card-red-surface';
        document.body.append(p);
        const colour = getComputedStyle(p).backgroundColor;
        p.remove();
        return colour;
      })();
      const c = m.getCanvas().getBoundingClientRect();
      const rows = named.map((f) => {
        const pill = pills.find((p) => p.dataset.name === f.name);
        if (!pill) return { name: f.name, missing: true };
        const namePill = pill.querySelector('[data-part="name"]');
        const icon = namePill.querySelector('[data-part="start"]')
          ? 'Start'
          : namePill.querySelector('[data-part="end"]')
            ? 'End'
            : null;
        // Start's pill wears its green and End's its red, whatever the line; a plain one the line's.
        const wants = icon === 'Start' ? startGreen : icon === 'End' ? endRed : ringRgb;
        const box = namePill.getBoundingClientRect();
        const q = m.project(f.at);
        // The circle under the pill: the hintuan's own dot, 24 across, its centre on the point (EndTitles).
        const dot = pill.querySelector('[data-part="circle"] > span').getBoundingClientRect();
        return {
          name: f.name,
          // Head Route where the ride starts, Start's pill first; Tail Route where it goes, End's first.
          look:
            f.end === 'from'
              ? pill.dataset.end === 'head' && icon === 'Start'
              : pill.dataset.end === 'tail' && icon === 'End',
          colour: same(getComputedStyle(namePill).backgroundColor, wants),
          font: /^"?Livvic/.test(getComputedStyle(namePill).fontFamily),
          // Its pointer the same: the pill's last svg.
          pointer: same(getComputedStyle([...namePill.querySelectorAll('svg')].at(-1)).fill, wants),
          across: box.left + box.width / 2 - (c.left + q.x),
          above: c.top + q.y - box.bottom,
          dotAcross: dot.left + dot.width / 2 - (c.left + q.x),
          dotDown: dot.top + dot.height / 2 - (c.top + q.y),
          dotSize: dot.width,
        };
      });
      return { named: named.length, pills: pills.length, circles: all.length, rows };
    });
    check(
      "  each end named once, in Livvic, in a pill over its circle, Start's green, End's red or the line's colour, its pointer the same, Start's pill before where the ride starts and End's before where it goes; the circle the hintuan's dot, 24 across, on the point",
      ends.named > 0 &&
        ends.pills === ends.named &&
        ends.circles >= ends.named &&
        ends.rows.every(
          (r) =>
            !r.missing &&
            r.look &&
            r.colour &&
            r.font &&
            r.pointer &&
            Math.abs(r.across) < 1.5 &&
            r.above > 14 &&
            r.above < 40 &&
            Math.abs(r.dotAcross) < 1.5 &&
            Math.abs(r.dotDown) < 1.5 &&
            Math.abs(r.dotSize - 24) < 0.5,
        ),
      JSON.stringify(ends),
    );

    // An end's name is a button (the owner's ask, 2026-10-01): its place's
    // card opens over the trip, the map flown in to it, and its ‹ brings the
    // trip back as it was.
    const named = await page.evaluate(() =>
      window
        .__ends()
        .filter((e) => e.named)
        .map((e) => ({ name: e.name, at: e.at })),
    );
    const endButton = (name) =>
      page.locator(`[data-testid="end-title"][data-name="${name}"] button`);
    const tappable = [];
    for (const n of named) if ((await endButton(n.name).count()) > 0) tappable.push(n);
    if (tappable.length === 0) {
      skip(
        "  a tap on an end's name opens its place over the trip, ‹ back to it",
        `no end of "${label}" names its hotspot`,
      );
    } else {
      const end = tappable[0];
      await jumpAboveSheet(page, end.at);
      await buttonTap(endButton(end.name).locator('[data-part="name"]'), () =>
        page.evaluate(() =>
          [...document.querySelectorAll('[data-testid="card"]')].some(
            (c) => !c.hidden && c.querySelector('[data-testid="card-place"]'),
          ),
        ),
      );
      await cardsSettled(page);
      const opened = await page.evaluate(() => {
        const shown = [...document.querySelectorAll('[data-testid="card"]')].filter(
          (c) => !c.hidden,
        );
        return {
          shown: shown.length,
          place: shown[0]?.querySelector('[data-testid="card-place"]')?.innerText.trim() ?? null,
          trip: shown.some((c) => c.querySelector('[data-testid="trip"]')),
          zoom: +window.__map.getZoom().toFixed(2),
        };
      });
      check(
        "  a tap on an end's name opens its place's card over the trip, the map flown in to it",
        opened.shown === 1 &&
          !opened.trip &&
          !!opened.place?.includes(end.name) &&
          opened.zoom >= 15.9,
        JSON.stringify({ end: end.name, ...opened }),
      );
      // A tap, as on the other buttons here: the runner may drop the touch.
      const tripShown = async () =>
        (await page.locator('[data-testid="card"]:not([hidden]) [data-testid="trip"]').count()) ===
        1;
      await buttonTap(card().getByRole('button', { name: 'Back' }), tripShown);
      check(
        '  its ‹ brings the trip back',
        (await tripLabel()) === label &&
          (await page
            .locator('[data-testid="card"]:not([hidden]) [data-testid="trip"]')
            .count()) === 1,
        `"${await tripLabel()}", want "${label}"`,
      );
    }

    const trip2 = await tripChecks();
    // The ⓘ keeps its corner with a card open: it no longer rides over the sheet.
    if (['free', 'low'].includes(await sheetState())) {
      await cardsSettled(page);
      const corner = await page.evaluate(() => {
        const info = document
          .querySelector('button[aria-label="Map data sources"]')
          ?.getBoundingClientRect();
        return info ? { x: Math.round(info.left), y: Math.round(info.top) } : null;
      });
      check(
        "  with a card open the map's ⓘ stays in the top-left corner, 12 in",
        corner !== null && Math.abs(corner.x - 12) < 2 && Math.abs(corner.y - 12) < 2,
        JSON.stringify(corner),
      );

      // The ⓘ is the licences' credit, MapLibre's corner gone. At full height no map shows and the
      // card fills its corner: it is hidden, not drawn and out of the keyboard's way (the owner,
      // 2026-11-22); held part way up, with map showing, it is back in its corner, reachable.
      const infoReachable = () =>
        page.evaluate(() => {
          const info = document.querySelector('button[aria-label="Map data sources"]');
          const box = info?.getBoundingClientRect();
          if (!info || !box) return null;
          const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
          return { top: Math.round(box.top), isOnTop: !!hit && info.contains(hit) };
        });
      const before = await sheetState();
      const atFull = (await handleTo('full'))
        ? await page.evaluate(() => {
            const info = document.querySelector('button[aria-label="Map data sources"]');
            return info
              ? { drawn: info.checkVisibility(), box: info.getClientRects().length }
              : null;
          })
        : null;
      check(
        "  with the card at full height, the map's ⓘ is hidden: not drawn, not focusable",
        atFull !== null && !atFull.drawn && atFull.box === 0,
        JSON.stringify(atFull),
      );
      await toRaised();
      await cardsSettled(page);
      const grip = await handle().first().boundingBox();
      let midway = null;
      if (grip) {
        // Held part way up by a finger on the handle, read while it is still held.
        const [x, y] = [grip.x + grip.width / 2, grip.y + grip.height / 2];
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let i = 1; i <= 10; i++) {
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - 15 * i }],
          });
          await page.waitForTimeout(16);
        }
        midway = await infoReachable();
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await cardsSettled(page);
      }
      check(
        "  with the card held part way up, the map's ⓘ is back in its corner, reachable",
        midway?.isOnTop === true,
        JSON.stringify(midway),
      );
      if (before) await handleTo(before);
    }

    // Left by the empty map, as it has no ‹ or ✕ (the owner, 2026-11-21): where another route
    // sharing an end runs its way, to their list; else it closes.
    const isListUp = async () =>
      (await page.locator('[data-testid="chooser"]:not([hidden])').count()) > 0;
    const left = await leaveTrip(async () => (await trip().count()) === 0);
    check(
      fanned
        ? '  another route sharing an end runs its way, so leaving it lists them'
        : '  no other route sharing an end runs its way, so leaving it closes it',
      left && (await isListUp()) === fanned,
      `left ${left}; list ${await isListUp()}`,
    );
    // Negative control: 40 px out is twice as far as the box reaches — but only
    // where the line does not curve back and no hotspot sits on that side, so
    // both sides of the line are measured and the clearer one is tapped.
    await closeCard();
    if (trip2.picked) check('  leaving it lets the picked hintuan go', await noPickLeft());
    // A pick glides the camera: back where the tap was measured.
    await jumpTo(page, routeA.point);
    let far = null;
    for (const side of [1, -1]) {
      const [fx, fy] = at(40 * side);
      const at40 = await unproject(page, [fx - box.x, fy - box.y]);
      const kFar = mPerDegLng(at40[1]);
      const clear = Math.min(
        ...snapshot.routes.map((o) => distToLine(at40, o.coords, kFar)),
        distToHotspots(at40, snapshot.polys, kFar),
      );
      if (!far || clear > far.clear) far = { x: fx, y: fy, clear };
    }
    if (far.clear <= BOX_M) {
      skip(
        'a tap 40 px away from every line selects nothing',
        `neither side of the line is clear 40 px out — the nearest thing is ${Math.round(far.clear)} m away, inside the ${Math.round(BOX_M)} m box`,
      );
    } else {
      await mapTap(far.x, far.y);
      await cardsSettled(page);
      check(
        'a tap 40 px away from every line selects nothing',
        (await card().count()) === 0,
        `${Math.round(far.clear)} m clear`,
      );
      const after = (await litIds(page)) ?? [];
      check('  nothing stays lit', after.length === 0, JSON.stringify(after));
    }
    await closeCard();
  }
}

// ------------------------------------------------------------- 3. the chooser
// Two routes sharing a road: a vertex of one that lies within 15 m of another's
// line, with no third route inside the tap box.
/** Handle gestures the runner made no pointer events for, sent again by hand. */
let handleByHand = 0;
if (runsPart(3)) {
  let shared = null;
  for (const r of snapshot.routes) {
    if (shared) break;
    for (const vi of sampleIndices(r.coords.length, 2000 / Math.max(1, snapshot.routes.length))) {
      const p = r.coords[vi];
      const k = mPerDegLng(p[1]);
      const near = routesNear(p, snapshot.routes, BOX_M + 20, k);
      if (near.length !== 2) continue;
      const other = near.find((o) => o.id !== r.id);
      if (!other || !near.some((o) => o.id === r.id)) continue;
      if (distToLine(p, other.coords, k) > 15) continue;
      if (!other.signboard || !r.signboard || other.signboard === r.signboard) continue;
      shared = { a: r, b: other, point: p };
      break;
    }
  }

  // A tap clearly nearest one line is that line's, even with another route's line inside the
  // finger's box; midway between the two, the list asks which (the owner, 2026-11-23: a tap on one
  // route sometimes brought up the list). Found: a route's vertex with one other route's line
  // 13–18 px off at this zoom, inside the ±20 px box, and no third route near.
  let beside = null;
  for (const r of snapshot.routes) {
    if (beside) break;
    for (const vi of sampleIndices(r.coords.length, 2000 / Math.max(1, snapshot.routes.length))) {
      const p = r.coords[vi];
      const k = mPerDegLng(p[1]);
      const near = routesNear(p, snapshot.routes, BOX_M + 20, k);
      const others = near.filter((o) => o.routeId !== r.routeId);
      if (others.length === 0 || new Set(others.map((o) => o.routeId)).size !== 1) continue;
      const d = Math.min(...others.map((o) => distToLine(p, o.coords, k)));
      if (d < 13 * M_PER_PX || d > 18 * M_PER_PX) continue;
      beside = { route: r, other: others[0], point: p };
      break;
    }
  }
  if (!beside) {
    skip(
      'a tap on one line with another route 13–18 px off opens its trip',
      'no route vertex today has one other route 13–18 px off and no third near',
    );
  } else {
    // Where the tap lands, and the nearest point of the other route's line, in screen px.
    await jumpTo(page, beside.point);
    const anchor = await project(page, beside.point);
    const other = await page.evaluate(
      ([q, lines]) => {
        const m = window.__map;
        let best = { x: q[0], y: q[1], d: Infinity };
        for (const coords of lines) {
          const pts = coords.map((c) => m.project(c));
          for (let i = 1; i < pts.length; i++) {
            const [e, f] = [pts[i - 1], pts[i]];
            const ex = f.x - e.x;
            const ey = f.y - e.y;
            const t = Math.max(
              0,
              Math.min(1, ((q[0] - e.x) * ex + (q[1] - e.y) * ey) / (ex * ex + ey * ey || 1)),
            );
            const x = e.x + t * ex;
            const y = e.y + t * ey;
            const d = Math.hypot(q[0] - x, q[1] - y);
            if (d < best.d) best = { x, y, d };
          }
        }
        return best;
      },
      [
        anchor,
        snapshot.routes.filter((o) => o.routeId === beside.other.routeId).map((o) => o.coords),
      ],
    );
    const box = await canvasBox();
    await drawnAt('saved-routes-hit', anchor);
    await mapTap(box.x + anchor[0], box.y + anchor[1]);
    await cardsSettled(page);
    const tripOpen = (await trip().count()) > 0;
    const lit = (await litIds(page)) ?? [];
    const ownIds = snapshot.routes
      .filter((o) => o.routeId === beside.route.routeId)
      .map((o) => o.id);
    const lists = await page.locator('[data-testid="chooser"]:not([hidden])').count();
    check(
      `a tap on "${beside.route.signboard}" with "${beside.other.signboard}" ${Math.round(other.d)} px off opens its trip, no list`,
      tripOpen && lists === 0 && lit.length > 0 && lit.every((id) => ownIds.includes(id)),
      `trip open ${tripOpen}; ${lists} list(s); lit ${JSON.stringify(lit)}`,
    );
    await closeCard();
    // Midway between the two lines: as near one as the other, so the list asks.
    const mid = [(anchor[0] + other.x) / 2, (anchor[1] + other.y) / 2];
    await mapTap(box.x + mid[0], box.y + mid[1]);
    await cardsSettled(page);
    const midLists = await page.locator('[data-testid="chooser"]:not([hidden])').count();
    check(
      '  midway between it and the other line, the list asks which',
      midLists > 0 && (await trip().count()) === 0,
      `${midLists} list(s); trip open ${(await trip().count()) > 0}`,
    );
    await closeCard();
  }

  if (!shared) {
    skip(
      'a tap where two routes share a road opens the chooser',
      'no two routes run within 15 m of each other today, on their own',
    );
  } else {
    await jumpTo(page, shared.point);
    const anchor = await project(page, shared.point);
    const box = await canvasBox();
    await drawnAt('saved-routes-hit', anchor);
    await mapTap(box.x + anchor[0], box.y + anchor[1]);
    await cardsSettled(page);

    const chooser = page.locator('[data-testid="chooser"]');
    const has = (await chooser.count()) > 0;
    check(
      'a tap where two routes share a road opens the chooser',
      has && (await card().count()) === 0,
      has ? '' : `[data-testid="chooser"] count 0; card count ${await card().count()}`,
    );
    // The list's sheet coasts as a card's does: thrown up from its Low from the top of the list
    // (its handle is drawn as none), a hard throw rests higher than a gentle one, both between Low
    // and its highest; a fast flick down takes it back to Low after each. Its highest is its cards'
    // foot, never the screen's top past them (BottomSheet's `fits`; the owner, 2026-11-23): a list
    // shorter than that rises only to its last card, and that is what is checked of it.
    const listTop = async () => {
      const r = await chooser.first().boundingBox();
      return r ? [r.x + r.width / 2, r.y + 24] : null;
    };
    const listRest = () => chooser.first().getAttribute('data-snap');
    // The list opens at the first card's height (the owner, 2026-11-25): to Low first, held.
    if (has && (await listRest()) !== 'low') {
      const f = await listTop();
      if (f) await fingerPan(f[0], f[1], 0, (await shownOf(chooser)) - 40);
      await cardsSettled(page);
    }
    const listLow = has ? await shownOf(chooser) : 0;
    const listThrown = async (steps, gap, isBack = true) => {
      const from = await listTop();
      if (!from || (await listRest()) !== 'low') return null;
      await throwFrom(from[0], from[1], -200, steps, gap);
      const rest = await shownOf(chooser);
      const back = await listTop();
      // A short fast flick down, begun above Low: it lands on Low.
      if (back && isBack) await throwFrom(back[0], back[1], 150, 3, 16);
      return rest;
    };
    // How tall its content stands, from the sheet's top to its last card's foot, and whether every
    // place name is drawn whole (at Low they are cut to a line; raised, never).
    const cardsNow = () =>
      chooser.first().evaluate((el) => {
        const cards = el.querySelectorAll('[data-testid="chooser-origin"]');
        const last = cards[cards.length - 1];
        const tall = last
          ? Math.round(last.getBoundingClientRect().bottom - el.getBoundingClientRect().top)
          : 0;
        const cut = [...el.querySelectorAll('[data-cut-at-low]')].filter(
          (name) => name.scrollHeight > name.clientHeight + 1,
        ).length;
        return { tall, cut };
      });
    const cardsTall = has ? (await cardsNow()).tall : 0;
    const screenFull = has ? await chooser.first().evaluate((el) => el.offsetHeight) : 0;
    const listFull = Math.max(listLow, Math.min(screenFull, cardsTall));
    // A short list, its highest too near Low for a gentle throw (200 px) to stop short of it, is
    // thrown up once, then flicked back down from there on its own check below.
    const isShort = listFull - listLow < 320;
    const gentle = has && !isShort ? await listThrown(12, 30) : null;
    const hard = has ? await listThrown(4, 16, !isShort) : null;
    // Raised, its names drawn whole may stand taller than at Low: its highest is its cards then.
    const raised = has && isShort ? await cardsNow() : null;
    if (isShort) {
      check(
        '  thrown up hard, a short list rises no higher than its last card, every name drawn whole',
        hard !== null &&
          raised !== null &&
          raised.cut === 0 &&
          hard >= listLow - 2 &&
          hard <= Math.max(listFull, Math.min(screenFull, raised.tall)) + 2,
        `hard ${hard} px shown (Low ${listLow}, its cards ${cardsTall} at Low and ${raised?.tall} raised, ${raised?.cut} names cut, the screen ${screenFull}); now data-snap=${await listRest()}`,
      );
      // Flicked down fast from its highest, the finger lifts far below Low: a flick begun above
      // Low rests at Low, as a trip's does, rather than closing (the owner, 2026-11-23).
      const from = await listTop();
      const wasAt = await listRest();
      if (from) await throwFrom(from[0], from[1], 150, 3, 16);
      const isOpen = (await chooser.count()) > 0 && (await chooser.first().isVisible());
      const restsAt = isOpen ? await listRest() : 'closed';
      check(
        '  flicked down fast from its highest, a short list rests at Low, still open',
        !!from && wasAt !== 'low' && restsAt === 'low',
        `from data-snap=${wasAt}; now ${restsAt}`,
      );
    } else
      check(
        '  thrown up from Low, the list coasts: a hard throw rests higher than a gentle one, both between Low and its highest',
        gentle !== null &&
          hard !== null &&
          hard > gentle + 40 &&
          [gentle, hard].every((r) => r >= listLow - 2 && r <= listFull + 2),
        `gentle ${gentle} px, hard ${hard} px shown (Low ${listLow}, highest ${listFull}: its cards ${cardsTall}, the screen ${screenFull}); now data-snap=${await listRest()}`,
      );
    const chooserText = has ? await chooser.first().innerText() : '';
    // The routes' rows, inside their cards: a hotspot under the tap would be a
    // row of the list too, above them.
    const items = chooser.locator(
      '[data-testid="chooser-origin"] button[data-testid="chooser-item"]',
    );
    const itemTexts = [];
    for (let i = 0; i < (await items.count()); i++) itemTexts.push(await items.nth(i).innerText());
    // Since 2026-09-25 the sheet lists the routes one way round under the
    // place they leave from — "Tala", then → SM Fairview — so a route's row is
    // its far end, under a heading that is where it leaves from. Outbound where
    // an outbound line was under the tap, the way back where only ways back
    // were (the rule of 2026-09-25): the shared stretch found may be the two
    // routes' ways back (their way home can take another road), as the
    // owner's Bagong Silang Kanan 5 routes of 2026-09-29 are, both coming home
    // from Philcoa and SM Fairview.
    const endsOf = (name) => name.replace(/ via .*$/, '').split(' – ');
    const wayBack = [shared.a, shared.b].every(
      (r) => fileDirections.find((d) => d.id === r.id)?.reversed === true,
    );
    // Every line under the tap is listed: a route with nothing drawn the way
    // round the list shows is listed by the line that was hit, under the place
    // that leaves from (chooserDepartures), as SM Fairview → Cubao's stretch
    // on Novaliches → Tala lists Novaliches → Tala on the outbound list.
    const isDrawnInFile = (d) => (d.shape?.coordinates?.length ?? 0) > 1;
    /** Whether the list shows route `r` the way back: the list's way if drawn, else its line hit. */
    const shownBack = (r) => {
      const hit = fileDirections.find((d) => d.id === r.id);
      const drawnThatWay = fileDirections.some(
        (d) => d.routeId === hit?.routeId && d.reversed === wayBack && isDrawnInFile(d),
      );
      return drawnThatWay ? wayBack : hit?.reversed === true;
    };
    /** Where a route leaves from and goes to, the way round the list shows it. */
    const shownWay = (r) => {
      const [head, tail] = endsOf(r.signboard);
      return shownBack(r) ? { from: tail, to: head } : { from: head, to: tail };
    };
    // The route list counts its cards, one per place and mode the routes leave from: two jeeps
    // out of Tala are "1 Route", a jeep and a bus out of Tala "2 Routes". It draws no header, so
    // the count is its name for a screen reader. A mode as the cards fold it: P2P wears UV
    // Express's card and the tricycle Jeep's; a train is its own line.
    const cardMode = (r) => {
      const route = fileDirections.find((d) => d.id === r.id)?.route;
      const mode = route?.mode ?? 'jeepney';
      if (mode === 'p2p') return 'uv_express';
      if (mode === 'tricycle') return 'jeepney';
      return mode === 'lrt' || mode === 'mrt' ? (route?.routeCode ?? mode) : mode;
    };
    const cards = new Set(
      [shared.a, shared.b].map((r) => `${shownWay(r).from.toLowerCase()}|${cardMode(r)}`),
    ).size;
    const title = `${cards} ${cards === 1 ? 'Route' : 'Routes'}`;
    const named = has ? await chooser.first().getAttribute('aria-label') : null;
    check(
      `  the list is named "${title}", a card per place and mode`,
      named === title,
      String(named),
    );
    check(
      `  it lists both routes ${wayBack ? 'the way back' : 'outbound'} where drawn so, else the way hit, one row each, under the place each leaves from`,
      itemTexts.length === 2 &&
        [shared.a, shared.b].every((r) => {
          const { from, to } = shownWay(r);
          return chooserText.includes(from) && itemTexts.some((t) => t.includes(to));
        }),
      `${itemTexts.length} row(s): ${itemTexts.map((t) => t.replace(/\n/g, ' / ')).join(' | ')}`,
    );
    // Its row, found in its card: the way back, both rows may read the same
    // place ("→ Bagong Silang Kanan 5"), each under its own card.
    const bWay = shownWay(shared.b);
    const wantedCard = chooser
      .locator('[data-testid="chooser-origin"]')
      .filter({ has: page.locator('[data-testid="chooser-select"]', { hasText: bWay.from }) })
      .first();
    const wanted = wantedCard
      .locator('button[data-testid="chooser-item"]')
      .filter({ hasText: bWay.to });
    const listShown = async () =>
      (await chooser.count()) > 0 && (await chooser.first().isVisible());
    // The colour of the card the row sits on: the trip it opens wears it.
    const cardColour = (await wanted.count()) ? await wantedCard.getAttribute('data-livery') : null;
    // A list lights every route it lists. A tap on a card off its rows — its
    // name — narrows the lights to its routes, and a second lets it go; a row
    // opens its trip straight away, and ‹ comes back to every card at rest
    // (the owner, 2026-09-29).
    const sameSet = (a, b) => {
      const [x, y] = [[...new Set(a)], [...new Set(b)]];
      return x.length === y.length && x.every((id) => y.includes(id));
    };
    const directionsIn = (where) =>
      where
        .locator('button[data-testid="chooser-item"]')
        .evaluateAll((els) => els.map((e) => e.dataset.direction).filter(Boolean));
    const listedIds = has
      ? await directionsIn(chooser.first().locator('[data-testid="chooser-origin"]'))
      : [];
    const litOpen = (await litIds(page)) ?? [];
    check(
      '  it lights every route it lists',
      listedIds.length > 0 && sameSet(litOpen, listedIds),
      `${litOpen.length} lit, ${listedIds.length} listed`,
    );
    // Lit but not open, a list's routes are their highlighted lines alone (the owner, 2026-11-22):
    // no chevron flows, no end is named, and with the camera still nothing is drawn per frame, so
    // the page asks for no animation frame at all. Counted over 2 s, after a settle.
    await cardsSettled(page);
    const quiet = await page.evaluate(async () => {
      const m = window.__map;
      await new Promise((r) => (m.isMoving() ? m.once('idle', r) : r()));
      await new Promise((r) => setTimeout(r, 500));
      let frames = 0;
      const ask = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => {
        frames++;
        return ask(cb);
      };
      await new Promise((r) => setTimeout(r, 2000));
      window.requestAnimationFrame = ask;
      const chevrons = m.getLayer('direction-arrow-chevrons')
        ? m.queryRenderedFeatures({ layers: ['direction-arrow-chevrons'] }).length
        : 0;
      return {
        frames,
        chevrons,
        ends: document.querySelectorAll('[data-testid="end-title"], [data-testid="end-circle"]')
          .length,
      };
    });
    check(
      '  lit but not open, its routes are their lines alone: no chevrons, no ends, no animation frames in 2 s',
      quiet.chevrons === 0 && quiet.ends === 0 && quiet.frames === 0,
      JSON.stringify(quiet),
    );
    const isPicked = async () =>
      (await wanted.count()) > 0 && (await wantedCard.getAttribute('data-state')) === 'selected';
    const wantedName = wantedCard.locator('[data-testid="chooser-select"]');
    // At Low the list shows its first card's top alone (80, 4884:38931): a card further down is
    // brought into reach as a person does, a finger raising the list until it shows, held, no throw.
    const reachInList = async (target) => {
      const box = await target.first().boundingBox();
      const vh = page.viewportSize()?.height ?? 844;
      const list = await chooser.first().boundingBox();
      if (!box || !list || box.y + box.height <= vh - 8) return;
      await fingerPan(list.x + 24, list.y + 24, 0, -(box.y + box.height - vh + 120));
      await cardsSettled(page);
    };
    // At Low a tap on a card opens its trip straight away, as it would higher up (the owner,
    // 2026-11-22); elsewhere on the list it raises it a third.
    const listAt = async () => chooser.first().getAttribute('data-snap');
    const raisedFirst = (await listAt()) === 'low';
    if (raisedFirst) {
      // A finger's tap on the list's first card, the one Low shows: a card further down may sit
      // under the list's foot there. buttonTap's fallback, a click sent straight to the button,
      // comes with no touch before it, as a keyboard's does, and a keyboard's click picks at Low
      // by design.
      const topCard = chooser.first().locator('[data-testid="chooser-origin"]').first();
      // What Low shows of it: its header and its place, its rows below Low's 80;
      // each what a finger at its centre touches.
      const lowShows = await topCard.evaluate((card) => {
        // `within`: what a finger touches there is `el`, or, for the header, which the place's
        // stretched target covers, at least this card and not the list's foot.
        const reaches = (el, within = el) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return !!hit && (within.contains(hit) || hit.contains(el));
        };
        return {
          header: reaches(card.querySelector(':scope > div.px-3'), card),
          place: reaches(card.querySelector('[data-testid="chooser-select"]')),
          firstRow: reaches(card.querySelector('[data-testid="chooser-item"]')),
        };
      });
      check(
        "  at Low, the first card's header and place show (Figma's Low, 4884:38931)",
        lowShows.header && lowShows.place,
        JSON.stringify(lowShows),
      );
      await touchTap(
        topCard.locator('[data-testid="chooser-select"]'),
        async () => (await trip().count()) > 0,
      );
      check(
        '  at Low, a tap on a card opens its trip straight away, the card never Selected',
        (await trip().count()) > 0 && (await topCard.getAttribute('data-state')) !== 'selected',
        `trip open ${(await trip().count()) > 0}; data-state ${await topCard.getAttribute('data-state')}`,
      );
      await leaveTrip(listShown);
    }
    await cardsSettled(page);
    // A tap on a card off its rows opens its first row's trip, its line alone lit; no card is
    // Selected on the public map (the owner, 2026-11-22).
    const firstRow = wantedCard.locator('[data-testid="chooser-item"]').first();
    const firstRowId = (await wanted.count())
      ? await firstRow.getAttribute('data-direction')
      : null;
    await reachInList(wantedName);
    await buttonTap(wantedName, async () => (await trip().count()) > 0);
    const litOpened = (await litIds(page)) ?? [];
    check(
      "  a tap on a card off its rows opens its first row's trip, its line alone lit, nothing Selected",
      (await trip().count()) > 0 &&
        !(await isPicked()) &&
        litOpened.length === 1 &&
        litOpened[0] === firstRowId,
      `trip open ${(await trip().count()) > 0}; Selected ${await isPicked()}; lit ${JSON.stringify(litOpened)}; first row ${firstRowId}`,
    );
    await leaveTrip(listShown);
    // A row opens its own trip; leaving it brings the list back at rest.
    await reachInList(wanted);
    await buttonTap(wanted, async () => (await trip().count()) > 0);
    // The trip card takes the list's place, and the list stays behind it,
    // hidden, for the trip's ‹ (the owner's frames, 2026-09-28).
    const [bHead, bTail] = endsOf(shared.b.signboard);
    const picked = await tripLabel();
    check(
      `  tapping "${shared.b.signboard}" opens its trip in the list's place`,
      picked.includes(bHead) && picked.includes(bTail) && !(await listShown()),
      `card "${picked}", list shown ${await listShown()}`,
    );
    const tripColour = (await trip().count())
      ? await trip().first().getAttribute('data-livery')
      : null;
    check(
      '  the trip wears the colour of the card it was picked from',
      !!cardColour && tripColour === cardColour,
      `card ${cardColour}, trip ${tripColour}`,
    );
    const seenTrip = await rideLook(page);
    const endsTrip = await endsWear(tripColour);
    check(
      '  and so do its line and its end circles',
      wears(seenTrip, LOOKS?.byLivery[tripColour]) && endsTrip.ok,
      `${tripColour}: ${JSON.stringify(seenTrip)}; ${endsTrip.detail}`,
    );
    const trip3 = await tripChecks();
    {
      await leaveTrip(listShown);
      const again = (await listShown()) ? await chooser.first().innerText() : '';
      const litBack = (await litIds(page)) ?? [];
      check(
        '  the empty map tapped on the trip goes back to the list at rest, every route it lists lit',
        again === chooserText &&
          (await card().count()) === 0 &&
          !(await isPicked()) &&
          sameSet(litBack, listedIds),
        again
          ? `card count ${await card().count()}; Selected ${await isPicked()}; ${litBack.length} lit`
          : 'the list did not come back',
      );
      if (trip3.picked) check('  and lets the picked hintuan go', await noPickLeft());
      // A list of one card wears that card's colour; of several, the
      // selected blue (the owner's asks, 2026-09-29 and 2026-10-02).
      const listCards = chooser.first().locator('[data-testid="chooser-origin"]');
      const oneCard =
        (await listCards.count()) === 1
          ? await listCards.first().getAttribute('data-livery')
          : null;
      const seenRest = await rideLook(page);
      // Lit with no trip open: its lines alone, no ends to wear the colour (the owner, 2026-11-22).
      check(
        oneCard
          ? "  and its lines are its one card's colour again"
          : '  and its lines are the selected blue again',
        wears(seenRest, oneCard ? LOOKS?.byLivery[oneCard] : LOOKS?.lit),
        `${oneCard ?? 'blue'}: ${JSON.stringify(seenRest)}`,
      );
      // A tap on the map where the list opened: a fresh list, nothing Selected, every route it
      // lists lit.
      // Where the list opened, brought into the map above the list, where a finger can reach it:
      // centred on the screen it sits under the list.
      await jumpTo(page, shared.point);
      await page.evaluate(async (at) => {
        const m = window.__map;
        const c = m.getCanvas().getBoundingClientRect();
        const list = document.querySelector('[data-testid="chooser"]:not([hidden])');
        const listTop = list ? list.getBoundingClientRect().top : c.bottom;
        const idle = new Promise((r) => {
          m.once('idle', r);
          setTimeout(r, 10000);
        });
        m.panBy([0, m.project(at).y - (listTop - c.top) / 2], { duration: 0 });
        await idle;
      }, shared.point);
      const anchor2 = await project(page, shared.point);
      const box2 = await canvasBox();
      await mapTap(box2.x + anchor2[0], box2.y + anchor2[1]);
      await cardsSettled(page);
      const litTapped = (await litIds(page)) ?? [];
      const pickedAfter = await chooser.locator('[data-state="selected"]').count();
      check(
        '  a map tap where it opened: a fresh list, nothing Selected, every route it lists lit',
        pickedAfter === 0 && (await listShown()) && sameSet(litTapped, listedIds),
        `${pickedAfter} Selected; ${litTapped.length} lit`,
      );
      // The list and the trip opened from it are one height (the owner's ask
      // of 2026-09-30: "if RouteDetail was in medium, if they go back, the
      // RouteCard is in medium too"): raised to full height here, a third a tap,
      // through a pick and ‹.
      const listSnap = async () =>
        (await listShown()) ? await chooser.first().getAttribute('data-snap') : null;
      // The list draws no handle (route-card-list's handle="hidden", kept for the keyboard): a
      // finger raises it by its header, dragged up to the top, as a person does.
      const listBox = await chooser.first().boundingBox();
      if (listBox) {
        const [x, y] = [listBox.x + listBox.width / 2, listBox.y + 24];
        const isOnList = await chooser
          .first()
          .evaluate((node, [px, py]) => node.contains(document.elementFromPoint(px, py)), [x, y]);
        if (!isOnList) await missed("the list's header", `not the topmost thing at (${x}, ${y})`);
        else {
          // To the top of the screen: the list's full height is all of the map (SheetShape).
          const steps = 8;
          const dy = -listBox.y - 8;
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y }],
          });
          for (let i = 1; i <= steps; i++) {
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x, y: y + (dy * i) / steps }],
            });
            await page.waitForTimeout(16);
          }
          // Held still before letting go: a placement, not a flick (BottomSheet's snapFor).
          await page.waitForTimeout(150);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await cardsSettled(page);
        }
      }
      // A trip picked from the list opens at the middle, and ‹ gives the list back at its own
      // height, its top (the owner, 2026-11-25).
      const listAtFull = (await listSnap()) === 'full';
      const listTopPx = await shownOf(chooser);
      await buttonTap(wanted, async () => (await trip().count()) > 0);
      const tripPx = (await trip().count()) ? await shownOf(card()) : null;
      check(
        '  a trip opened from the list at its top opens at the middle (TRIP_OPENS_AT)',
        listAtFull &&
          tripPx !== null &&
          Math.abs(
            tripPx -
              Math.round(
                0.55 *
                  (await card()
                    .first()
                    .evaluate((e) => e.offsetHeight)),
              ),
          ) <= 2,
        `list at full ${listAtFull}, ${listTopPx} px; trip ${tripPx} px, ${await sheetState()}`,
      );
      // No map, or little, shows to tap: the phone's Back leaves it (leaveTrip).
      await leaveTrip(listShown);
      const listBackPx = (await chooser.count()) ? await shownOf(chooser) : null;
      check(
        '  and leaving it brings the list back at its top',
        (await listSnap()) === 'full',
        `list ${await listSnap()}, ${listBackPx} px; was ${listTopPx} px`,
      );
    }
    await closeCard();
  }

  // 4 to 4d on a new phone touched by finger alone; 4e's mouse and 4f's keys each on one of
  // their own (newPhone).
  await newPhone();

  // -------------------------------------------------- 4. hotspots, forgivingly
  // A route drawn right under the tapped pixel wins (the hit line is 18 px wide,
  // so "under" reaches 9 px); a route merely inside the ±20 px box shares the
  // route list with the hotspot; no route near, and the hotspot opens on its own.
  // Hotspots are a few tens of metres across, so this section zooms to 18, where
  // a person tapping a terminal would be, and scales its metres per pixel to match. A build without
  // hotspot taps (VITE_HOTSPOT_TAPS) takes none on a box: 4a and 4b check that no place's card
  // opens, and 4c to 4f, which need one opened from the map, skip.
  const Z_HOT = 18;
  const M_HOT = M_PER_PX / 2 ** (Z_HOT - ZOOM);
  const UNDER_M = 9 * M_HOT + 3 * M_HOT;
  const NEAR_M = 20 * M_HOT + 9 * M_HOT;
  /**
   * The box whose row the HintuanCard has Selected, pressed in (the owner's
   * 3854:12690, 2026-09-30): the one tapped. Its kind shows as the row's
   * colour and letter, where a badge said it before.
   */
  const pressedBox = () =>
    page.evaluate(
      () =>
        document.querySelector('[data-testid="card"] [data-testid="card-box"][aria-pressed="true"]')
          ?.dataset.box ?? null,
    );

  // 4a. Inside a hotspot, on a pixel no route covers, with a route or not in
  // the finger's reach: the box's card opens straight away, alone — one tap,
  // one kind of thing (the owner's ask, 2026-09-30: "select hintuan only show
  // the card, then select route show the route"). Until then a route in reach
  // made it a list, the hotspot first.
  let inside = null;
  for (const poly of snapshot.polys) {
    const c = centroidOf(poly.ring);
    const candidates = [
      c,
      ...poly.ring.map((v) => [c[0] + (v[0] - c[0]) * 0.5, c[1] + (v[1] - c[1]) * 0.5]),
    ];
    for (const p of candidates) {
      if (!pointInPolygon(p, poly.ring)) continue;
      const k = mPerDegLng(p[1]);
      const nearest = Math.min(...snapshot.routes.map((o) => distToLine(p, o.coords, k)), Infinity);
      if (nearest < UNDER_M) continue;
      if (snapshot.polys.some((o) => o.id !== poly.id && pointInPolygon(p, o.ring))) continue;
      const routesInBox = routesNear(p, snapshot.routes, NEAR_M, k);
      inside = { poly, point: p, routesInBox };
      break;
    }
    if (inside) break;
  }

  if (!inside) {
    skip(
      'a tap inside a hotspot opens its card alone',
      snapshot.polys.length
        ? `no point inside a hotspot today is ${Math.round(UNDER_M)} m clear of every route line`
        : 'no hotspots on the map today',
    );
  } else if (!isHotspotTapOn) {
    // The box takes no tap: a route in the finger's reach is what opens, and with none, nothing.
    console.log(
      'SKIP  a tap inside a hotspot opens its card alone, its rows let go and picked: hotspot taps are off in this build (VITE_HOTSPOT_TAPS)',
    );
    const { poly, point, routesInBox } = inside;
    await jumpTo(page, point, Z_HOT);
    const anchor = await project(page, point);
    const box = await canvasBox();
    await mapTap(box.x + anchor[0], box.y + anchor[1]);
    await cardsSettled(page);
    const seen = {
      places: await page.locator('[data-testid="card-place"]').count(),
      cards: await card().count(),
      lists: await page.locator('[data-testid="chooser"]').count(),
    };
    check(
      `hotspot taps off: a tap inside "${poly.name}" opens no place's card${routesInBox.length ? '' : ', nor anything, no route in reach'}`,
      seen.places === 0 && (routesInBox.length > 0 || seen.cards + seen.lists === 0),
      `${JSON.stringify(seen)}; ${routesInBox.length} route(s) in reach`,
    );
    await closeCard();
  } else {
    const { poly, point, routesInBox } = inside;
    await jumpTo(page, point, Z_HOT);
    const anchor = await project(page, point);
    const box = await canvasBox();
    await mapTap(box.x + anchor[0], box.y + anchor[1]);
    await cardsSettled(page);
    const chooser = page.locator('[data-testid="chooser"]');
    const text = await cardText();
    check(
      `a tap inside "${poly.name}" opens its card alone${routesInBox.length ? `, its route in reach not listed` : ''}`,
      text.includes(poly.name) && (await pressedBox()) === poly.id && (await chooser.count()) === 0,
      `${text.split('\n')[0] || '(no card)'}; ${await chooser.count()} list(s); ${routesInBox.length} route(s) in reach`,
    );
    check(`  no chooser for one thing`, (await chooser.count()) === 0);
    // Its Selected row tapped again lets it go, and a tap picks it back (the
    // owner's ask, 2026-10-01): with none Selected, the card lists the routes
    // through every box of the place, at least as many as through this one.
    const ownRow = card().first().locator(`[data-testid="card-box"][data-box="${poly.id}"]`);
    const countOf = async () =>
      Number(
        (
          (await card()
            .first()
            .locator('[data-testid="card-count"]')
            .innerText()
            .catch(() => '0')) || '0'
        ).match(/\d+/)?.[0] ?? 0,
      );
    const boxCount = await countOf();
    // At Low a tap on the top of the body raises the sheet and picks nothing (the app's rule,
    // use-sheet-gestures.ts), its click swallowed: a person raises the card first, a third by its
    // handle, then taps the row.
    if ((await sheetState()) === 'low')
      await buttonTap(handle(), async () => (await sheetState()) !== 'low');
    await buttonTap(ownRow, async () => (await pressedBox()) === null);
    const letGo = {
      pressed: await pressedBox(),
      count: await countOf(),
      open: await card().count(),
    };
    check(
      "  its Selected row tapped again lets it go: no row Selected, the card open, the whole place's routes",
      letGo.pressed === null && letGo.open > 0 && letGo.count >= boxCount,
      `${JSON.stringify(letGo)}; ${boxCount} through the box`,
    );
    await buttonTap(ownRow, async () => (await pressedBox()) === poly.id);
    await page
      .waitForFunction(() => !window.__map.isMoving(), null, { timeout: 4000 })
      .catch(() => {});
    check(
      '  and a tap on it picks it back',
      (await pressedBox()) === poly.id && (await countOf()) === boxCount,
      `${await pressedBox()} pressed; ${await countOf()} routes, ${boxCount} before`,
    );

    // Another box of its place, from its row: that row Selected, the card
    // staying at Max (the owner, 2026-10-01), and the map gone there, the box
    // above where Middle would be (the owner's HintuanCard, 2026-09-30).
    const otherRow = card()
      .first()
      .locator(`[data-testid="card-box"]:not([data-box="${poly.id}"])`);
    const otherId = (await otherRow.count())
      ? await otherRow.first().getAttribute('data-box')
      : null;
    const otherPoly = otherId && snapshot.polys.find((o) => o.id === otherId);
    if (!otherPoly) {
      skip(
        '  another box from its row: Selected, the card staying at full height, the map there',
        `"${poly.name}" is its place's only box`,
      );
    } else {
      const from = (await handleTo('full')) ? 'full' : await sheetState();
      await buttonTap(otherRow.first(), async () => (await pressedBox()) === otherId);
      await cardsSettled(page);
      const at = await project(page, centroidOf(otherPoly.ring));
      const edges = await page.evaluate(() => {
        const c = window.__map.getCanvas().getBoundingClientRect();
        return { top: c.top, cardTop: c.bottom - Math.round(c.height * 0.55) };
      });
      const y = edges.top + at[1];
      check(
        '  another box from its row: Selected, the card staying at full height, the map there above the framed height',
        from === 'full' &&
          (await pressedBox()) === otherId &&
          (await sheetState()) === from &&
          y > edges.top &&
          y < edges.cardTop,
        `from ${from}: ${await pressedBox()} pressed (want ${otherId}), data-snap=${await sheetState()}; the box at ${Math.round(y)}, the framed height from ${Math.round(edges.cardTop)}`,
      );
    }
    await closeCard();
  }

  // 4b. 15 px outside the ring, with no route within reach of the tap at all.
  const RING_CLEAR_M = 15 * M_HOT + NEAR_M + 3 * M_HOT;
  let hotspot = null;
  let bestRingClear = 0;
  for (const poly of snapshot.polys) {
    const c = centroidOf(poly.ring);
    for (const v of poly.ring) {
      const k = mPerDegLng(v[1]);
      const clear = Math.min(...snapshot.routes.map((o) => distToLine(v, o.coords, k)), Infinity);
      if (clear > bestRingClear) bestRingClear = clear;
      if (clear < RING_CLEAR_M) continue;
      if (snapshot.polys.some((o) => o.id !== poly.id && distToLine(v, o.ring, k) < 80)) continue;
      hotspot = { poly, vertex: v, centre: c };
      break;
    }
    if (hotspot) break;
  }

  if (snapshot.polys.length === 0) {
    skip('a tap 15 px outside a hotspot edge still opens it', 'no hotspots on the map today');
  } else if (!hotspot) {
    skip(
      'a tap 15 px outside a hotspot edge still opens it',
      `no hotspot ring vertex today is ${Math.round(RING_CLEAR_M)} m clear of every route line (the best manages ${Math.round(bestRingClear)} m)`,
    );
  } else {
    const { poly, vertex, centre } = hotspot;
    await jumpTo(page, vertex, Z_HOT);
    const anchor = await project(page, vertex);
    const inward = await project(page, centre);
    const dx = anchor[0] - inward[0];
    const dy = anchor[1] - inward[1];
    const len = Math.hypot(dx, dy) || 1;
    const box = await canvasBox();
    const drawn = await drawnAt('saved-stops-fill', inward);
    await mapTap(box.x + anchor[0] + (dx / len) * 15, box.y + anchor[1] + (dy / len) * 15);
    await cardsSettled(page);

    const text = await cardText();
    if (!isHotspotTapOn) {
      // The box takes no tap, and no route is in the tap's reach: it is the empty map's.
      const lists = await page.locator('[data-testid="chooser"]').count();
      check(
        `hotspot taps off: a tap 15 px outside "${poly.name}" opens nothing`,
        (await card().count()) === 0 && lists === 0,
        `${text.split('\n')[0] || '(no card)'}; ${lists} list(s); the box drawn at its centre: ${drawn === 1 ? 'yes' : drawn}`,
      );
    } else {
      check(
        `a tap 15 px outside "${poly.name}" still opens it`,
        text.includes(poly.name),
        `${text.split('\n')[0] || '(no card)'}; the box drawn at its centre: ${drawn === 1 ? 'yes' : drawn}`,
      );
      check(
        `  the card has its row Selected`,
        (await pressedBox()) === poly.id,
        `${await pressedBox()}`,
      );
    }
    await closeCard();
  }

  // ------------------------------------- 4c. the sheet, on a hotspot's card
  // Every card is the one BottomSheet since 2026-09-30, a hotspot's and a
  // trip's alike; these gestures are checked on a hotspot's.
  const pointerdowns = () => page.evaluate(() => window.__pointerdowns);
  /**
   * A gesture on the handle sent by hand, as pointer events: down at (x, y),
   * a move to each of `ys`, up. The mouse's pointer, since a touch's id would
   * have to be a finger on the glass for the handle to capture it.
   */
  const handGesture = (x, y, ys) =>
    page.evaluate(
      async ([x, y, ys]) => {
        const el = document.elementFromPoint(x, y);
        const at = (cy) => ({
          clientX: x,
          clientY: cy,
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
        });
        el.dispatchEvent(new PointerEvent('pointerdown', at(y)));
        for (const cy of ys) el.dispatchEvent(new PointerEvent('pointermove', at(cy)));
        // Held still before letting go, as dragHandle does: a placement, not a flick.
        if (ys.length) await new Promise((r) => setTimeout(r, 150));
        el.dispatchEvent(new PointerEvent('pointerup', at(ys.at(-1) ?? y)));
      },
      [x, y, ys],
    );
  /**
   * A finger's tap on the handle; when the page saw no pointer press from it,
   * the same tap as pointer events sent by hand. What this works around is
   * Chromium's emulated touch (CDP) on a slow runner, not the app: a failing
   * tap gave the page touchstart, gotpointercapture, lostpointercapture and
   * touchend, and no pointerdown, pointerup or click, each with a fresh
   * pointerId, while the app captured and prevented nothing (two probe runs on
   * the runner, draft #1012; .scratch/ci-speed/phone-test-sheet-snap.md). How
   * many needed it is reported at the end. buttonTap and mapTap send a tap
   * again only for that same drop on a target they verified, at most once a part.
   */
  const tapHandle = async () => {
    if ((await handle().count()) === 0) return false;
    const hb = await handle().first().boundingBox();
    if (!hb) return false;
    const [x, y] = [hb.x + hb.width / 2, hb.y + hb.height / 2];
    const seen = await pointerdowns();
    await page.touchscreen.tap(x, y);
    if ((await until(pointerdowns, (n) => n !== seen, 450)) === seen) {
      handleByHand++;
      await handGesture(x, y, []);
    }
    await cardsSettled(page);
    return true;
  };
  /**
   * Drag the handle by dy CSS px. Touch first (CDP), mouse as a fallback. Held
   * still for a moment before letting go, so the sheet settles by how far it was
   * dragged (BottomSheet's snapFor), not by a flick's speed.
   */
  const dragHandle = async (dy) => {
    if ((await handle().count()) === 0) return { ok: false, how: 'no handle' };
    const before = await sheetState();
    const hb = await handle().first().boundingBox();
    if (!hb) return { ok: false, how: 'handle not visible' };
    const x = hb.x + hb.width / 2;
    const y = hb.y + hb.height / 2;
    const steps = 8;
    const seen = await pointerdowns();
    try {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let i = 1; i <= steps; i++) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: y + (dy * i) / steps }],
        });
        await page.waitForTimeout(16);
      }
      await page.waitForTimeout(150);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } catch (e) {
      return { ok: false, how: `Input.dispatchTouchEvent threw: ${String(e).slice(0, 80)}` };
    }
    await cardsSettled(page);
    if ((await sheetState()) !== before || (await card().count()) === 0)
      return { ok: true, how: 'touch' };
    // The sheet ignored the synthetic touch; try the same gesture with a mouse, on a phone not
    // touched by finger alone.
    if (!isTouchOnly) {
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let i = 1; i <= steps; i++) {
        await page.mouse.move(x, y + (dy * i) / steps);
        await page.waitForTimeout(16);
      }
      await page.waitForTimeout(150);
      await page.mouse.up();
      await cardsSettled(page);
    }
    // Neither made a pointer event: the runner's, as with tapHandle.
    if ((await pointerdowns()) === seen) {
      handleByHand++;
      await handGesture(
        x,
        y,
        Array.from({ length: steps }, (_, i) => y + (dy * (i + 1)) / steps),
      );
      await cardsSettled(page);
      return {
        ok: true,
        how: 'by hand (the runner made no pointer events from the touch or the mouse)',
      };
    }
    return isTouchOnly
      ? { ok: true, how: 'touch (the sheet did not move)' }
      : { ok: true, how: 'mouse (the sheet did not answer a synthetic touch drag)' };
  };

  /** Open that hotspot's card again, with the tap 15 px outside its ring that 4b checks. */
  const openSheet = async () => {
    const { vertex, centre } = hotspot;
    await jumpTo(page, vertex, Z_HOT);
    const anchor = await project(page, vertex);
    const inward = await project(page, centre);
    const dx = anchor[0] - inward[0];
    const dy = anchor[1] - inward[1];
    const len = Math.hypot(dx, dy) || 1;
    const box = await canvasBox();
    await mapTap(box.x + anchor[0] + (dx / len) * 15, box.y + anchor[1] + (dy / len) * 15);
    await cardsSettled(page);
  };
  /** Each gesture below is judged on its own, so put the sheet back if one broke it. */
  const restore = async (want) => {
    if ((await card().count()) === 0) await openSheet();
    if (want === 'half') {
      // Low first, then a drag to 55%: no tap rests there.
      if (!(await restore('low'))) return false;
      await dragHandle(await dragTo('low', 'half'));
      return (await sheetState()) === 'free';
    }
    // The handle steps a third, up to full and down again: six taps reach either end.
    for (let i = 0; i < 6 && (await sheetState()) !== want; i++) await tapHandle();
    return (await sheetState()) === want;
  };
  /** How much of the card shows, in px (shownOf). */
  const shownNow = () => shownOf(card());
  /** Where the card should rest at 55% of the map, in px shown. */
  const halfShown = () =>
    card()
      .first()
      .evaluate((el) => Math.round(el.offsetHeight * 0.55));

  /**
   * What the page held when a handle check failed: on some GitHub runs the
   * Philcoa card's first handle tap and drags answered nothing, touch or mouse,
   * and passed on others (2026-09-29) — every card on the page, what lies on
   * top of the handle, and the events the last gestures made there.
   */
  const sheetDiag = () =>
    page.evaluate(() => {
      const name = (el) =>
        el instanceof Element
          ? (el.closest('[data-testid]')?.getAttribute('data-testid') ?? el.tagName.toLowerCase())
          : String(el);
      const cards = [...document.querySelectorAll('[data-testid="card"]')].map(
        (c) =>
          `${c.tagName.toLowerCase()}${c.hidden ? ' hidden' : ''} snap=${c.getAttribute('data-snap')} "${(c.textContent ?? '').trim().slice(0, 30)}"`,
      );
      const h = document.querySelector('[data-testid="card"] button[data-testid="dock-handle"]');
      const r = h?.getBoundingClientRect();
      const top = r
        ? name(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
        : '(no handle)';
      return `cards [${cards.join(' | ')}]; on the handle ${top}; chooser ${document.querySelectorAll('[data-testid="chooser"]').length}; events ${(window.__sheetEvents ?? []).slice(-14).join(', ')}; now ${Math.round(performance.now())}, the last real pointerdown ${window.__lastDown}; odd [${window.__odd.slice(-12).join(', ')}]`;
    });

  if (!hotspot) {
    skip(
      "the sheet handle opens and closes a hotspot's card",
      'no hotspot clear of every route to open a card on (see 4b)',
    );
  } else if (!isHotspotTapOn) {
    // 4c, 4e and 4f open their card by a tap on the map, beside the box (openSheet).
    console.log(
      "SKIP  the sheet's handle, drags and throws, a mouse's drag and Escape, on a hotspot's card: hotspot taps are off in this build (VITE_HOTSPOT_TAPS)",
    );
  } else {
    await page.evaluate(() => {
      window.__sheetEvents = [];
      const t0 = performance.now();
      for (const t of [
        'pointerdown',
        'pointerup',
        'pointercancel',
        'click',
        'contextmenu',
        'touchstart',
        'touchend',
        'touchcancel',
      ])
        document.addEventListener(
          t,
          (e) => {
            const el =
              e.target instanceof Element
                ? (e.target.closest('[data-testid]')?.getAttribute('data-testid') ??
                  e.target.tagName.toLowerCase())
                : '';
            window.__sheetEvents.push(`${Math.round(performance.now() - t0)} ${t}@${el}`);
          },
          true,
        );
    });
    await openSheet();
    // Every card opens at Low (the owner's rule), a hotspot's too.
    check(
      "a hotspot's card opens at Low",
      (await sheetState()) === 'low',
      `data-snap=${await sheetState()}`,
    );

    const hadHandle = await tapHandle();
    const firstTap = hadHandle && (await sheetState()) === 'free';
    check(
      "a tap on a hotspot card's handle raises it a third",
      firstTap,
      hadHandle
        ? `data-snap=${await sheetState()}${firstTap ? '' : `; ${await sheetDiag()}`}`
        : 'no button[data-testid="dock-handle"]',
    );
    const atFull = await restore('full');
    check(
      '  no horizontal scroll with the sheet at full height',
      atFull && (await noHScroll(page)),
    );

    await tapHandle();
    const afterFull =
      (await card().count()) === 0 ? 'the whole card vanished' : `data-snap=${await sheetState()}`;
    check(
      'a tap on the handle at full height steps it down a third',
      atFull && (await sheetState()) === 'free',
      afterFull,
    );

    // From here each gesture starts from a known height, so one broken gesture
    // does not report the next three as broken too. A start that cannot be
    // reached is itself a failure: the drag after it would prove nothing.
    const readyUp = await restore('low');
    const camBeforeDrag = await camNow();
    const up = await dragHandle(await dragTo('low', 'half'));
    const leftAt = await shownNow();
    const want = await halfShown();
    const upRests = readyUp && (await sheetState()) === 'free' && Math.abs(leftAt - want) <= 24;
    check(
      'dragging the handle up from Low leaves it where it was let go',
      upRests,
      `${readyUp ? '' : 'could not get to Low first; '}${up.how}; data-snap=${await sheetState()}, ${leftAt} px shown for ${want}${upRests ? '' : `; ${await sheetDiag()}`}`,
    );
    // A drag of the sheet moves the sheet alone: the camera stays where the commuter left it.
    await page
      .waitForFunction(() => !window.__map.isMoving(), null, { timeout: 3000 })
      .catch(() => {});
    const camAfterDrag = await camNow();
    check(
      '  and the camera stays where it was',
      upRests && sameCamera(camBeforeDrag, camAfterDrag),
      JSON.stringify({ camBeforeDrag, camAfterDrag }),
    );

    const readyDown = await restore('half');
    const down = await dragHandle((await halfShown()) - 133 - 40);
    check(
      "dragging it down to within Low's magnet settles at Low",
      readyDown && (await sheetState()) === 'low',
      `${readyDown ? '' : 'could not get to half first; '}${down.how}; data-snap=${await sheetState()}`,
    );

    const readyFull = await restore('half');
    const upFull = await dragHandle(await dragTo('half', 'full'));
    check(
      'dragging it up to the top rests at full height',
      readyFull && (await sheetState()) === 'full',
      `${readyFull ? '' : 'could not get to half first; '}${upFull.how}; data-snap=${await sheetState()}`,
    );

    // Momentum (glideTo): thrown, the sheet coasts on from where the finger lifts, slowing
    // evenly, further the faster, and rests between Low and full. The same release point, a slow
    // throw and a fast one, each let go while moving: no hold before the lift.
    /** The handle thrown by `dy` px over `steps` moves `gap` ms apart (throwFrom); then shown. */
    const throwHandle = async (dy, steps, gap) => {
      const hb = await handle().first().boundingBox();
      if (!hb) return null;
      await throwFrom(hb.x + hb.width / 2, hb.y + hb.height / 2, dy, steps, gap);
      return (await card().count()) > 0 ? shownNow() : null;
    };
    const fullShown = () =>
      card()
        .first()
        .evaluate((el) => el.offsetHeight - 24);
    const readySlow = await restore('low');
    const slowRest = readySlow ? await throwHandle(-200, 12, 30) : null;
    const readyFast = await restore('low');
    const fastRest = readyFast ? await throwHandle(-200, 4, 16) : null;
    const top = await fullShown();
    check(
      'thrown up from Low, a fast throw rests higher than a slow one, both between Low and full',
      slowRest !== null &&
        fastRest !== null &&
        fastRest > slowRest + 40 &&
        [slowRest, fastRest].every((r) => r >= 133 - 2 && r <= top + 2),
      `slow ${slowRest} px, fast ${fastRest} px shown (Low 133, full ${top})`,
    );
    const readyFlick = await restore('half');
    await throwHandle(300, 3, 16);
    check(
      '  a fast flick down still takes it to Low',
      readyFlick && (await sheetState()) === 'low',
      `data-snap=${await sheetState()}`,
    );

    const readyLow = await restore('low');
    const down2 = await dragHandle(120);
    check(
      'dragging down past Low dismisses the card',
      readyLow && (await card().count()) === 0,
      `${readyLow ? '' : 'could not get to Low first; '}${down2.how}; [data-testid="card"] count ${await card().count()}`,
    );
    await closeCard();
    // The watch for the click the browser sends after a handle tap must end
    // with the next tap, or the ✕ pressed right after would be lost too.
    const readyClose = await restore('low');
    await tapHandle();
    const cb = await card().getByRole('button', { name: 'Close' }).first().boundingBox();
    if (cb) {
      const [cx, cy] = [cb.x + cb.width / 2, cb.y + cb.height / 2];
      const seen = await pointerdowns();
      await page.touchscreen.tap(cx, cy);
      await until(pointerdowns, (n) => n !== seen, 400);
      await cardsSettled(page);
      // The runner dropped the touch, as tapHandle allows for: the same tap by
      // hand — a press, which ends the watch, then its click — so what is
      // checked is still the watch, not a bare click. The mouse's pointer, as
      // handGesture's, since the sheet may capture it.
      if ((await card().count()) > 0 && (await pointerdowns()) === seen) {
        handleByHand++;
        await page.evaluate(
          ([x, y]) => {
            const el = document.elementFromPoint(x, y);
            const at = {
              clientX: x,
              clientY: y,
              bubbles: true,
              cancelable: true,
              pointerId: 1,
              pointerType: 'mouse',
              isPrimary: true,
            };
            el?.dispatchEvent(new PointerEvent('pointerdown', at));
            el?.dispatchEvent(new PointerEvent('pointerup', at));
            el?.dispatchEvent(new MouseEvent('click', { ...at, detail: 1 }));
          },
          [cx, cy],
        );
        await cardsSettled(page);
      }
    }
    check(
      '✕ pressed right after a handle tap still closes the card',
      readyClose && !!cb && (await card().count()) === 0,
      `[data-testid="card"] count ${await card().count()}`,
    );
    await closeCard();
  }

  // ------------------------- 4d. the handle, on a hotspot's card with routes
  // Raised, a hotspot's card shows its routes where the finger was, and the
  // click that follows the tap on the handle must not open one (seen
  // 2026-09-29: it did, with the old rows and the RouteCards alike). 4c's
  // hotspot is chosen clear of every route, so it has none to fall on.
  const drawnIds = new Set(
    fileDirections.filter((d) => (d.shape?.coordinates?.length ?? 0) > 1).map((d) => d.id),
  );
  const withRoutes = snapshot.polys.find((poly) =>
    (published?.links ?? []).some((l) => l.hotspotId === poly.id && drawnIds.has(l.directionId)),
  );
  if (!withRoutes) {
    skip(
      'a tap on the handle of a hotspot card with routes raises it, opening none',
      published
        ? 'no hotspot has a drawn route linked today'
        : 'the published map could not be read',
    );
  } else if (!isHotspotTapOn) {
    console.log(
      'SKIP  a tap on the handle of a hotspot card with routes raises it, opening none, its late click reaching nothing: hotspot taps are off in this build (VITE_HOTSPOT_TAPS)',
    );
  } else {
    const c = centroidOf(withRoutes.ring);
    await jumpTo(page, c, Z_HOT);
    const at = await project(page, c);
    const box = await canvasBox();
    await mapTap(box.x + at[0], box.y + at[1]);
    await cardsSettled(page);
    // A route under the finger shares the tap: the list asks, and its row opens the box.
    const chooser = page.locator('[data-testid="chooser"]');
    if ((await chooser.count()) > 0) {
      await buttonTap(
        chooser.locator('button[data-testid="chooser-item"]').filter({ hasText: withRoutes.name }),
        async () => (await chooser.count()) === 0,
      );
    }
    const atLow = (await cardText()).includes(withRoutes.name) && (await sheetState()) === 'low';
    await tapHandle();
    check(
      `a tap on the handle of "${withRoutes.name}"'s card, with routes, raises it a third, opening none`,
      atLow && (await sheetState()) === 'free' && (await trip().count()) === 0,
      `opened at Low ${atLow}; now data-snap=${await sheetState()}, trip ${await trip().count()}`,
    );
    // On a busy page that click comes long after the finger lifts — a second on
    // GitHub's runners once the Philcoa card's routes flowed (2026-09-29), when
    // the sheet gave up on it after 300 ms — and is still the tap's: pulled down,
    // it would land on the map and close the card; pulled up, on a route.
    // Holding the page busy in the pointerup did not make it late here —
    // Chromium still sent the click before the overdue timer (2026-09-29) — so
    // this tap is sent by hand, its click a second after it, to whatever is
    // then under the finger. What that click would do there varies
    // (the hotspot under the finger opens the same card again; a RouteCard's
    // name only lights it), so the check is that it reached nothing at all.
    /** What the late click reached, '' if it was swallowed; null with no handle to tap. */
    const lateClickTap = async () => {
      const hb = (await handle().count()) ? await handle().first().boundingBox() : null;
      if (!hb) return null;
      const reached = await page.evaluate(
        async ([x, y]) => {
          // The mouse's pointer: a touch's id would have to be a finger on the glass for the handle to capture it.
          const at = {
            clientX: x,
            clientY: y,
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
          };
          const el = document.elementFromPoint(x, y);
          el.dispatchEvent(new PointerEvent('pointerdown', at));
          el.dispatchEvent(new PointerEvent('pointerup', at));
          await new Promise((r) => setTimeout(r, 1000));
          const under = document.elementFromPoint(x, y);
          if (!under) return '(nothing under the finger)';
          // Heard where it lands: the sheet swallows the tap's click on its way down, before it gets there.
          let through = false;
          const heard = () => (through = true);
          under.addEventListener('click', heard);
          under.dispatchEvent(
            new MouseEvent('click', {
              clientX: x,
              clientY: y,
              bubbles: true,
              cancelable: true,
              detail: 1,
            }),
          );
          under.removeEventListener('click', heard);
          return through
            ? (under.closest('[data-testid]')?.getAttribute('data-testid') ??
                under.tagName.toLowerCase())
            : '';
        },
        [hb.x + hb.width / 2, hb.y + hb.height / 2],
      );
      await settled();
      await cardsSettled(page);
      return reached;
    };
    const shownBeforeLate = await shownNow();
    const lateDown = await lateClickTap();
    const shownAfterLate = await shownNow();
    check(
      '  a tap whose click comes a second late steps the sheet on, the click reaching nothing',
      lateDown === '' && (await card().count()) === 1 && shownAfterLate !== shownBeforeLate,
      `${lateDown === null ? 'no handle' : lateDown ? `the click reached ${lateDown}` : 'swallowed'}; data-snap=${await sheetState()}, ${shownBeforeLate} → ${shownAfterLate} px`,
    );
    const lateUp = await lateClickTap();
    check(
      '  and steps it on again, the click reaching nothing',
      lateUp === '' && (await shownNow()) !== shownAfterLate && (await trip().count()) === 0,
      `${lateUp === null ? 'no handle' : lateUp ? `the click reached ${lateUp}` : 'swallowed'}; data-snap=${await sheetState()}, trip ${await trip().count()}`,
    );
    await closeCard();
  }

  // ----------------------------------------------- 4e. the handle, by a mouse
  // On a phone of its own, not touched by finger alone (newPhone).
  if (hotspot && isHotspotTapOn) {
    await newPhone({ isTouchOnly: false });
    // A mouse's drag, on a narrow window: the browser then clicks the handle it
    // was held on, and that click toggled the sheet straight back — pulled up,
    // it fell to peek, as it was then (the reviewer's note, fixed on the owner's word,
    // 2026-09-29). The drags above go by touch whenever the page answers it.
    const mouseDrag = async (dy) => {
      const hb = await handle().first().boundingBox();
      if (!hb) return false;
      const [x, y] = [hb.x + hb.width / 2, hb.y + hb.height / 2];
      const seen = await pointerdowns();
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let i = 1; i <= 8; i++) {
        await page.mouse.move(x, y + (dy * i) / 8);
        await page.waitForTimeout(16);
      }
      await page.waitForTimeout(150);
      await page.mouse.up();
      await cardsSettled(page);
      // The mouse made no pointer event: the runner's, as with tapHandle. The
      // same drag by hand, then the click a mouse sends after one — on the
      // handle it was held on, where it let go — which is the click this check
      // is for.
      if ((await pointerdowns()) === seen) {
        handleByHand++;
        await handGesture(
          x,
          y,
          Array.from({ length: 8 }, (_, i) => y + (dy * (i + 1)) / 8),
        );
        await page.evaluate(
          ([x, y]) => {
            const h = document.querySelector(
              '[data-testid="card"] button[data-testid="dock-handle"]',
            );
            h?.dispatchEvent(
              new MouseEvent('click', {
                clientX: x,
                clientY: y,
                bubbles: true,
                cancelable: true,
                detail: 1,
              }),
            );
          },
          [x, y + dy],
        );
        await cardsSettled(page);
      }
      return true;
    };
    const readyMouseUp = await restore('low');
    const mouseUp = await mouseDrag(await dragTo('low', 'half'));
    const mouseOpened = readyMouseUp && mouseUp && (await sheetState()) === 'free';
    check(
      'a mouse dragging the handle up from Low leaves the sheet where it let go',
      mouseOpened,
      `data-snap=${await sheetState()}${mouseOpened ? '' : `; ${await sheetDiag()}`}`,
    );
    const readyMouseDown = await restore('half');
    const mouseDown = await mouseDrag(await dragTo('half', 'low'));
    check(
      '  and dragging it down leaves it at Low',
      readyMouseDown && mouseDown && (await sheetState()) === 'low',
      `data-snap=${await sheetState()}`,
    );
    await closeCard();
  }

  // ---------------------------------------------- 4f. a hotspot's card, by keys
  // On a phone of its own (newPhone): Escape, the keyboard's close, takes the card away, and focus
  // goes back to what had it as the card opened (useDialogFocus): the map, which the tap that
  // opened it focused. The card is opened by one tap, the phone's first input, before any key.
  if (hotspot && isHotspotTapOn) {
    await newPhone({ isTouchOnly: false });
    await openSheet();
    const isOpen = (await card().count()) > 0;
    await page.keyboard.press('Escape');
    const isClosed = await card()
      .first()
      .waitFor({ state: 'detached', timeout: 5000 })
      .then(
        () => true,
        () => false,
      );
    const focus = await page.evaluate(() => ({
      isOnMap: document.activeElement === window.__map?.getCanvas(),
      now: document.activeElement?.tagName ?? 'none',
    }));
    check(
      "Escape closes a hotspot's card, focus back on the map the tap opened it from",
      isOpen && isClosed && focus.isOnMap,
      `opened ${isOpen}; closed ${isClosed}; focus on ${focus.now}`,
    );
  }

  // --------------------------------------- 4g. the route list, raised by keys
  // On a phone of its own (newPhone): raised to full from the keyboard (Enter on the list's handle,
  // drawn in the flow only while so focused), a finger's tap still lands where it was made. The
  // handle stays shown until the click has landed, so nothing moves between the press and the
  // click; before, it folded away as the tap took the focus, everything under the finger moved up
  // by its height, and the click reached neither the card pressed nor what was then under it.
  if (shared) {
    await newPhone({ isTouchOnly: false });
    const chooser = page.locator('[data-testid="chooser"]');
    const listAt = async () => chooser.first().getAttribute('data-snap');
    const openList = async () => {
      await jumpTo(page, shared.point);
      const anchor = await project(page, shared.point);
      const box = await canvasBox();
      await drawnAt('saved-routes-hit', anchor);
      await mapTap(box.x + anchor[0], box.y + anchor[1]);
      await cardsSettled(page);
      return (await chooser.count()) > 0;
    };
    const listHandle = chooser.first().locator('[data-testid="dock-handle"]');
    // Whether it got to full with the handle shown, focused from the keyboard: the case to check.
    const keysToFull = async () => {
      for (let i = 0; i < 4 && (await listAt()) !== 'full'; i++) {
        await listHandle.focus();
        await page.keyboard.press('Enter');
        await cardsSettled(page);
      }
      return (
        (await listAt()) === 'full' &&
        (await listHandle.evaluate(
          (el) => el.matches(':focus-visible') && el.getBoundingClientRect().height > 1,
        ))
      );
    };
    // A tap sent by hand (Chromium dropped the touch) goes to the button itself and would pass
    // with or without the shift: then the check is skipped, not passed.
    const byFinger = async (name, locator, done) => {
      const drops = chromiumDrops;
      await touchTap(locator, done);
      if (chromiumDrops !== drops) {
        skip(name, 'Chromium made no pointer events from the touch, so the tap went by hand');
        return null;
      }
      return await done();
    };
    const cardName = 'raised to full by Enter on its handle, a tap on a card opens its trip';
    const isListed = await openList();
    const byKeys = isListed && (await keysToFull());
    const topName = chooser.first().locator('[data-testid="chooser-select"]').first();
    const opened = await byFinger(cardName, topName, async () => (await trip().count()) > 0);
    if (opened !== null)
      check(
        cardName,
        byKeys && opened,
        `list open ${isListed}; raised by keys, its handle shown ${byKeys}; trip open ${opened}`,
      );
    await closeCard();
    const rowName = 'raised to full by Enter on its handle, a tap on a row opens its trip';
    const isListedAgain = await openList();
    const byKeysAgain = isListedAgain && (await keysToFull());
    const firstRow = chooser.first().locator('[data-testid="chooser-item"]').first();
    const rowOpened = await byFinger(rowName, firstRow, async () => (await trip().count()) > 0);
    if (rowOpened !== null)
      check(
        rowName,
        byKeysAgain && rowOpened,
        `list open ${isListedAgain}; raised by keys, its handle shown ${byKeysAgain}; trip open ${rowOpened}`,
      );
    await closeCard();
    // And raised to full by a finger's drag up the list from its first card, held before letting go.
    const fingerName = 'raised to full by a finger, a tap on a card opens its trip';
    const isListedThird = await openList();
    const cardBox = await chooser
      .first()
      .locator('[data-testid="chooser-origin"]')
      .first()
      .boundingBox();
    if (cardBox)
      await fingerPan(cardBox.x + cardBox.width / 2, cardBox.y + 40, 0, -(cardBox.y + 80));
    await cardsSettled(page);
    const isFullByFinger = (await listAt()) === 'full';
    const fingerOpened = await byFinger(
      fingerName,
      topName,
      async () => (await trip().count()) > 0,
    );
    if (fingerOpened !== null)
      check(
        fingerName,
        isListedThird && isFullByFinger && fingerOpened,
        `list open ${isListedThird}; full by a finger ${isFullByFinger}; trip open ${fingerOpened}`,
      );
    await closeCard();
  }

  // Run whole, the sections after this one go on a phone touched by finger alone again.
  if (PHONE_PARTS === 1) await newPhone();

  // Overlapping hotspots share the list; today's data has none.
  const overlapping = snapshot.polys.some((a) =>
    snapshot.polys.some(
      (bPoly) => bPoly.id !== a.id && a.ring.some((v) => pointInPolygon(v, bPoly.ring)),
    ),
  );
  if (!overlapping)
    skip('two overlapping hotspots open the list', 'no two hotspot polygons overlap today');
}

// ---------------------------------------- 5. a trip opened by a tap, framed by the Overview
// Trip links (?r=<id>) went on 2026-10-03, the owner's "remove that for
// now": the address stays as it was. A trip opened by a tap on its own line
// leaves the camera where it was, and the Overview frames it when asked (the
// owner, 2026-11-23: choosing a route never moves the map).
if (runsPart(1)) {
  if (!routeA) {
    skip('a trip opened by a tap leaves the address as it was', 'no lone route vertex to select');
  } else {
    await jumpTo(page, routeA.point);
    const anchor = await project(page, routeA.point);
    const perp = await perpendicular(page, routeA.point, routeA.neighbour, routeA.route.coords, 40);
    const box = await canvasBox();
    const camBeforeOpen = await camNow();
    await mapTap(box.x + anchor[0] + perp[0] * 14, box.y + anchor[1] + perp[1] * 14);
    await cardsSettled(page);
    check(
      'a trip opened by a tap leaves the address as it was: no trip link',
      new URL(page.url()).search === '',
      page.url().slice(BASE.length) || '/',
    );
    // The direction the card opened (the tap may open the route's other way).
    const opened = await openedDirection();
    const r = opened && snapshot.routes.find((o) => o.id === opened.id);
    if (!r)
      skip(
        '  the camera stays where it was, and the Overview frames the whole route',
        `no direction named "${await tripLabel()}" on the map`,
      );
    else {
      // Opened, the camera stays where it was, and the Overview is offered.
      await page
        .waitForFunction(() => !window.__map.isMoving(), null, { timeout: 5000 })
        .catch(() => {});
      const camAfterOpen = await camNow();
      const overviewAtOpen = await page.getByRole('button', { name: 'Overview' }).isVisible();
      check(
        '  the camera stays where it was, and the Overview is offered',
        sameCamera(camBeforeOpen, camAfterOpen) && overviewAtOpen,
        JSON.stringify({ camBeforeOpen, camAfterOpen, overviewAtOpen }),
      );
      // A guard on the trip as it is drawn: at full height, every stop shown, so that it runs past
      // the screen, scrolled to its end, its last row is in reach, as when a Controller stood over
      // the sheet's foot. BottomSheet's stories (FooterLastRowClear) prove a footer's padding.
      const tripEnd = (await handleTo('full'))
        ? await endClearsFooter('[data-testid="card"]')
        : { ok: false, why: `the trip would not go to full: data-snap=${await sheetState()}` };
      check(
        "  on a small phone at full height: the trip's last row clears the footer",
        tripEnd.ok,
        JSON.stringify(tripEnd),
      );

      // The sheet at another height leaves the camera where it is: the camera is the
      // commuter's until they ask, by the Overview button.
      const toFull = await handleTo('full');
      const camAtFull = await camNow();
      const toLow = toFull && (await handleTo('low'));
      const camAtLow = await camNow();
      check(
        '  the sheet up to full height, then Low: the camera stays where it was',
        toLow && sameCamera(camAfterOpen, camAtFull) && sameCamera(camAfterOpen, camAtLow),
        toLow
          ? JSON.stringify({ camAfterOpen, camAtFull, camAtLow })
          : `the handle would not step there: data-snap=${await sheetState()}`,
      );
      // The sheet stepped and the screen resized (the small phone above, and back): nothing has
      // framed the route, so the Overview button still shows; pressed, it takes the whole route in
      // above the sheet, and hides once there.
      const overview = page.getByRole('button', { name: 'Overview' });
      check(
        '  the sheet stepped and the screen resized: Overview still shows',
        await overview.isVisible(),
      );
      const pressed = await buttonTap(overview, async () => !(await overview.isVisible()));
      await page
        .waitForFunction(() => !window.__map.isMoving(), null, { timeout: 5000 })
        .catch(() => {});
      const fitted = await framedAboveCard(r.bbox);
      check(
        '  Overview pressed: the whole route above the sheet, and the button gone',
        pressed && fitted.inside && !(await overview.isVisible()),
        JSON.stringify(fitted),
      );
      // A finger's pan takes the camera off the overview: the button again.
      await fingerPan(195, 300, -90, -60);
      check(
        '  the map panned by a finger: Overview shows again',
        (await until(() => overview.isVisible(), Boolean, 3000)) === true,
      );
      // Pressed while it has focus, it hides: focus goes on to the map, not to the page's body.
      await overview.focus();
      await buttonTap(overview, async () => !(await overview.isVisible()));
      const focusOn = await page.evaluate(
        () => document.activeElement?.classList.contains('maplibregl-canvas') ?? false,
      );
      check(
        '  Overview pressed with focus on it: it hides, and focus goes to the map, not lost',
        !(await overview.isVisible()) && focusOn,
        `focus on the map: ${focusOn}`,
      );

      // Opened on its own, no list is behind the trip: leaving it lists the routes sharing an end
      // only where another is drawn its way round (the owner's ask, 2026-09-29).
      const fannedR = fanOf(r.id).length > 1;
      const leftR = await leaveTrip(async () => (await trip().count()) === 0);
      const listedR = (await page.locator('[data-testid="chooser"]:not([hidden])').count()) > 0;
      check(
        fannedR
          ? '  opened on its own, leaving the trip lists the routes sharing an end'
          : '  opened on its own, leaving the trip closes it: no other route sharing an end runs its way',
        leftR && listedR === fannedR,
        `left ${leftR}; list ${listedR}`,
      );
    }
    await closeCard();
  }
}

// ------------------------------------------ 5b. ‹ on a trip opened on its own
// A trip opened by a tap on its own line has no list behind it. Where other routes sharing
// its head or its tail are drawn its way round, ‹ lists them the way the trip
// goes, as a tap where they all run would: Tala → Novaliches ‹ to Tala's
// card, "1 Route", Novaliches and SM Fairview (the owner's ask, 2026-09-29).
// A drawn direction (a slot has no line to tap, and its fan would leave it
// out), one a tap can open alone: the first of up to ten that does.
if (runsPart(2)) {
  const fannedCandidates = fileDirections.filter(
    (d) => (d.shape?.coordinates?.length ?? 0) > 1 && fanOf(d.id).length > 1,
  );
  let fannedOne = null;
  for (const d of fannedCandidates.slice(0, 10))
    if (await openAlone(d)) {
      fannedOne = d;
      break;
    }
  if (!fannedOne) {
    skip(
      'a trip opened on its own, left by the empty map, lists the routes sharing an end',
      !published
        ? 'the published map could not be read'
        : fannedCandidates.length
          ? 'none of those routes has a stretch of line a tap could open alone'
          : 'no two routes sharing an end are drawn the same way round today',
    );
  } else {
    const fan = fanOf(fannedOne.id);
    // The trip opens once its line is read: on a slow runner, after the map.
    await trip()
      .first()
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(() => {});
    const opened = await tripLabel();
    const openedColour = (await trip().count())
      ? await trip().first().getAttribute('data-livery')
      : null;
    const chooser = page.locator('[data-testid="chooser"]');
    const listShown = async () =>
      (await chooser.count()) > 0 && (await chooser.first().isVisible());
    const tapped = await leaveTrip(listShown);
    check(
      `a trip opened on its own, "${opened}", left by the empty map, lists the routes sharing an end`,
      tapped && (await listShown()) && (await trip().count()) === 0,
      `list shown ${await listShown()}, trip ${await trip().count()}`,
    );
    if (await listShown()) {
      // A card per place they leave from, the way the trip went; a row for each.
      const ends = fan.map((d) => (d.name ?? '').split(' → '));
      const places = new Set(ends.map(([from = '']) => from.toLowerCase())).size;
      const title = `${places} ${places === 1 ? 'Route' : 'Routes'}`;
      const named = await chooser.first().getAttribute('aria-label');
      check(`  named "${title}", a card per place`, named === title, String(named));
      const items = chooser.locator('button[data-testid="chooser-item"]');
      const rows = [];
      for (let i = 0; i < (await items.count()); i++)
        rows.push((await items.nth(i).innerText()).trim());
      check(
        "  a row for each, where it goes, the trip's own among them",
        rows.length === fan.length && ends.every(([, to = '']) => rows.some((t) => t.includes(to))),
        rows.join(' | '),
      );
      const lit = ((await litIds(page)) ?? []).sort();
      check(
        '  and lit, as a tap where they all run would light them',
        JSON.stringify(lit) === JSON.stringify(fan.map((d) => d.id).sort()),
        JSON.stringify(lit),
      );
      // One place, one card: it wears the colour the trip wore — the list
      // leads with the trip's route (sharingAnEnd), a card wears its first
      // row's route's colour (liveries.ts), and the trip's route was drawn as
      // it opened.
      if (places === 1) {
        const listColour = await chooser
          .locator('[data-livery]')
          .first()
          .getAttribute('data-livery');
        check(
          "  its card wears the trip's colour",
          !!openedColour && listColour === openedColour,
          `trip ${openedColour}, card ${listColour}`,
        );
      }
    }
    await closeCard();
  }

  // ------------------------------------------- 5c. "Other routes" under a trip
  // The other drawn routes out of where a trip starts, one row each by where it
  // goes; a tap opens that route's trip in the card's place, its line alone
  // lit (the owner's TimelineRouteDetailCard, 3778:3183, 2026-10-01).
  const startOf = (d) => (d.reversed ? d.route?.tailHotspotId : d.route?.headHotspotId) ?? null;
  const drawnDirection = (d) => (d.shape?.coordinates?.length ?? 0) > 1;
  const othersOf = (d) =>
    fileDirections.filter(
      (o) =>
        o.routeId !== d.routeId && drawnDirection(o) && !!startOf(d) && startOf(o) === startOf(d),
    );
  // Opened by a tap on its own line: the first of up to ten that a tap can open alone.
  const othersCandidates = fileDirections.filter(
    (d) => drawnDirection(d) && othersOf(d).length > 0,
  );
  let withOthers = null;
  for (const d of othersCandidates.slice(0, 10))
    if (await openAlone(d)) {
      withOthers = d;
      break;
    }
  if (!withOthers) {
    skip(
      'a trip lists the other routes out of where it starts',
      !published
        ? 'the published map could not be read'
        : othersCandidates.length
          ? 'none of those routes has a stretch of line a tap could open alone'
          : 'no two drawn routes leave one hotspot today',
    );
  } else {
    const others = othersOf(withOthers);
    const rows = card().locator('[data-testid="trip-other-route"]');
    const shown = await rows.evaluateAll((els) => els.map((e) => e.dataset.direction));
    check(
      `a trip, "${await tripLabel()}", lists the other routes out of where it starts`,
      shown.length === others.length && others.every((o) => shown.includes(o.id)),
      `${shown.length} row(s), want ${others.length}`,
    );
    const to = others[0];
    const toName = (to.name ?? '').split(' → ')[1] ?? '';
    // At full height: another route leaves the sheet there (the owner's rule: nothing moves it for
    // the commuter).
    const atFull = await handleTo('full');
    // The rows sit behind "View N more destinations" at the top of the trip: opened first, its
    // aria-expanded turning true.
    const moreRoutes = card().locator('[data-testid="trip-more-routes"]');
    await moreRoutes.scrollIntoViewIfNeeded();
    await buttonTap(
      moreRoutes,
      async () => (await moreRoutes.getAttribute('aria-expanded')) === 'true',
    );
    const expanded = await moreRoutes.getAttribute('aria-expanded');
    check('  "View N more destinations" opens the list', expanded === 'true', String(expanded));
    // Scrolled to the sheet's middle, as a person brings a row up to tap it: "if needed" counts a
    // row under the Controller, which floats over the sheet's foot, as already in view.
    await card()
      .locator(`[data-testid="trip-other-route"][data-direction="${to.id}"]`)
      .evaluate((row) => row.scrollIntoView({ block: 'center' }));
    await buttonTap(
      card().locator(`[data-testid="trip-other-route"][data-direction="${to.id}"]`),
      async () => ((await litIds(page)) ?? []).join() === to.id,
    );
    const now = await tripLabel();
    const lit = (await litIds(page)) ?? [];
    check(
      "  a tap opens that route's trip in the card's place, its line alone lit",
      now.endsWith(toName) && lit.length === 1 && lit[0] === to.id,
      JSON.stringify({ trip: now, lit, want: to.id }),
    );
    if (!atFull)
      check(
        '  at full height, the sheet stays there',
        false,
        `the card would not rise to full: data-snap=${await sheetState()}`,
      );
    else
      check(
        '  at full height, the sheet stays there',
        (await sheetState()) === 'full',
        `data-snap=${await sheetState()}`,
      );
    await closeCard();
  }

  // ----------------------- 5d. the ride, SWITCH and a terminal, on a made-up map
  // The trip's own checks above run on whichever route today's map lets a tap
  // find, and skip what that route lacks: SWITCH where its other way is not
  // drawn, the fold and the ride where it has no hintuans. Here the same checks
  // run on a map made for them (fixtures/two-way-map.mjs): one route drawn both
  // ways, four hintuans each way, a terminal at either end. Served in place of
  // the index and its line files on this same page, so every helper above
  // reads it as it reads today's map.
  console.log('\n(on the made-up map: fixtures/two-way-map.mjs)\n');
  onMadeUpMap = true;
  await closeCard();
  await serveTwoWayMap(page);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__map && window.__map.loaded(), null, { timeout: 30000 });
  // The made-up map's two directions, not a copy of today's kept from before.
  await page.waitForFunction(
    () => document.querySelector('[data-directions]')?.getAttribute('data-directions') === '2',
    null,
    { timeout: 30000 },
  );
  await waitForSource(page, 'saved-routes');
  {
    await jumpTo(page, PAPUNTA_TAP);
    const [x, y] = await project(page, PAPUNTA_TAP);
    const box = await canvasBox();
    await mapTap(box.x + x, box.y + y);
    await page
      .waitForFunction(
        () => !!document.querySelector('[data-testid="card"] [data-testid="trip"]'),
        null,
        {
          timeout: 10000,
        },
      )
      .catch(() => {});
    const lit = (await litIds(page)) ?? [];
    check(
      'on the made-up map, a tap on its line opens its trip, Papunta lit',
      (await trip().count()) > 0 && lit.length === 1 && lit[0] === PAPUNTA_ID,
      `"${await tripLabel()}"; lit ${JSON.stringify(lit)}`,
    );
    if ((await trip().count()) > 0) {
      // The pick's checks run on the first trip with a hintuan; here, whatever
      // today's map gave them above, they run again on this one.
      picksChecked = false;
      const made = await tripChecks();
      await closeCard();
      if (made.picked) check('  ✕ lets the picked hintuan go', await noPickLeft());
    }

    // A terminal with no link: its card lists no route, though the route starts
    // there. Today's behaviour, an open question for the owner (public-map-01):
    // when the card comes to count a route's head and tail, this check changes
    // with it. Opened by a tap on its box, which a build without hotspot taps does not take.
    if (!isHotspotTapOn) {
      console.log(
        'SKIP  a terminal with no link opens its card with no route and no counter: hotspot taps are off in this build (VITE_HOTSPOT_TAPS)',
      );
    } else {
      const [tx, ty] = WEST_TERMINAL.point.coordinates;
      // Inside its box, on the side away from the two lines that leave it.
      const inBox = [tx - 0.0003, ty];
      await jumpTo(page, inBox);
      const [px, py] = await project(page, inBox);
      const frame = await canvasBox();
      await mapTap(frame.x + px, frame.y + py);
      await page
        .waitForFunction(() => !!document.querySelector('[data-testid="card-place"]'), null, {
          timeout: 10000,
        })
        .catch(() => {});
      const terminal = await page.evaluate(() => {
        const shown = [...document.querySelectorAll('[data-testid="card"]')].find((c) => !c.hidden);
        return {
          place: shown?.querySelector('[data-testid="card-place"]')?.innerText.trim() ?? null,
          boxes: shown?.querySelectorAll('[data-testid="card-box"]').length ?? 0,
          routes: shown?.querySelectorAll('[data-testid="card-origin"]').length ?? 0,
          counter: shown?.querySelectorAll('[data-testid="card-count"]').length ?? 0,
        };
      });
      check(
        "a terminal with no link opens its card with no route and no counter (today's behaviour, public-map-01)",
        !!terminal.place?.includes(WEST_TERMINAL.name) &&
          terminal.boxes === 1 &&
          terminal.routes === 0 &&
          terminal.counter === 0,
        JSON.stringify(terminal),
      );
      await closeCard();
    }
  }

  onMadeUpMap = false;
}

// -------------------------------------------- 6. the desktop control, ±5 px
if (runsPart(1)) {
  const desktop = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const dpage = await desktop.newPage();
  watch(dpage);
  await nodeFetch(dpage);
  await dpage.addInitScript(() => {
    window.__src = async (id) => {
      const s = window.__map?.getSource(id);
      return s ? await s.getData() : null;
    };
  });
  await dpage.goto(`${BASE}/`, { waitUntil: 'load' });
  await dpage.waitForFunction(() => window.__map && window.__map.loaded(), null, {
    timeout: 30000,
  });
  await mapIdle(dpage);

  // The public map has no +, − or compass for a mouse either since 2026-09-29
  // (the owner: "annoying for users"); the studio keeps them.
  check(
    'a fine pointer gets no zoom buttons either',
    (await dpage.locator('.maplibregl-ctrl-zoom-in, .maplibregl-ctrl-compass').count()) === 0,
  );
  check(
    "a fine pointer gets the same ⓘ, MapLibre's corner credits gone",
    (await dpage.getByRole('button', { name: 'Map data sources' }).isVisible()) &&
      !(await dpage.locator('.maplibregl-ctrl-attrib').isVisible()),
  );

  // The sheet's code out of reach (offline before the worker kept it): the ⓘ's tap hands the
  // credits back to MapLibre's corner, focus on it, and the page is live, not blank.
  {
    const fpage = await desktop.newPage();
    await nodeFetch(fpage);
    await fpage.route(/map-data-source-view/, (route) => route.abort('internetdisconnected'));
    await fpage.goto(`${BASE}/`, { waitUntil: 'load' });
    const info = fpage.getByRole('button', { name: 'Map data sources' });
    await info.waitFor({ timeout: 30000 });
    await info.click();
    await fpage
      .locator('.maplibregl-ctrl-attrib')
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(() => {});
    check(
      "the sheet's code out of reach: MapLibre's corner credits come back, focus on them, the page live",
      (await fpage.locator('.maplibregl-ctrl-attrib').isVisible()) &&
        (await info.count()) === 0 &&
        (await fpage.evaluate(
          () =>
            !!document.activeElement?.closest('.maplibregl-ctrl-attrib') &&
            !document.querySelector('[data-testid="map-view"]')?.closest('[inert]'),
        )),
    );
    await fpage.close();
  }

  if (!routeA) {
    skip('a mouse click 4 px beside the line selects it', 'no lone route vertex to click');
  } else {
    const neighbour = routeA.neighbour;
    await jumpTo(dpage, routeA.point);
    const anchor = await project(dpage, routeA.point);
    const perp = await perpendicular(dpage, routeA.point, neighbour, routeA.route.coords, 20);
    const box = await dpage.locator('canvas.maplibregl-canvas').boundingBox();
    const dCard = dpage.locator('[data-testid="card"]');

    await dpage.mouse.click(box.x + anchor[0] + perp[0] * 4, box.y + anchor[1] + perp[1] * 4);
    await cardsSettled(dpage);
    check(
      'a mouse click 4 px beside the line selects it',
      (await dCard.count()) > 0,
      `card count ${await dCard.count()}`,
    );
    // Left by Escape, as a trip has no ✕ (the owner, 2026-11-21): a click on the empty map could
    // land on an end's name the trip's framing brought there.
    await dpage.keyboard.press('Escape');
    const closed = await dpage
      .waitForFunction(() => document.querySelectorAll('[data-testid="card"]').length === 0, null, {
        timeout: 3000,
      })
      .then(() => true)
      .catch(() => false);

    // The box and the hit line add up: a ±5 px box around a line drawn 18 px wide
    // reaches 5 + 9 = 14 px from the centre — the mouse tolerance the map always
    // had, plus the box. 20 px must be outside it.
    const hitWidth = await dpage.evaluate(() =>
      window.__map.getLayer('saved-routes-hit')
        ? window.__map.getPaintProperty('saved-routes-hit', 'line-width')
        : null,
    );
    // The trip the first click opened moved the camera to take it in: back to
    // the vertex, measured again, so the 20 px are 20 px from the line.
    await jumpTo(dpage, routeA.point);
    const anchor2 = await project(dpage, routeA.point);
    const perp2 = await perpendicular(dpage, routeA.point, neighbour, routeA.route.coords, 20);
    await dpage.mouse.click(box.x + anchor2[0] + perp2[0] * 20, box.y + anchor2[1] + perp2[1] * 20);
    await cardsSettled(dpage);
    check(
      'a mouse click 20 px away does not — the fine box is ±5 px on an 18 px hit line',
      (await dCard.count()) === 0,
      `card count ${await dCard.count()} (the first one closed: ${closed}); saved-routes-hit is ${hitWidth} px wide, so a ±5 px box reaches ${5 + Number(hitWidth) / 2} px`,
    );

    // A mouse can hover: over the line the pointer is a hand, and off it, where
    // the click above found nothing, it is not. A phone's finger gets no hover
    // listeners since 2026-10-04 (bindHover, tap.ts); a desktop keeps them.
    const cursor = () => dpage.evaluate(() => window.__map.getCanvas().style.cursor);
    await dpage.mouse.move(box.x + anchor2[0], box.y + anchor2[1], { steps: 4 });
    const over = await until(cursor, (c) => c === 'pointer', 2000);
    await dpage.mouse.move(box.x + anchor2[0] + perp2[0] * 20, box.y + anchor2[1] + perp2[1] * 20, {
      steps: 4,
    });
    const off = await until(cursor, (c) => c === '', 2000);
    check(
      'a mouse over the line turns the pointer to a hand, and off it back',
      over === 'pointer' && off === '',
      `over "${over}", 20 px off "${off}"`,
    );
  }
}

// ------------------------------------- 6b. place search: a landmark's pin
// A landmark picked in place search (.scratch/place-search, ticket 06) leaves a
// pin on its point while its routes near here are open: another pick moves it,
// closing the panel takes it away. Two malls from today's landmark file, each
// the only landmark of its name, a kilometre or more apart; the page is still on
// the made-up map, whose places share no name with them, so each is listed as a
// landmark, not as a Para place. A build without place search (VITE_PLACE_SEARCH) skips it, read
// from the build's flag on the page, not the field: the bar is fetched after the map
// (public-map-app.tsx), so a build with search on may not have drawn it yet.
const isPlaceSearchShown = (await page.locator('[data-place-search="on"]').count()) > 0;
if (runsPart(2) && !isPlaceSearchShown) {
  console.log('SKIP  place search: hidden in this build (VITE_PLACE_SEARCH)');
}
if (runsPart(2) && isPlaceSearchShown) {
  {
    const file = await (await fetch(`${BASE}/data/landmarks.v1.json`)).json();
    const named = new Map();
    for (const l of file.landmarks) named.set(l.name, (named.get(l.name) ?? 0) + 1);
    const malls = file.landmarks.filter((l) => l.kind === 'mall' && named.get(l.name) === 1);
    const first = malls[0];
    const second = malls.find(
      (l) => Math.hypot(l.point[0] - first.point[0], l.point[1] - first.point[1]) > 0.01,
    );
    const field = page.getByRole('combobox', { name: 'Search places' });
    await field.waitFor({ timeout: 10000 });
    const pins = page.locator('[data-testid="landmark-pin"]');
    const pick = async (landmark) => {
      await field.fill(landmark.name);
      const row = page
        .getByRole('option')
        .filter({ hasText: landmark.name })
        .filter({ hasText: 'Landmark' })
        .first();
      await row.waitFor({ timeout: 10000 });
      await buttonTap(
        row,
        async () => (await page.getByRole('region', { name: landmark.name }).count()) > 0,
      );
      await mapIdle(page);
    };
    // How far the pin's circle is from the landmark's point on screen, in px.
    const pinOff = async (landmark) => {
      const at = await project(page, landmark.point);
      const frame = await canvasBox();
      const circle = await pins
        .first()
        .locator(':scope > span')
        .first()
        .boundingBox()
        .catch(() => null);
      if (!circle || !frame) return Infinity;
      return Math.hypot(
        circle.x + circle.width / 2 - (frame.x + at[0]),
        circle.y + circle.height / 2 - (frame.y + at[1]),
      );
    };
    await closeCard();
    if (!first || !second) {
      console.log('SKIP  place search: two malls a kilometre apart in the landmark file');
    } else {
      await pick(first);
      const firstOff = await until(
        () => pinOff(first),
        (d) => d < 2,
        3000,
      );
      check(
        'a landmark picked in search leaves a pin on its point',
        (await pins.count()) === 1 && firstOff < 2,
        `${first.name}: ${await pins.count()} pin(s), ${firstOff.toFixed(1)} px off`,
      );
      await pick(second);
      const secondOff = await until(
        () => pinOff(second),
        (d) => d < 2,
        3000,
      );
      check(
        'another landmark picked moves the pin there',
        (await pins.count()) === 1 && secondOff < 2,
        `${second.name}: ${await pins.count()} pin(s), ${secondOff.toFixed(1)} px off`,
      );
      await buttonTap(
        page.getByRole('region', { name: second.name }).getByRole('button', { name: 'Close' }),
        async () => (await pins.count()) === 0,
      );
      const left = await until(
        () => pins.count(),
        (n) => n === 0,
        2000,
      );
      check('closing its routes near here takes the pin away', left === 0, `${left} pin(s)`);
    }
  }

  // ------------------------------- 6c. "Go here": a trip that ends near a landmark
  // "Go here" on a hintuan near a landmark (ticket 07) opens that place's routes;
  // a route picked there opens its trip with its end already picked at the
  // hintuan nearest the landmark, the walk from there said on the card, and the
  // landmark's pin still on the map. Today's landmark file, the made-up map's
  // hintuans: the landmark nearest any of them, within 400 m.
  {
    const file = await (await fetch(`${BASE}/data/landmarks.v1.json`)).json();
    const named = new Map();
    for (const l of file.landmarks) named.set(l.name, (named.get(l.name) ?? 0) + 1);
    const hintuans = TWO_WAY_MAP.stops.filter((st) => st.kind === 'hintuan');
    const metres = ([ax, ay], [bx, by]) => {
      const k = Math.PI / 180;
      const x = (bx - ax) * k * Math.cos(((ay + by) / 2) * k);
      return 6371000 * Math.hypot(x, (by - ay) * k);
    };
    const nearest = file.landmarks
      .filter((l) => named.get(l.name) === 1 && l.kind !== 'street')
      .map((l) => ({
        l,
        d: Math.min(...hintuans.map((h) => metres(l.point, h.point.coordinates))),
      }))
      .filter(({ d }) => d < 400)
      .sort((a, b) => a.d - b.d)[0]?.l;
    await closeCard();
    if (!nearest) {
      console.log('SKIP  "Go here": no landmark within 400 m of the made-up map');
    } else {
      const field = page.getByRole('combobox', { name: 'Search places' });
      await field.fill(nearest.name);
      const row = page
        .getByRole('option')
        .filter({ hasText: nearest.name })
        .filter({ hasText: 'Landmark' })
        .first();
      await row.waitFor({ timeout: 10000 });
      await buttonTap(
        row,
        async () => (await page.getByRole('region', { name: nearest.name }).count()) > 0,
      );
      await mapIdle(page);
      const placeRoute = page
        .locator('[data-testid="card"]:not([hidden]) button[data-testid="card-item"]:enabled')
        .first();
      await buttonTap(
        page
          .getByRole('region', { name: nearest.name })
          .getByRole('button', { name: /^Go here:/ })
          .first(),
        async () => (await placeRoute.count()) > 0,
      );
      const listed = await placeRoute
        .waitFor({ timeout: 10000 })
        .then(() => true)
        .catch(() => false);
      check('"Go here" opens that hintuan\'s routes', listed);
      if (listed) {
        // Sent to the row itself: at the sheet's resting height it can sit below the screen.
        await placeRoute.dispatchEvent('click');
        const walk = page.getByTestId('trip-walk');
        const said = await walk
          .waitFor({ timeout: 10000 })
          .then(() => walk.innerText())
          .catch(() => '');
        await cardsSettled(page);
        const ends = await page.locator('[data-testid="hintuan-pin"]').count();
        const goalPins = await page.locator('[data-testid="landmark-pin"]').count();
        check(
          'a route picked there opens its trip ending near the landmark, the walk said',
          /^About \d+ m to .+, in a straight line$/.test(said) &&
            said.includes(nearest.name) &&
            ends === 1 &&
            goalPins === 1,
          `"${said}"; ${ends} end pin(s), ${goalPins} landmark pin(s)`,
        );
        await closeCard();
        const gone = await until(
          () => page.locator('[data-testid="landmark-pin"]').count(),
          (n) => n === 0,
          2000,
        );
        check('closing the cards lets the landmark go', gone === 0, `${gone} landmark pin(s)`);
      }
    }
  }
}

// ------------------------------------------ 4e. the height kept, card to card
// The owner's rules of 2026-11-25, in px (±2): the first card open, the list a tap opens stands at
// its height, and at Low at Low; a trip a tap opens, on a RouteCard or on a line of one route,
// opens at the middle (TRIP_OPENS_AT); ⇅ keeps the trip's height; ‹ gives the list back at its own
// height from before the tap; the first card comes back as it was left.
if (runsPart(3)) {
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__map && window.__map.loaded(), null, { timeout: 30000 });
  await waitForSource(page, 'saved-routes');
  await mapIdle(page);
  const middle = await page.evaluate(async () => {
    try {
      return (await import('/src/features/routes/cards/card-stack.ts')).TRIP_OPENS_AT;
    } catch {
      return 0.55;
    }
  });
  const explore = page.locator('[data-testid="explore-cards"]');
  await explore.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  const chooser = page.locator('[data-testid="chooser"]:not([hidden])');
  const exploreShown = () =>
    explore
      .evaluate((e) => Math.round(innerHeight - e.getBoundingClientRect().top))
      .catch(() => null);
  const near = (a, b) => a !== null && b !== null && Math.abs(a - b) <= 2;
  /** What the trip shows at the middle: its share of the map, as BottomSheet slides it. */
  const middlePx = async () =>
    Math.round(
      middle *
        (await card()
          .first()
          .evaluate((e) => e.offsetHeight)),
    );
  // The point on the lines as the page opens where the most routes pass.
  const at = await page.evaluate(() => {
    const m = window.__map;
    const ids = m
      .getStyle()
      .layers.filter((l) => l.source === 'saved-routes' && l.type === 'line')
      .map((l) => l.id);
    const found = [];
    for (let x = 60; x < innerWidth - 70; x += 8)
      for (let y = 120; y < innerHeight * 0.55; y += 8) {
        const fs = m.queryRenderedFeatures(
          [
            [x - 3, y - 3],
            [x + 3, y + 3],
          ],
          { layers: ids },
        );
        const n = new Set(fs.map((f) => f.properties.id)).size;
        if (n) found.push([x, y, n]);
      }
    found.sort((a, b) => b[2] - a[2]);
    return { many: found[0] ?? null };
  });
  const box = await canvasBox();
  const tapAt = async (p) => {
    if (!p || !box) return;
    await mapTap(box.x + p[0], box.y + p[1]);
    await cardsSettled(page).catch(() => {});
  };
  /** A finger on the sheet's top, moved `dy` and held: no throw. */
  const dragTop = async (loc, dy) => {
    const b = await loc.first().boundingBox();
    if (b) await fingerPan(b.x + 24, Math.max(b.y, 0) + 24, 0, dy);
    await cardsSettled(page).catch(() => {});
  };
  const allClosed = async () => (await chooser.count()) === 0 && (await card().count()) === 0;

  const openPx = await exploreShown();
  await tapAt(at.many);
  const listAtOpen = (await chooser.count()) ? await shownOf(chooser) : null;
  check(
    '  the first card open, the list a tap opens stands at its height',
    near(listAtOpen, openPx),
    `first card ${openPx} px; list ${listAtOpen} px`,
  );
  if ((await chooser.count()) > 0) {
    await dragTop(chooser, -150);
    const listPx = await shownOf(chooser);
    await touchTap(
      chooser.locator('[data-testid="chooser-select"]').first(),
      async () => (await trip().count()) > 0,
    );
    await cardsSettled(page).catch(() => {});
    const tripPx = (await trip().count()) ? await shownOf(card()) : null;
    const wantPx = (await trip().count()) ? await middlePx() : null;
    check(
      '  a trip a RouteCard opens opens at the middle, whatever the list stood at',
      near(tripPx, wantPx),
      `list ${listPx} px; trip ${tripPx} px, the middle ${wantPx} px`,
    );
    await leaveTrip(async () => (await chooser.count()) > 0);
    // Back from hidden, the list slides into place: read it at rest, as every height here is.
    await cardsSettled(page).catch(() => {});
    const backPx = (await chooser.count()) ? await shownOf(chooser) : null;
    check(
      '  ‹ gives the list back at its own height from before the tap',
      near(backPx, listPx),
      `list ${listPx} px before; ${backPx} px back`,
    );
    // ⇅ on a trip of its own: it turns the list behind round too, to its other cards.
    await touchTap(
      chooser.locator('[data-testid="chooser-select"]').first(),
      async () => (await trip().count()) > 0,
    );
    await cardsSettled(page).catch(() => {});
    const flip = card().locator('[data-testid="trip-ends-switch"]');
    if ((await flip.count()) > 0 && (await flip.isEnabled())) {
      await dragTop(card(), -100);
      const raisedPx = await shownOf(card());
      await touchTap(flip, async () => true);
      await cardsSettled(page).catch(() => {});
      const flippedPx = (await card().count()) ? await shownOf(card()) : null;
      check(
        "  ⇅ keeps the trip's height",
        near(flippedPx, raisedPx),
        `${raisedPx} px before; ${flippedPx} px after`,
      );
    }
    await leaveTrip(async () => (await chooser.count()) > 0);
    await leaveTrip(allClosed);
  }

  // At Low, the first card lets the list open at Low, and comes back at Low once it closes.
  await explore.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  const ePx = await exploreShown();
  const eBox = await explore.boundingBox().catch(() => null);
  if (eBox) await fingerPan(eBox.x + 24, eBox.y + 24, 0, (ePx ?? 0) - 40);
  await cardsSettled(page).catch(() => {});
  const lowRest = await explore.getAttribute('data-rest').catch(() => null);
  await tapAt(at.many);
  const listSnap = (await chooser.count()) ? await chooser.first().getAttribute('data-snap') : null;
  check(
    '  the first card at Low, the list opens at Low',
    lowRest === 'low' && listSnap === 'low',
    `first card ${lowRest}; list ${listSnap}`,
  );
  await leaveTrip(allClosed);
  await explore.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  check(
    '  and the first card comes back as it was left, at Low',
    (await explore.getAttribute('data-rest').catch(() => null)) === 'low',
    `${await explore.getAttribute('data-rest').catch(() => null)}`,
  );

  // A line of one route, tapped where nothing else runs on a fresh page: its trip, at the middle.
  let alone = false;
  for (const d of fileDirections.slice(0, 6)) if ((alone = await openAlone(d))) break;
  if (!alone)
    skip(
      '  a trip a line of one route opens opens at the middle',
      'no route with a vertex clear of every other line',
    );
  else {
    const oneTripPx = !(await chooser.count()) ? await shownOf(card()) : null;
    const wantPx = await middlePx();
    check(
      '  a trip a line of one route opens opens at the middle',
      near(oneTripPx, wantPx),
      `trip ${oneTripPx} px, the middle ${wantPx} px`,
    );
    await leaveTrip(allClosed);
  }
}

// --------------------------------------------------------- 7. housekeeping
console.log(
  `\n(${chromiumDrops} tap(s) sent again by hand: Chromium made no pointer events from the touch${lateClicks ? `; ${lateClicks} of those got the touch's own click afterwards too` : ''})\n`,
);
check(
  `at most ${CHROMIUM_DROPS_ALLOWED} tap a part sent again by hand for a touch Chromium dropped`,
  chromiumDrops <= CHROMIUM_DROPS_ALLOWED,
  `${chromiumDrops}`,
);
const odd = await page.evaluate(() => window.__odd ?? []).catch(() => []);
if (odd.length)
  console.log(`
(context menus, drags and cancelled pointers the page saw: ${odd.slice(-20).join(', ')})
`);
if (handleByHand)
  console.log(
    `\n(${handleByHand} gesture(s) on the sheet handle sent by hand as pointer events: the runner made none from the touch)\n`,
  );
check('no request to router.project-osrm.org', !osrmHit);
check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

await b.close();
tally();
