// What every suite runs on: the dev server's address, the PASS/FAIL/SKIP
// lines and the tally at the end, the https route through Node for a
// sandbox, the bare style that stands in for the basemap, the wait for a
// map source's first features, and the reload the dev server may be holding
// for the next page that connects.
//
// BASE and harness: every suite but pwa-test, which starts its own server and
// keeps its own count. nodeFetch: gate, commuter, phone, hotspot,
// regression-gestures, snap and studio-phone. bareStyle: where, scale,
// studio-scale and save. waitForSource: commuter, phone, hotspot,
// regression-gestures, extend, group and studio-phone. takeHeldReload: phone.
// mapIdle, cardsSettled and until, the waits on the state a check reads: commuter.

/** The dev server's address: PARA_BASE, or http://localhost:5173. */
export const BASE = (process.env.PARA_BASE ?? 'http://localhost:5173').replace(/\/$/, '');

/**
 * A suite's count. `check` prints PASS or FAIL and its detail, `skip` prints
 * SKIP for a check today's data cannot support, and `tally` lists the
 * skipped checks, prints how many passed, failed and were skipped, then ends
 * the run, non-zero on any failure. A skip alone does not fail the run: it is
 * counted so a check that quietly stopped proving anything shows in the last
 * line. With `bracketed`, a detail is printed in [brackets], as
 * regression-gestures and snap-test print theirs.
 *
 * With `knownSkips`, the names of the checks today's data cannot support, a
 * skip of any other check fails the run too: one more check going quiet shows
 * as a red run, not only in the last line, and a known one that skips again
 * and again costs nothing. Unset, skips never fail it.
 */
export const harness = ({ bracketed = false, knownSkips = null } = {}) => {
  const results = [];
  const skipped = [];
  const check = (name, ok, detail = '') => {
    results.push(ok);
    console.log(
      `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? (bracketed ? '  [' + detail + ']' : '  ' + detail) : ''}`,
    );
  };
  const skip = (name, reason) => {
    skipped.push(name.trim());
    console.log(
      bracketed ? `SKIP  ${name}${reason ? '  [' + reason + ']' : ''}` : `SKIP  ${name}  ${reason}`,
    );
  };
  /** The last line, after a blank one unless `blankLine` is false (extend-test and group-test print none). */
  const tally = ({ blankLine = true } = {}) => {
    const failed = results.filter((r) => !r).length;
    if (skipped.length > 0) {
      console.log(`${blankLine ? '\n' : ''}Skipped:`);
      for (const name of skipped) console.log(`  ${name}`);
    }
    console.log(
      `${blankLine ? '\n' : ''}${results.length - failed} passed, ${failed} failed, ${skipped.length} skipped`,
    );
    const known = knownSkips && new Set(knownSkips.map((n) => n.trim()));
    const unknown = known ? [...new Set(skipped.filter((n) => !known.has(n)))] : [];
    if (unknown.length > 0) {
      console.log('Skipped, and not a skip this suite knows: a check stopped proving anything.');
      for (const name of unknown) console.log(`  ${name}`);
    }
    process.exit(failed || unknown.length > 0 ? 1 : 0);
  };
  return { check, skip, tally };
};

// PARA_NODE_FETCH=1: serve every https request through Node fetch. Needed only
// where the browser cannot reach the internet but Node can (sandboxed CI).
// `seen`, when given, is handed each request first: hotspot-test and
// regression-gestures count the router's requests with it.
export const nodeFetch = async (p, seen) => {
  if (!process.env.PARA_NODE_FETCH) return;
  await p.route(/^https:\/\//, async (route) => {
    const req = route.request();
    seen?.(req);
    try {
      const h = { ...req.headers() };
      delete h['accept-encoding'];
      const r = await fetch(req.url(), {
        method: req.method(),
        headers: h,
        body: ['GET', 'HEAD'].includes(req.method()) ? undefined : req.postDataBuffer(),
      });
      const body = Buffer.from(await r.arrayBuffer());
      const hh = {};
      r.headers.forEach((v, k) => {
        if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(k)) hh[k] = v;
      });
      await route.fulfill({ status: r.status, headers: hh, body });
    } catch {
      await route.abort();
    }
  });
};

/**
 * No basemap tiles: the style is a bare one, a grey background and nothing
 * else, and anything else asked of the tile server is a 404, so a suite runs
 * the same on a laptop, in a sandbox and on a GitHub runner. save-test's grey
 * is a shade darker.
 */
export const bareStyle = (page, grey = '#eeeeee') =>
  page.route(/tiles\.openfreemap\.org/, (route) =>
    /\/styles\//.test(route.request().url())
      ? route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            version: 8,
            sources: {},
            layers: [{ id: 'bg', type: 'background', paint: { 'background-color': grey } }],
          }),
        })
      : route.fulfill({ status: 404, body: '' }),
  );

// The features of one of our GeoJSON sources once the page has some, asked
// every 100 ms from here for up to `ms`; [] when none came in time. Not
// `page.waitForFunction` with an async function: under Playwright's default
// polling that resolves after the function's first call whatever it returned,
// so a slow database (GitHub's runners are far from it) let the checks start
// on an empty map. Seen on the first CI run, 2026-09-25. It reads the page's
// window.__src, which each suite's init script defines.
export const waitForSource = async (page, id, ms = 20000) => {
  const until = Date.now() + ms;
  for (;;) {
    const fs = await page.evaluate(async (id) => (await window.__src(id))?.features ?? [], id);
    if (fs.length > 0 || Date.now() > until) return fs;
    await page.waitForTimeout(100);
  }
};

/**
 * The one source that never comes to rest while a route is lit: its chevrons,
 * set afresh fifteen times a second (direction-arrows.ts). The map is at rest
 * all the same.
 */
const FLOWING_SOURCE = 'direction-arrows';

/**
 * Once the map is at rest: two frames gone by, so a move a handler starts in
 * them (a sheet's transitionend, an effect) has begun, then the first frame
 * with no camera moving and every one of the app's own sources (its GeoJSON:
 * the routes, the hotspots, the rides) loaded but the chevrons'. Not the
 * basemap's tiles: they come from an outside service (OpenFreeMap) whose speed
 * no check reads, and a slow one would fail the run for it. Not MapLibre's
 * 'idle' either, which never comes while the chevrons flow. Throws when the
 * map is not at rest within `ms`, naming what was not, so a wait that ran out
 * fails the run rather than leaving a check to read a map in motion.
 */
export const mapIdle = async (page, ms = 10000) => {
  const unrest = await page.evaluate(
    ([ms, flowing]) =>
      new Promise((resolve) => {
        const m = window.__map;
        const sources = Object.entries(m.getStyle()?.sources ?? {})
          .filter(([id, source]) => source.type === 'geojson' && id !== flowing)
          .map(([id]) => id);
        const notAtRest = () => [
          ...(m.isMoving() ? ['the camera moving'] : []),
          ...sources.filter((id) => !m.isSourceLoaded(id)).map((id) => `source ${id} loading`),
        ];
        let frames = 0;
        let done = false;
        const finish = (value) => {
          if (done) return;
          done = true;
          clearTimeout(deadline);
          resolve(value);
        };
        // A deadline of its own: with no frames drawn the loop below never runs.
        const deadline = setTimeout(() => {
          const left = notAtRest();
          finish(left.length > 0 ? left : [`${frames} frame(s) drawn`]);
        }, ms);
        const look = () => {
          if (done) return;
          frames++;
          if (frames > 2 && notAtRest().length === 0) finish(null);
          else requestAnimationFrame(look);
        };
        m.triggerRepaint();
        requestAnimationFrame(look);
      }),
    [ms, FLOWING_SOURCE],
  );
  if (unrest) throw new Error(`mapIdle: the map not at rest after ${ms} ms: ${unrest.join(', ')}`);
};

/**
 * Once the cards and the route list have stopped moving (no CSS transition
 * left on them: a sheet rising, a fold opening) and the map is at rest after
 * them: where a camera move that follows a sheet settling has been and gone.
 * Throws, as mapIdle does, when either is still moving after `ms`.
 */
export const cardsSettled = async (page, ms = 10000) => {
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll('[data-testid="card"], [data-testid="chooser"]')].every(
          // A CSS transition is the one kind with a transitionProperty.
          (e) => !e.getAnimations({ subtree: true }).some((a) => 'transitionProperty' in a),
        ),
      null,
      { timeout: ms },
    )
    .catch(() => {
      throw new Error(`cardsSettled: a card or the route list still moving after ${ms} ms`);
    });
  await mapIdle(page, ms);
};

/**
 * `read()`'s value once `holds` says yes of it, asked every 50 ms for up to
 * `ms`; its last value when it never does, for the check after it to judge.
 * `read` runs here, so it may read the page in as many steps as it likes
 * (window.__lit is async, which page.waitForFunction cannot wait on).
 */
export const until = async (read, holds, ms = 5000) => {
  const by = Date.now() + ms;
  for (;;) {
    const value = await read();
    if (holds(value) || Date.now() > by) return value;
    await new Promise((r) => setTimeout(r, 50));
  }
};

/**
 * The dev server's HMR socket, as `clientCode` — what `${base}/@vite/client`
 * serves — connects to it: `base`'s host and port, its token if the client
 * carries one. Null for anything that is not Vite's client (a preview build
 * answers that path with the app's page).
 */
export const hmrSocketUrl = (base, clientCode) => {
  if (typeof clientCode !== 'string' || !/new WebSocket\([^)]*"vite-hmr"/.test(clientCode))
    return null;
  const url = new URL('/', base);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  // server.hmr.port, when a config gives the socket a port of its own.
  const port = /const hmrPort = (\d+)/.exec(clientCode)?.[1];
  if (port) url.port = port;
  const token = /const wsToken = "([^"]*)"/.exec(clientCode)?.[1];
  if (token) url.searchParams.set('token', token);
  return url.href;
};

/**
 * Takes what the dev server holds for the next page to connect, before a
 * suite's own page connects (the owner's answer to question W of the
 * cheap-phone report, 2026-10-06). Vite 8 keeps a full reload, or an error,
 * sent while no page is connected, and hands it to the next page whose
 * client connects, which then loads a second time at once. Tailwind's plugin
 * sends one for every change to a file it reads for class names that is not
 * code: README.md, tests/e2e/README.md, PLAN.md, package.json. So an edit
 * between two runs loaded the next run's first page twice, though that page
 * was served after the edit and had it already, and phone-test's step 20
 * check counted two requests for the map file in two loads (in two full runs
 * of 2026-10-05, each started soon after an edit to tests/e2e/README.md). A
 * reload sent once a page is connected still reaches that page.
 *
 * Resolves to { socket: false } when `base` has no dev server's socket, and
 * otherwise to { socket: true, held }, `held` the message taken, or null.
 */
export const takeHeldReload = async (base = BASE, ms = 3000) => {
  const code = await fetch(`${base}/@vite/client`)
    .then((r) => (r.ok ? r.text() : null))
    .catch(() => null);
  const socket = hmrSocketUrl(base, code);
  if (!socket) return { socket: false };
  return new Promise((resolve) => {
    let ws;
    let connected = false;
    let held = null;
    let timer;
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      clearTimeout(timer);
      resolve(connected ? { socket: true, held } : { socket: false });
    };
    // Closed before it resolves: the server counts a socket still closing as
    // a page connected, and sends it what it would otherwise hold.
    const done = () => {
      clearTimeout(timer);
      if (!ws || ws.readyState === WebSocket.CLOSED) return end();
      ws.onclose = end;
      timer = setTimeout(end, 1000);
      try {
        ws.close();
      } catch {
        end();
      }
    };
    timer = setTimeout(done, ms);
    try {
      ws = new WebSocket(socket, 'vite-hmr');
    } catch {
      return end();
    }
    ws.onerror = done;
    ws.onmessage = (e) => {
      let m = null;
      try {
        m = JSON.parse(String(e.data));
      } catch {
        // Not JSON: nothing the dev server holds for a page.
      }
      if (m?.type === 'connected') {
        connected = true;
        // What it holds goes out right behind 'connected', on the same socket.
        clearTimeout(timer);
        timer = setTimeout(done, 250);
      } else if (connected && (m?.type === 'full-reload' || m?.type === 'error')) {
        held = m;
        done();
      }
    };
  });
};
