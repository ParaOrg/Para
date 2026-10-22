// The studio's save flows, signed in, against a stand-in for the database.
//
//   npm run dev                          (in another terminal)
//   node tests/e2e/save-test.mjs         # against http://localhost:5173
//
// The other suites run signed out, so until 2026-09-29 nothing in
// routes-write.ts or hotspots-write.ts ran under a check (docs/archive/review-2026-09-29.md,
// section 4). This one grew from the stand-in the review drove them with
// (tests/unit/fixtures/fake-supabase.mjs): the tables are today's published map plus 500 hintuans far
// off the map, held in memory and answered the way PostgREST answers — the
// filters the studio sends, its unique indexes (409, code 23505), its foreign
// keys and cascades — and a stored session is faked so ✓ Done opens the save
// panel. The basemap is a flat grey and the router has no roads, so every
// line is freehand and the suite needs no network, no account and no router.
// Nothing reaches the live tables.
//
// What it checks, each against the finding it guards (the review's numbers):
// the pill counts routes (7) and the stop table is read once a load (6); a
// route saved with its slot, the return trip offered while the slot is empty
// and written into it (2); an edit that writes one row and offers no return
// trip (2); a delete that empties the direction into a slot and a redraw that
// fills it again (3), a refused step of it said (16); every request line
// short with 500 hintuans (4); a hotspot saved with its links, and the
// directions read again after it (8); a route's end refused a delete in
// words (15);
// undo to no points leaving no draft (12); a link sync that fails and a retry
// that updates rather than inserts (13); the drawing keys alive after signing
// in from Done (9); the map switch — Contributors, Playground and Public in a band of
// its own, the address, a half-drawn line, the camera and the basemap kept, the keys and
// clicks dead on the other maps, Escape leaving a card open under them alone; a new head or
// tail made from the save panel's pickers (a 30 m box at the line's end, the hotspot panel's
// own write, the drawn line left alone; Enter on any field saving the place and not the
// route, one write however many Enters, none before the lines are read, a retry updating the
// box it wrote, a name already a place refused); no React
// warnings (the duplicate key). And the camera
// with the cards, the public map's in the studio too (the owner, 2026-09-30):
// a trip opened on its whole route, beside the card.
// And the return trip closing the loop: it begins on the outbound's end, the outbound shows
// faintly under it, Close the loop ends it on the outbound's start, and the save panel says
// how far an open loop falls short.
import { readFileSync } from 'node:fs';

import { chromium } from 'playwright';
import { readPublished } from './lib/big-map.mjs';
import { BASE, bareStyle, harness } from './lib/harness.mjs';
import { fakeTurnstile } from './lib/fake-turnstile.mjs';

/** The project ref in VITE_SUPABASE_URL, which names the storage key. */
const PROJECT_REF = 'smzwbqxttdyvohuizynl';
/** A request line past this is trouble at the gateway; the link sync once sent 19 kB. */
const URL_LIMIT = 2000;

const { check, tally } = harness();

// ------------------------------------------------------------- the tables
const m = readPublished();
const now = '2026-09-25T12:00:00+00:00';
const OWNER = '11111111-1111-4111-8111-111111111111';
const route = new Map();
for (const v of m.variants) {
  route.set(v.route.id, {
    id: v.route.id,
    owner_id: OWNER,
    signboard: v.route.signboard ?? null,
    route_code: null,
    short_name: null,
    long_name: v.route.long_name ?? null,
    mode: v.route.mode,
    fare_note: v.route.fare_note ?? null,
    fare_as_of: null,
    // A loop's ends are left out of the published file: null in the table.
    head_stop_id: v.route.head_stop_id ?? null,
    tail_stop_id: v.route.tail_stop_id ?? null,
    via: v.route.via ?? null,
    is_loop: v.route.is_loop === true,
    created_at: now,
    updated_at: now,
  });
}
const tables = {
  route: [...route.values()],
  route_variant: m.variants.map((v) => ({
    id: v.id,
    route_id: v.route_id,
    owner_id: OWNER,
    direction_name: null,
    origin_terminal: null,
    destination_terminal: null,
    shape: v.shape,
    // 0009's overview: the published map's line is thinned already, and serves.
    overview: v.shape,
    control_points: v.shape ? [v.shape.coordinates[0], v.shape.coordinates.at(-1)] : [],
    segments: v.shape ? [{ snap: 'snapped', coordinates: v.shape.coordinates, streets: [] }] : [],
    reversed: v.reversed,
    confidence: v.confidence ?? 'drawn',
    borrowed_from: null,
    borrowed_part: null,
    borrowed_m: null,
    signboards: [],
    created_at: now,
    updated_at: now,
  })),
  stop: m.stops.map((s) => ({ ...s, owner_id: OWNER, created_at: now })),
  route_stop: m.links.map((l) => ({
    route_variant_id: l.route_variant_id,
    stop_id: l.stop_id,
    stop_sequence: l.stop_sequence,
  })),
};

// Everything is placed from the data's own box: the empty ground east of it,
// where the suite draws, and the 500 extra hintuans further east still.
const all = m.variants.flatMap((v) => v.shape?.coordinates ?? []);
const east = Math.max(...all.map((c) => c[0]));
const south = Math.min(...all.map((c) => c[1]));
const north = Math.max(...all.map((c) => c[1]));
const A = [east + 0.03, (south + north) / 2];
const at = (dx, dy) => [A[0] + dx, A[1] + dy];
const square = ([x, y], r) => ({
  type: 'Polygon',
  coordinates: [
    [
      [x - r, y - r],
      [x + r, y - r],
      [x + r, y + r],
      [x - r, y + r],
      [x - r, y - r],
    ],
  ],
});
for (let i = 0; i < 500; i++) {
  const c = [east + 0.2 + (i % 25) * 0.004, south + Math.floor(i / 25) * 0.004];
  tables.stop.push({
    id: `far-${String(i).padStart(3, '0')}-0000-4000-8000-000000000000`,
    name: `Far ${i}`,
    informal: null,
    aliases: [],
    kind: 'hintuan',
    point: { type: 'Point', coordinates: c },
    area: square(c, 0.0003),
    note: null,
    owner_id: OWNER,
    created_at: now,
  });
}

// ---------------------------------------------------------- the stand-in
/** Split a select on its top-level commas: `id,route_variant(id,reversed)`. */
const splitTop = (s) => {
  const out = [];
  let depth = 0,
    cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
};
/** A row as a select asks for it, embedding `route:route(*)` and `route_variant(…)`. */
const shapeRow = (table, row, select) => {
  if (!select || select === '*') return { ...row };
  const out = {};
  for (const item of splitTop(select)) {
    const emb = item.match(/^(?:(\w+):)?(\w+)\((.*)\)$/);
    if (!emb) {
      if (item in row) out[item] = row[item];
      continue;
    }
    const [, alias, rel, inner] = emb;
    if (table === 'route_variant' && rel === 'route') {
      const r = tables.route.find((x) => x.id === row.route_id);
      out[alias ?? rel] = r ? shapeRow('route', r, inner) : null;
    } else if (table === 'route' && rel === 'route_variant') {
      out[alias ?? rel] = tables.route_variant
        .filter((v) => v.route_id === row.id)
        .map((v) => shapeRow('route_variant', v, inner));
    }
  }
  return out;
};
const unquote = (s) => s.replace(/^"(.*)"$/, '$1');
/** The filters the studio sends: eq, is.null, not.is.null, in.(…). */
const matches = (row, params) => {
  for (const [k, v] of params) {
    if (['select', 'order', 'offset', 'limit', 'columns', 'on_conflict'].includes(k)) continue;
    const val = row[k];
    if (v.startsWith('eq.')) {
      if (String(val) !== v.slice(3)) return false;
    } else if (v === 'is.null') {
      if (val !== null && val !== undefined) return false;
    } else if (v === 'not.is.null') {
      if (val === null || val === undefined) return false;
    } else if (v.startsWith('in.(')) {
      if (!v.slice(4, -1).split(',').map(unquote).includes(String(val))) return false;
    } else throw new Error(`the stand-in does not know the filter ${k}=${v}`);
  }
  return true;
};
/** Refusals, as Postgres words them: the unique indexes and foreign keys the studio meets. */
const refuse = (code, message) => ({
  status: 409,
  body: { code, message, details: null, hint: null },
});
/** A check or trigger refusing a row (23514), as Postgres words it. */
const refuseCheck = (message) => ({
  status: 400,
  body: { code: '23514', message, details: null, hint: null },
});
/** route_loop_unique's fold (0021): case and the spaces at either end, no via being the empty one. */
const loopKey = (r) =>
  `${(r.signboard ?? '').trim().toLowerCase()}\u0000${(r.via ?? '').trim().toLowerCase()}`;
const conflictOf = (table, row, except = null) => {
  const others = tables[table].filter((r) => r !== except);
  // 0021's triggers run first, then its checks, then the unique indexes.
  if (table === 'route' && except && (except.is_loop === true) !== (row.is_loop === true))
    return refuseCheck('A route is made a loop or not, and stays so.');
  if (
    table === 'route_variant' &&
    row.reversed &&
    tables.route.some((r) => r.id === row.route_id && r.is_loop === true)
  )
    return refuseCheck('A loop has one direction: it has no way back.');
  if (table === 'route') {
    const noEnds = row.head_stop_id == null && row.tail_stop_id == null;
    const bothEnds = row.head_stop_id != null && row.tail_stop_id != null;
    if (row.is_loop === true ? !noEnds : !bothEnds)
      return refuseCheck(
        'new row for relation "route" violates check constraint "route_loop_ends"',
      );
    if (row.is_loop === true && (row.signboard ?? '').trim() === '')
      return refuseCheck(
        'new row for relation "route" violates check constraint "route_loop_signboard"',
      );
  }
  // Null ends never collide, so an ikot's do not (route_ends_unique, 0006).
  if (
    table === 'route' &&
    row.head_stop_id != null &&
    row.tail_stop_id != null &&
    others.some(
      (r) =>
        r.head_stop_id === row.head_stop_id &&
        r.tail_stop_id === row.tail_stop_id &&
        (r.via ?? '') === (row.via ?? ''),
    )
  )
    return refuse('23505', 'duplicate key value violates unique constraint "route_ends_unique"');
  if (
    table === 'route' &&
    row.is_loop === true &&
    others.some((r) => r.is_loop === true && loopKey(r) === loopKey(row))
  )
    return refuse('23505', 'duplicate key value violates unique constraint "route_loop_unique"');
  if (
    table === 'route_variant' &&
    others.some((r) => r.route_id === row.route_id && r.reversed === row.reversed)
  )
    return refuse(
      '23505',
      'duplicate key value violates unique constraint "route_variant_one_per_direction"',
    );
  if (
    table === 'route_stop' &&
    others.some((r) => r.route_variant_id === row.route_variant_id && r.stop_id === row.stop_id)
  )
    return refuse('23505', 'duplicate key value violates unique constraint "route_stop_pkey"');
  return null;
};
/** Deletes, with the schema's cascades (0001, 0006, 0008). */
const remove = (table, rows) => {
  if (
    table === 'stop' &&
    rows.some((s) => tables.route.some((r) => r.head_stop_id === s.id || r.tail_stop_id === s.id))
  )
    return refuse(
      '23503',
      'update or delete on table "stop" violates foreign key constraint "route_head_stop_id_fkey" on table "route"',
    );
  const gone = new Set(rows);
  tables[table] = tables[table].filter((r) => !gone.has(r));
  if (table === 'route')
    remove(
      'route_variant',
      tables.route_variant.filter((v) => rows.some((r) => r.id === v.route_id)),
    );
  if (table === 'route_variant') {
    const ids = new Set(rows.map((r) => r.id));
    tables.route_stop = tables.route_stop.filter((l) => !ids.has(l.route_variant_id));
    for (const v of tables.route_variant) if (ids.has(v.borrowed_from)) v.borrowed_from = null;
  }
  if (table === 'stop') {
    const ids = new Set(rows.map((r) => r.id));
    tables.route_stop = tables.route_stop.filter((l) => !ids.has(l.stop_id));
  }
  return null;
};
let seq = 0;
const newId = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
const fill = (table, r) =>
  table === 'route'
    ? {
        id: newId(),
        owner_id: OWNER,
        signboard: null,
        route_code: null,
        short_name: null,
        long_name: null,
        mode: 'jeepney',
        fare_note: null,
        fare_as_of: null,
        via: null,
        is_loop: false,
        created_at: now,
        updated_at: now,
        ...r,
      }
    : table === 'route_variant'
      ? {
          id: newId(),
          owner_id: OWNER,
          direction_name: null,
          origin_terminal: null,
          destination_terminal: null,
          confidence: 'drawn',
          overview: null,
          borrowed_from: null,
          borrowed_part: null,
          borrowed_m: null,
          signboards: [],
          created_at: now,
          updated_at: now,
          ...r,
        }
      : table === 'stop'
        ? {
            id: newId(),
            owner_id: OWNER,
            informal: null,
            aliases: [],
            note: null,
            created_at: now,
            ...r,
          }
        : { ...r };

/** Every request the page sent to the tables, in order. */
const log = [];
/** The next request matching `when` is refused with a 500, once. */
let fault = null;
/** Requests matching `when` wait until `release()` is called: `{ when, release }`. */
let hold = null;
const holdRequests = (when) => {
  let release = () => {};
  const gate = new Promise((resolve) => (release = resolve));
  hold = { when, gate };
  return () => {
    hold = null;
    release();
  };
};

const serve = async (req) => {
  const u = new URL(req.url());
  const table = u.pathname.split('/rest/v1/')[1];
  const method = req.method();
  const body = req.postData() ? JSON.parse(req.postData()) : null;
  log.push({ method, table, url: req.url(), query: decodeURIComponent(u.search), body });
  if (hold?.when(method, table, u)) await hold.gate;
  if (fault && fault(method, table, u)) {
    fault = null;
    return {
      status: 500,
      body: {
        code: 'XX000',
        message: 'the stand-in refused this one, on purpose',
        details: null,
        hint: null,
      },
    };
  }
  const params = [...u.searchParams];
  const select = u.searchParams.get('select');
  const one = /vnd\.pgrst\.object/.test(req.headers().accept ?? '');
  const prefer = req.headers().prefer ?? '';
  const rows = tables[table].filter((r) => matches(r, params));
  const answer = (out) => {
    const shaped = out.map((r) => shapeRow(table, r, select));
    if (one)
      return shaped.length === 1
        ? { status: 200, body: shaped[0] }
        : {
            status: 406,
            body: {
              code: 'PGRST116',
              message: 'JSON object requested, multiple (or no) rows returned',
              details: `The result contains ${shaped.length} rows`,
              hint: null,
            },
          };
    return { status: method === 'POST' ? 201 : 200, body: shaped };
  };
  if (method === 'GET' || method === 'HEAD') {
    const offset = Number(u.searchParams.get('offset') ?? 0);
    const limit = Number(u.searchParams.get('limit') ?? 1000);
    const page = rows.slice(offset, offset + Math.min(limit, 1000));
    const range = page.length
      ? `${offset}-${offset + page.length - 1}/${rows.length}`
      : `*/${rows.length}`;
    if (method === 'HEAD') return { status: 200, body: null, range };
    return { ...answer(page), range };
  }
  if (method === 'DELETE') {
    const no = remove(table, rows);
    return no ?? { status: 204, body: null };
  }
  if (method === 'PATCH') {
    for (const r of rows) {
      const next = { ...r, ...body };
      const no = conflictOf(table, next, r);
      if (no) return no;
      Object.assign(r, body, table === 'stop' ? {} : { updated_at: now });
    }
    return answer(rows);
  }
  // POST: an insert, or an upsert when it says so.
  const list = Array.isArray(body) ? body : [body];
  const merge = /resolution=merge-duplicates/.test(prefer);
  const made = [];
  for (const r of list) {
    const row = fill(table, r);
    const no = conflictOf(table, row);
    if (no && merge && table === 'route_stop') {
      Object.assign(
        tables.route_stop.find(
          (l) => l.route_variant_id === row.route_variant_id && l.stop_id === row.stop_id,
        ),
        row,
      );
      continue;
    }
    if (no) {
      for (const x of made) tables[table].splice(tables[table].indexOf(x), 1);
      return no;
    }
    tables[table].push(row);
    made.push(row);
  }
  return answer(made);
};

// The signboards bucket (0010), as Storage answers: an upload (the file in a
// form), the public read, and a delete by names.
const bucket = new Map();
const storage = async (r) => {
  const req = r.request();
  const u = new URL(req.url());
  const name = decodeURIComponent(u.pathname.split('/').pop());
  log.push({
    method: req.method(),
    table: 'storage',
    url: req.url(),
    query: u.pathname,
    body: null,
  });
  if (req.method() === 'GET' && u.pathname.includes('/object/public/signboards/')) {
    return bucket.has(name)
      ? r.fulfill({ status: 200, contentType: 'image/svg+xml', body: bucket.get(name) })
      : r.fulfill({ status: 400, body: '{"error":"not_found"}' });
  }
  if (req.method() === 'DELETE') {
    for (const n of JSON.parse(req.postData() ?? '{}').prefixes ?? []) bucket.delete(n);
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  }
  const svg = (req.postDataBuffer()?.toString('utf8') ?? '').match(/<svg[\s\S]*<\/svg>/)?.[0] ?? '';
  bucket.set(name, svg);
  return r.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({ Key: `signboards/${name}`, Id: name }),
  });
};

// ------------------------------------------------------------ the session
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 6 * 3600;
const user = {
  id: OWNER,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'owner@example.com',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: now,
  updated_at: now,
};
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: OWNER, aud: 'authenticated', role: 'authenticated', email: user.email, exp, iat: exp - 3600, session_id: 'standin' })}.standin`;
const session = {
  access_token: jwt,
  refresh_token: 'standin',
  token_type: 'bearer',
  expires_in: 6 * 3600,
  expires_at: exp,
  user,
};

// ------------------------------------------------------------ the browser
const b = await chromium.launch();
const warnings = [];
/** A page on the stand-in; `signedIn` stores the faked session before the app starts. */
async function open(signedIn, path, phone = false) {
  const context = await b.newContext(
    phone
      ? {
          viewport: { width: 390, height: 844 },
          isMobile: true,
          hasTouch: true,
          deviceScaleFactor: 2,
        }
      : { viewport: { width: 1280, height: 800 } },
  );
  const page = await context.newPage();
  // An iPhone's notch and home bar, as env(safe-area-inset-*) reads them.
  if (phone)
    await (
      await context.newCDPSession(page)
    ).send('Emulation.setSafeAreaInsetsOverride', {
      insets: { top: 47, bottom: 34, left: 0, right: 0 },
    });
  page.on('pageerror', (e) => warnings.push('pageerror: ' + String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && /Warning|key/.test(msg.text()))
      warnings.push(msg.text().slice(0, 160));
  });
  page.on('dialog', (d) => d.accept());
  await bareStyle(page, '#e8e8e8');
  await page.route(/\/rest\/v1\//, async (r) => {
    const out = await serve(r.request());
    const headers = {
      'access-control-expose-headers': 'content-range',
      'access-control-allow-origin': '*',
    };
    if (out.range) headers['content-range'] = out.range;
    await r.fulfill({
      status: out.status,
      contentType: 'application/json',
      headers,
      body: out.body === null ? '' : JSON.stringify(out.body),
    });
  });
  await page.route(/\/storage\/v1\/object\//, storage);
  await page.route(/\/auth\/v1\/user/, (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }),
  );
  await page.route(/\/auth\/v1\//, (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...session, user }),
    }),
  );
  await fakeTurnstile(page);
  await page.route(/router\.project-osrm\.org|routing\.openstreetmap\.de/, (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'NoRoute', routes: [] }),
    }),
  );
  await page.addInitScript(
    ({ key, s }) => {
      window.__src = async (id) => {
        const src = window.__map?.getSource(id);
        return src ? await src.getData() : null;
      };
      if (s && !localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(s));
    },
    { key: `sb-${PROJECT_REF}-auth-token`, s: signedIn ? session : null },
  );
  await page.goto(`${BASE}${path}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__map && window.__map.loaded(), null, { timeout: 30000 });
  for (
    let i = 0;
    i < 100 &&
    (await page.evaluate(
      async () => (await window.__src('saved-routes'))?.features?.length ?? 0,
    )) === 0;
    i++
  )
    await page.waitForTimeout(100);
  await page.waitForTimeout(500);
  return page;
}

const page = await open(true, '/studio/');
const body = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
const since = (n) => log.slice(n);
const writesSince = (n) => since(n).filter((w) => w.method !== 'GET' && w.method !== 'HEAD');
const said = (ws) => ws.map((w) => `${w.method} ${w.table}${w.query.slice(0, 70)}`).join(' · ');
/** Put the map on a place, at a zoom, and give back where a [lng, lat] lands on the page. */
const go = async (c, zoom) => {
  await page.evaluate(([c, z]) => window.__map.jumpTo({ center: c, zoom: z }), [c, zoom]);
  await page.waitForTimeout(400);
};
const box = await page.locator('canvas.maplibregl-canvas').boundingBox();
/**
 * Where a [lng, lat] lands on the page once the camera is at rest: it glides
 * with the cards, as on the public map, since 2026-10-01 (the trip opening on
 * its whole route), and a point read mid-glide is clicked where it no longer is.
 */
const px = async (ll) => {
  await page
    .waitForFunction(() => !window.__map.isMoving(), null, { timeout: 3000 })
    .catch(() => {});
  const p = await page.evaluate((ll) => {
    const q = window.__map.project(ll);
    return [q.x, q.y];
  }, ll);
  return [box.x + p[0], box.y + p[1]];
};
const clickAt = async (ll, wait = 250) => {
  const [x, y] = await px(ll);
  await page.mouse.click(x, y);
  await page.waitForTimeout(wait);
};
const idle = () =>
  page
    .waitForFunction(() => !document.body.innerText.includes('snapping…'), null, { timeout: 15000 })
    .catch(() => {});
const pointsShown = async () => Number((await body()).match(/(\d+) points?\b/)?.[1] ?? 0);
const done = async () => {
  await idle();
  await page.getByRole('button', { name: /Done/ }).click();
  await page.waitForTimeout(600);
};
const saveButton = () => page.getByRole('button', { name: /^(Save|Update)$/ });
const toast = () => page.getByTestId('toast').filter({ hasText: /^Saved/ });
const returnTrip = () => page.getByRole('button', { name: 'Draw the return trip' });
const dismissToasts = async () => {
  for (const d of await page.getByRole('button', { name: 'Dismiss' }).all())
    await d.click().catch(() => {});
  await page.waitForTimeout(200);
};
const waitFor = async (fn, ms = 5000) => {
  for (let t = 0; t < ms; t += 100) {
    if (await fn()) return true;
    await page.waitForTimeout(100);
  }
  return false;
};
const directionsOf = (routeId) => tables.route_variant.filter((v) => v.route_id === routeId);

// The ground the suite draws on, at street level: two hintuans 900 m apart,
// a route between them, its return trip by another street.
const P1 = at(-0.004, 0),
  P2 = at(0.004, 0);
const OUT = [P1, at(0, 0.0012), P2];
const BACK = [P2, at(0, -0.0015), P1];
const VIA = [P1, at(0, 0.003), P2];
const R = 0.0004;

// ---- 1. The load: the pill and the reads
const loadReads = [...log];
const listReads = loadReads.filter(
  (w) => w.method === 'GET' && w.table === 'route_variant' && /route:route/.test(w.query),
).length;
const hotspotReads = loadReads.filter((w) => w.method === 'GET' && w.table === 'stop').length;
check(
  'the stop table is read once for each read of the direction list, not twice (6)',
  hotspotReads > 0 && hotspotReads <= listReads,
  `${hotspotReads} stop read(s), ${listReads} list read(s)`,
);
const routesToday = tables.route.length;
check(
  'the pill counts routes, not directions (7)',
  (await body()).includes(`${routesToday} routes`),
  `want "${routesToday} routes"; ${(await body()).match(/\d+ routes?/)?.[0]}`,
);

// ---- 2. Two hintuans, traced and saved
async function hintuan(c, name) {
  await go(c, 17);
  await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
  await page.getByRole('menuitem', { name: /Hintuan/ }).click();
  await page.waitForTimeout(200);
  for (const [dx, dy] of [
    [-R, -R],
    [R, -R],
    [R, R],
    [-R, R],
  ])
    await clickAt([c[0] + dx, c[1] + dy], 150);
  await done();
  await page.getByPlaceholder('SM Fairview Ilalim').fill(name);
  const n = log.length;
  await page.getByRole('button', { name: 'Save hintuan' }).click();
  await waitFor(
    async () => (await page.getByRole('button', { name: 'Save hintuan' }).count()) === 0,
  );
  await page.waitForTimeout(500);
  await dismissToasts();
  return writesSince(n);
}
let w = await hintuan(P1, 'Stand-in Head');
const head = tables.stop.find((s) => s.name === 'Stand-in Head');
check(
  'a hintuan traced and saved is one stop row',
  !!head && w.filter((x) => x.method === 'POST' && x.table === 'stop').length === 1,
  said(w),
);
check(
  '  its links are replaced by its own id: none, where no line passes',
  w.some(
    (x) =>
      x.method === 'DELETE' &&
      x.table === 'route_stop' &&
      x.query.includes(`stop_id=eq.${head?.id}`),
  ) && !w.some((x) => x.method === 'POST' && x.table === 'route_stop'),
  said(w),
);
let nTail = log.length;
await hintuan(P2, 'Stand-in Tail');
const tail = tables.stop.find((s) => s.name === 'Stand-in Tail');
check('a second one', !!tail);
check(
  '  a saved hotspot reads the directions again, so a renamed end renames its routes (8)',
  log
    .slice(nTail)
    .some((x) => x.method === 'GET' && x.table === 'route_variant' && /route:route/.test(x.query)),
  said(log.slice(nTail)),
);

// ---- 2b. The map switch: a half-drawn line, the camera and the basemap survive it
{
  const camera = () =>
    page.evaluate(() => {
      const m = window.__map;
      return { c: m.getCenter().toArray(), z: m.getZoom(), b: m.getBearing(), p: m.getPitch() };
    });
  const sameCamera = (a, b) =>
    a.c[0] === b.c[0] && a.c[1] === b.c[1] && a.z === b.z && a.b === b.b && a.p === b.p;
  const mapOf = () => new URL(page.url()).searchParams.get('map');

  const basemapPicked = async () => {
    await page.getByRole('button', { name: 'Map design' }).click();
    const dialog = page.getByRole('dialog');
    const picked = await dialog.locator('button[aria-pressed="true"]').innerText();
    await dialog.getByRole('button', { name: 'Close' }).click();
    await page.waitForTimeout(300);
    return picked.trim();
  };
  // Another basemap than the one it opens on, so that "kept" means something.
  await page.getByRole('button', { name: 'Map design' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Terrain' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await page.waitForTimeout(500);
  const basemapBefore = await basemapPicked();
  await go(at(0, 0), 15);
  await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
  await page.getByRole('menuitem', { name: /Routes/ }).click();
  await page.waitForTimeout(200);
  await clickAt(OUT[0], 300);
  await clickAt(OUT[1], 300);
  await idle();
  const draftBefore = await page.evaluate(() => localStorage.getItem('parapo.draft.v1'));
  const pointsBefore = await pointsShown();
  const cameraBefore = await camera();

  check(
    'the switch always shows Contributors, Playground and Public, the Playground current',
    (await page.locator('[role=radiogroup] label').allInnerTexts())
      .map((t) => t.trim())
      .join('|') === 'Contributors|Playground|Public' &&
      (await page.getByRole('radio', { name: 'Playground' }).isChecked()) &&
      pointsBefore === 2,
  );
  check(
    '  and the current one is marked by more than colour: a check beside it',
    await page.evaluate(() => {
      const count = (sel) =>
        [...document.querySelectorAll(sel)].map((l) => l.querySelectorAll('svg').length);
      return (
        Math.min(...count('label:has(input:checked)')) >
        Math.max(...count('label:has(input:not(:checked))'))
      );
    }),
  );

  await page.keyboard.press('Escape');
  await page.getByRole('radio', { name: 'Playground' }).focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  check(
    'an arrow key moves to the Public map: the address says so and says it plainly',
    mapOf() === 'public' &&
      (await page.getByRole('radio', { name: 'Public' }).isChecked()) &&
      (await page.getByRole('heading', { name: 'Public map' }).isVisible()),
    page.url(),
  );
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  check(
    '  the keyboard cannot reach the map there to pan it',
    await page.evaluate(() => !document.activeElement?.closest('.maplibregl-map')),
  );
  await page.getByRole('radio', { name: 'Public' }).focus();
  await page.keyboard.press('Control+z');
  // Over the map beside the placeholder's card, where a click would add a point.
  await page.mouse.click(box.x + 40, box.y + box.height - 60);
  await page.waitForTimeout(400);
  check(
    '  the drawing tools are out of reach there: no Done, and keys and clicks leave the line alone',
    (await page.evaluate(() => localStorage.getItem('parapo.draft.v1'))) === draftBefore &&
      !(await page.getByRole('button', { name: /Done/ }).isVisible()),
  );
  check('  the camera is as it was', sameCamera(cameraBefore, await camera()));

  await page.locator('label', { hasText: 'Contributors' }).click();
  await page.waitForTimeout(300);
  check(
    'the Contributors map says what will be there, and invents nothing',
    mapOf() === 'contributors' &&
      (await page.getByRole('heading', { name: 'Contributors map' }).isVisible()) &&
      /None are shown yet/.test(await body()),
  );
  await page.getByRole('button', { name: 'Back to the Playground' }).click();
  await page.waitForTimeout(500);
  check(
    'back in the Playground the half-drawn line is as it was, with its camera',
    mapOf() === 'playground' &&
      (await page.evaluate(() => localStorage.getItem('parapo.draft.v1'))) === draftBefore &&
      (await pointsShown()) === pointsBefore &&
      sameCamera(cameraBefore, await camera()) &&
      (await page
        .getByRole('radio', { name: 'Playground' })
        .evaluate((e) => e === document.activeElement)),
    `${pointsBefore} points`,
  );

  check(
    '  and the basemap picked before is still the one picked',
    (await basemapPicked()) === basemapBefore && basemapBefore === 'Terrain',
    basemapBefore,
  );
  await page.goBack();
  await page.waitForTimeout(300);
  check(
    'Back follows the address: the Contributors map again',
    mapOf() === 'contributors' &&
      (await page.getByRole('radio', { name: 'Contributors' }).isChecked()),
  );
  await page.goForward();
  await page.waitForTimeout(300);
  await page.locator('button[title="Discard this route"]').click();
  await page.waitForTimeout(300);
  check(
    '  the line can still be discarded after the visits',
    (await page.evaluate(() => localStorage.getItem('parapo.draft.v1'))) === null,
  );
}

// ---- 3. A route between them, saved with its slot
async function drawLine(points) {
  await go(at(0, 0), 15);
  await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
  await page.getByRole('menuitem', { name: /Routes/ }).click();
  await page.waitForTimeout(200);
  if (!newRouteChecked) {
    newRouteChecked = true;
    check(
      'a new route has no "Close the loop" before its first point, and no outbound under it',
      (await page.getByTestId('close-loop').count()) === 0 &&
        (await page.evaluate(() => window.__src('draw-outbound')))?.features.length === 0,
    );
  }
  for (const p of points) await clickAt(p, 300);
  await done();
}
let newRouteChecked = false;
await drawLine(OUT);
check(
  'Done opens the save panel, the ends guessed from where the line runs',
  (await page.getByTestId('save-head').inputValue()) !== '' &&
    (await page.getByTestId('save-tail').inputValue()) !== '',
);
let n = log.length;
await saveButton().click();
await waitFor(async () => (await toast().count()) > 0);
w = writesSince(n);
const outRoute = tables.route.find(
  (r) => r.head_stop_id === head?.id && r.tail_stop_id === tail?.id,
);
check(
  'a new route is one route row and two directions, one of them an empty slot',
  !!outRoute &&
    directionsOf(outRoute.id).length === 2 &&
    directionsOf(outRoute.id).filter((v) => v.shape === null).length === 1,
  said(w),
);
const outV = outRoute && directionsOf(outRoute.id).find((v) => v.shape);
check(
  '  the save writes the overview beside the line, from the same points (0009)',
  !!outV?.overview &&
    outV.overview.coordinates.length >= 2 &&
    outV.overview.coordinates.length <= outV.shape.coordinates.length &&
    String(outV.overview.coordinates[0][0]).split('.')[1].length <= 5,
  `${outV?.overview?.coordinates.length} of ${outV?.shape?.coordinates.length} points`,
);
check(
  '  the line is linked to the two hintuans it runs between',
  ['Stand-in Head', 'Stand-in Tail'].every((nm) =>
    tables.route_stop.some(
      (l) =>
        l.route_variant_id === outV?.id && l.stop_id === tables.stop.find((s) => s.name === nm)?.id,
    ),
  ),
);
const longest = since(n).reduce((a, x) => (x.url.length > a.url.length ? x : a), { url: '' });
check(
  `  no request line over ${URL_LIMIT} characters with ${tables.stop.length} hotspots (4)`,
  longest.url.length <= URL_LIMIT,
  `${longest.url.length}: ${longest.method} ${longest.table}${longest.query.slice(0, 60)}`,
);
check(
  '  the hintuans are read in pages, not in one bare request (4)',
  since(n).some(
    (x) =>
      x.method === 'GET' &&
      x.table === 'stop' &&
      /kind=eq\.hintuan/.test(x.query) &&
      /offset=0/.test(x.query) &&
      /limit=/.test(x.query),
  ),
);
check(
  '  the draft is gone',
  (await page.evaluate(() => localStorage.getItem('parapo.draft.v1'))) === null,
);
await waitFor(async () => (await returnTrip().count()) > 0);
check(
  '  the toast offers the return trip: the route has an empty slot (2)',
  (await returnTrip().count()) === 1,
  (
    await toast()
      .innerText()
      .catch(() => '')
  ).replace(/\s+/g, ' '),
);
check(
  '  the pill counts one route more (7)',
  (await body()).includes(`${routesToday + 1} routes`),
  (await body()).match(/\d+ routes?/)?.[0],
);

// ---- 4. The return trip, into the slot
const metresBetween = ([lng1, lat1], [lng2, lat2]) => {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
};
const drawnPoints = async () =>
  (await page.evaluate(() => window.__src('draw-points')))?.features.map(
    (f) => f.geometry.coordinates,
  ) ?? [];
const closeLoop = () => page.getByTestId('close-loop');
const outLine = outV?.shape?.coordinates ?? [];
await returnTrip().click();
await page.waitForTimeout(400);
let drawn = await drawnPoints();
check(
  "the return trip begins with its first point on the outbound line's end (<1 m)",
  drawn.length === 1 && outLine.length > 1 && metresBetween(drawn[0], outLine.at(-1)) < 1,
  `${drawn.length} point(s), ${drawn[0] && outLine.length ? metresBetween(drawn[0], outLine.at(-1)).toFixed(2) : '?'} m`,
);
check(
  '  the outbound shows under it: its line, and a ring and a dot at its two ends',
  (await page.evaluate(() => window.__src('draw-outbound')))?.features
    .map((f) => f.properties.role)
    .join() === 'line,start,end',
);
check(
  '  "Close the loop" is on the toolbar, enabled: there is a point to come from',
  (await closeLoop().count()) === 1 && (await closeLoop().isEnabled()),
);
// Two more clicks leave the line well short of where papunta began.
await clickAt(BACK[1], 300);
await clickAt(at(-0.002, -0.0015), 300);
await done();
const gapNotice = await page
  .getByTestId('save-loop')
  .innerText()
  .catch(() => '');
check(
  '  Done, with the loop open: the panel says how far the end is from where papunta began',
  /^The return trip ends \d+ m from where papunta began\. Close the loop\?$/.test(gapNotice.trim()),
  gapNotice,
);
await page.getByRole('button', { name: 'Back to map' }).click();
await page.waitForTimeout(300);
await closeLoop().click();
await idle();
await page.waitForTimeout(400);
drawn = await drawnPoints();
check(
  "  Close the loop adds a last point on the outbound line's start (<1 m), and then rests",
  drawn.length === 4 &&
    outLine.length > 1 &&
    metresBetween(drawn.at(-1), outLine[0]) < 1 &&
    (await closeLoop().isDisabled()),
  `${drawn.length} point(s), ${drawn.length && outLine.length ? metresBetween(drawn.at(-1), outLine[0]).toFixed(2) : '?'} m`,
);
await done();
check(
  'the return trip opens as "Draw the return trip"',
  (await body()).includes('Draw the return trip'),
);
check(
  '  and, with the loop closed, the panel has no gap to say',
  (await page.getByTestId('save-loop').count()) === 0,
);
n = log.length;
await saveButton().click();
await waitFor(async () => (await toast().count()) > 0);
w = writesSince(n);
const backV = directionsOf(outRoute?.id).find((v) => v !== outV);
check(
  '  it fills the slot: one update, only of an empty row, no new route (2)',
  w.some(
    (x) => x.method === 'PATCH' && x.table === 'route_variant' && /shape=is\.null/.test(x.query),
  ) && !w.some((x) => x.method === 'POST' && (x.table === 'route' || x.table === 'route_variant')),
  said(w),
);
check(
  '  both directions are drawn, still two rows',
  directionsOf(outRoute?.id).length === 2 && directionsOf(outRoute?.id).every((v) => v.shape),
  `${directionsOf(outRoute?.id).map((v) => (v.shape ? 'drawn' : 'slot'))}`,
);
const backLine = backV?.shape?.coordinates ?? [];
check(
  '  the two lines meet at both ends: the return begins where papunta ended, and ends where it began (<1 m)',
  backLine.length > 1 &&
    outLine.length > 1 &&
    metresBetween(backLine[0], outLine.at(-1)) < 1 &&
    metresBetween(backLine.at(-1), outLine[0]) < 1,
  backLine.length && outLine.length
    ? `${metresBetween(backLine[0], outLine.at(-1)).toFixed(2)} m and ${metresBetween(backLine.at(-1), outLine[0]).toFixed(2)} m`
    : 'no lines',
);
await page.waitForTimeout(1200);
check(
  '  and the toast offers no return trip: there is no slot left (2)',
  (await toast().count()) === 1 && (await returnTrip().count()) === 0,
);
await dismissToasts();

// ---- 5. Edit a direction
async function openCard(ll) {
  await go(at(0, 0), 15);
  const before = await page.evaluate(() => {
    const m = window.__map;
    const c = m.getCenter();
    return { lng: c.lng, lat: c.lat, zoom: m.getZoom() };
  });
  await clickAt(ll, 700);
  return before;
}
const cameraBeforeOpen = await openCard(OUT[1]);
check(
  'a tap on the line opens its card, with Edit route',
  (await page.getByRole('button', { name: 'Edit route' }).count()) === 1,
);
// The camera with the cards, as on the public map (the owner, 2026-10-21):
// a trip opened by a tap leaves the camera where it was; the route is not
// fitted to the room the card leaves.
await page.waitForFunction(() => !window.__map.isMoving(), null, { timeout: 3000 }).catch(() => {});
const cameraAfterOpen = await page.evaluate(() => {
  const m = window.__map;
  const c = m.getCenter();
  return { lng: c.lng, lat: c.lat, zoom: m.getZoom() };
});
check(
  '  the camera stays where it was: the route is not fitted',
  Math.abs(cameraAfterOpen.zoom - cameraBeforeOpen.zoom) < 0.01 &&
    Math.abs(cameraAfterOpen.lng - cameraBeforeOpen.lng) < 1e-6 &&
    Math.abs(cameraAfterOpen.lat - cameraBeforeOpen.lat) < 1e-6,
  JSON.stringify({ cameraBeforeOpen, cameraAfterOpen }),
);
await page.getByRole('button', { name: 'Edit route' }).click();
await waitFor(async () => (await pointsShown()) === OUT.length);
check(
  '  Edit route loads its points',
  (await pointsShown()) === OUT.length,
  `${await pointsShown()} points`,
);
// Back where the suite measured its ground.
await go(at(0, 0), 15);
await clickAt(at(0.0055, 0.0005), 300);
await waitFor(async () => (await pointsShown()) === OUT.length + 1);
check(
  '  a click past its tail adds a point',
  (await pointsShown()) === OUT.length + 1,
  `${await pointsShown()} points`,
);
await go(OUT[0], 19);
await clickAt([OUT[0][0] - 0.00008, OUT[0][1]], 300);
await waitFor(async () => (await pointsShown()) === OUT.length + 2);
const closedEdit = await drawnPoints();
await done();
check(
  '  closing an edited two-ended line keeps its route type and ends',
  metresBetween(closedEdit[0], closedEdit.at(-1)) < 15 &&
    !(await page.getByTestId('save-loop-toggle').isChecked()) &&
    (await page.getByTestId('save-loop-toggle').isDisabled()) &&
    (await page.getByTestId('save-head').count()) === 1 &&
    (await page.getByTestId('save-tail').count()) === 1 &&
    (await body()).includes('Update this direction'),
);
await page.getByRole('button', { name: 'Back to map' }).click();
await page.keyboard.press('Control+z');
await waitFor(async () => (await pointsShown()) === OUT.length + 1);
await go(at(0, 0), 15);
await done();
check(
  '  the panel says it updates this direction',
  (await body()).includes('Update this direction'),
);
n = log.length;
const rowsBefore = tables.route_variant.length;
await saveButton().click();
await waitFor(async () => (await toast().count()) > 0);
w = writesSince(n);
check(
  '  Update writes that one row, by its id',
  w.some(
    (x) =>
      x.method === 'PATCH' && x.table === 'route_variant' && x.query.includes(`id=eq.${outV?.id}`),
  ) && !w.some((x) => x.method === 'POST' && x.table !== 'route_stop'),
  said(w),
);
check('  no row added or lost', tables.route_variant.length === rowsBefore);
await page.waitForTimeout(1200);
check(
  '  and no return trip is offered for a route drawn both ways (2)',
  (await toast().count()) === 1 && (await returnTrip().count()) === 0,
);
await dismissToasts();

// ---- 5b. Signboards, per direction (0010, the owner's ask of 2026-10-01)
const outRow = () => tables.route_variant.find((v) => v.id === outV?.id);
const items = () => page.getByTestId('signboard-item');
const upload = (name, text) =>
  page
    .getByTestId('signboard-file')
    .setInputFiles({ name, mimeType: 'image/svg+xml', buffer: Buffer.from(text) });
await openCard(OUT[1]);
const editor = page.getByTestId('signboard-editor');
check(
  'the trip card has a Signboard for the direction on show, Papunta',
  (await editor.count()) === 1 &&
    /Signboard · Papunta/.test(await editor.innerText()) &&
    (await items().count()) === 0,
);
n = log.length;
await upload(
  'evil.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 98 40" onload="alert(1)"><script>alert(2)</script><rect width="98" height="40" fill="#111"/><a href="https://example.com"><text>X</text></a></svg>',
);
await waitFor(async () => (await items().count()) === 1);
const firstBoard = outRow()?.signboards?.[0];
const stored = bucket.get(firstBoard) ?? '';
check(
  '  an upload lands in the bucket cleaned: no script, no handler, no link out',
  /^[0-9a-f-]{36}\.svg$/.test(firstBoard ?? '') &&
    stored.includes('<rect width="98" height="40" fill="#111"/>') &&
    !/script|onload|alert|example\.com/.test(stored),
  stored.slice(0, 160),
);
check(
  '  and is listed on the direction, file first and then the row',
  (await items().count()) === 1 &&
    since(n).findIndex((x) => x.table === 'storage') <
      since(n).findIndex((x) => x.method === 'PATCH' && x.table === 'route_variant'),
  said(since(n)),
);
await waitFor(async () => (await page.getByTestId('trip-signboard').count()) === 1);
check(
  '  the card above shows it as commuters will',
  (await page.getByTestId('trip-signboard').count()) === 1 &&
    /\/storage\/v1\/object\/public\/signboards\//.test(
      (await page.getByTestId('trip-signboard').getAttribute('src')) ?? '',
    ),
);
await upload(
  'second.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 98 40"><rect width="98" height="40" fill="#222"/></svg>',
);
await waitFor(async () => (await items().count()) === 2);
const second = outRow()?.signboards?.[1];
await page.getByRole('button', { name: 'Move signboard 2 earlier' }).click();
await waitFor(async () => outRow()?.signboards?.[0] === second);
check(
  '  a second goes last, and ‹ moves it first',
  outRow()?.signboards?.join() === [second, firstBoard].join(),
  JSON.stringify(outRow()?.signboards),
);
n = log.length;
await upload('note.svg', 'just words, not a drawing');
await waitFor(
  async () => (await page.getByRole('alert').filter({ hasText: 'note.svg' }).count()) === 1,
);
// The list read again after the move above may land after the refusal: it
// must leave the words where they are (a GitHub runner, 2026-10-01).
await page.waitForTimeout(800);
check(
  '  a file that is not an SVG is refused in words, and nothing is sent',
  (await page.getByRole('alert').filter({ hasText: 'note.svg' }).count()) === 1 &&
    writesSince(n).length === 0 &&
    !since(n).some((x) => x.table === 'storage'),
  said(since(n)),
);
await page.getByRole('button', { name: 'Remove signboard 1' }).click();
await waitFor(async () => (await items().count()) === 1);
check(
  '  ✕ takes it off the direction and out of the bucket',
  outRow()?.signboards?.join() === firstBoard && !bucket.has(second),
  JSON.stringify(outRow()?.signboards),
);
await page.getByRole('button', { name: 'Remove signboard 1' }).click();
await waitFor(
  async () =>
    (await items().count()) === 0 && (await page.getByTestId('trip-signboards').count()) === 0,
);
check(
  '  and the last one leaves none',
  outRow()?.signboards?.length === 0 &&
    bucket.size === 0 &&
    (await page.getByTestId('trip-signboards').count()) === 0,
  `${JSON.stringify(outRow()?.signboards)}; ${bucket.size} in the bucket; ${await page.getByTestId('trip-signboards').count()} row(s) on the card`,
);

// ---- 5c. Export, the route both ways (the owner's ask of 2026-10-13)
await openCard(OUT[1]);
const exported = async (label) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('route-export').getByRole('button', { name: label, exact: true }).click(),
  ]);
  const path = await download.path();
  return { name: download.suggestedFilename(), text: path ? readFileSync(path, 'utf8') : '' };
};
const bothWays = directionsOf(outRow()?.route_id ?? '');
const fullPoints = bothWays.reduce((sum, v) => sum + (v.shape?.coordinates.length ?? 0), 0);
n = log.length;
const csv = await exported('CSV');
const csvRows = csv.text.replace(/^﻿/, '').trimEnd().split('\r\n');
check(
  'Export CSV: a row per point of both full lines, read on their own, under one header',
  csv.name.endsWith('.csv') &&
    csvRows[0] === 'route,direction,way,sequence,lng,lat' &&
    csvRows.length === 1 + fullPoints &&
    csvRows.some((r) => r.includes(',outbound,')) &&
    csvRows.some((r) => r.includes(',return,')) &&
    since(n).filter((x) => x.table === 'route_variant' && x.query.includes('select=shape'))
      .length >= 2,
  `${csv.name}: ${csvRows.length - 1} rows for ${fullPoints} points; ${said(since(n))}`,
);
const geo = JSON.parse((await exported('GeoJSON')).text);
check(
  '  GeoJSON: a FeatureCollection with both lines and their places',
  geo.type === 'FeatureCollection' &&
    geo.features.filter((f) => f.geometry.type === 'LineString').length === 2 &&
    geo.features.some((f) => f.geometry.type === 'Point'),
  JSON.stringify(geo.features.map((f) => f.geometry.type)),
);
const json = JSON.parse((await exported('JSON')).text);
check(
  '  JSON: the route and its directions, outbound first, each with its line',
  json.route?.id === outRow()?.route_id &&
    json.directions.map((v) => v.way).join() === 'outbound,return' &&
    json.directions.every((v) => v.line?.length > 1 && v.places.length >= 2),
  JSON.stringify(json.directions?.map((v) => [v.way, v.line?.length, v.places?.length])),
);

// ---- 6. Delete a direction, then draw it again
await openCard(OUT[1]);
// A refused step — here the count that decides whether the route goes — is
// said, not swallowed (16): it was read by nobody. Delete again finishes it.
fault = (method, table) => method === 'HEAD' && table === 'route_variant';
await page.getByRole('button', { name: 'Delete' }).click();
await waitFor(async () => /refused this one, on purpose/.test(await body()));
check(
  'a refused step of the delete is said, not swallowed (16)',
  fault === null && /refused this one, on purpose/.test(await body()),
  (await body()).slice(-160),
);
await dismissToasts();
n = log.length;
await page.getByRole('button', { name: 'Delete' }).click();
await waitFor(async () => (await page.getByRole('button', { name: 'Edit route' }).count()) === 0);
await page.waitForTimeout(500);
w = writesSince(n);
check(
  'Delete empties the direction into a slot: the row stays, with no line (3)',
  directionsOf(outRoute?.id).length === 2 &&
    directionsOf(outRoute?.id).find((v) => v.id === outV?.id)?.shape === null,
  said(w),
);
check(
  '  its links go with its line, and its overview',
  !tables.route_stop.some((l) => l.route_variant_id === outV?.id) &&
    directionsOf(outRoute?.id).find((v) => v.id === outV?.id)?.overview === null,
);
check(
  '  the route stays: its other way is drawn',
  tables.route.some((r) => r.id === outRoute?.id) &&
    !w.some((x) => x.method === 'DELETE' && x.table === 'route'),
);
check('  and Delete again finishes it, no error shown', !/error|refused/i.test(await body()));
await drawLine(OUT);
check(
  "  the panel says this fills the route's empty slot",
  (await page.getByTestId('save-same-ends').count()) === 1 &&
    !/already has/.test(await page.getByTestId('save-same-ends').innerText()),
);
n = log.length;
await saveButton().click();
await waitFor(
  async () => (await toast().count()) > 0 || /already has this direction drawn/.test(await body()),
);
w = writesSince(n);
check(
  '+ then Routes with the same ends fills the slot again, not "already drawn" (3)',
  (await toast().count()) === 1 && !/already has this direction drawn/.test(await body()),
  (await body()).slice(-160),
);
check(
  '  one route, two drawn directions',
  tables.route.filter((r) => r.id === outRoute?.id).length === 1 &&
    directionsOf(outRoute?.id).length === 2 &&
    directionsOf(outRoute?.id).every((v) => v.shape),
  said(w),
);
await dismissToasts();

// ---- 6b. An ikot: a loop with no ends (0021)
// Drawn round the two hintuans, closed on its own first point, saved with no head
// and no tail, one direction and no slot; its terminals linked by its line.
{
  const IKOT = [
    P1,
    at(-0.002, 0.0025),
    at(0.002, 0.0025),
    P2,
    at(0.002, -0.0025),
    at(-0.002, -0.0025),
  ];
  // The ikots this section draws, not the ones the published map brings.
  const drawnIkots = () => tables.route.filter((r) => r.is_loop && !route.has(r.id));
  const ikotLine = () => directionsOf(drawnIkots()[0]?.id)[0];
  const toggle = () => page.getByTestId('save-loop-toggle');
  const dialogs = [];
  page.on('dialog', (d) => dialogs.push(d.message()));

  await go(at(0, 0), 15);
  await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
  await page.getByRole('menuitem', { name: /Routes/ }).click();
  await page.waitForTimeout(200);
  await clickAt(IKOT[0], 300);
  check(
    'a new route can close on its own first point, but not before it has three points',
    (await closeLoop().count()) === 1 && (await closeLoop().isDisabled()),
    await closeLoop().getAttribute('aria-label'),
  );
  for (const p of IKOT.slice(1)) await clickAt(p, 300);
  check(
    '  with the line going round, "Close the loop" is on',
    await closeLoop().isEnabled(),
    await closeLoop().getAttribute('aria-label'),
  );
  await closeLoop().click();
  await idle();
  await page.waitForTimeout(400);
  drawn = await drawnPoints();
  check(
    '  it ends the line on the first point (<1 m), and then rests',
    drawn.length === IKOT.length + 1 &&
      metresBetween(drawn.at(-1), drawn[0]) < 1 &&
      (await closeLoop().isDisabled()),
    `${drawn.length} point(s)`,
  );
  await done();
  check(
    'Done opens the panel as an ikot: the toggle ticked for a closed line, no ends to pick',
    (await toggle().isChecked()) &&
      (await page.getByTestId('save-head').count()) === 0 &&
      (await page.getByTestId('save-tail').count()) === 0 &&
      (await body()).includes('Save this ikot'),
    (await body()).slice(0, 160),
  );
  check(
    '  its places are listed from the first drawn, the signboard asked for',
    (await page.getByTestId('save-timeline').innerText()).includes('Stand-in Head') &&
      (await page.getByTestId('save-timeline').innerText()).includes('Stand-in Tail') &&
      /required/.test(
        await page
          .getByLabel(/Signboard/)
          .locator('..')
          .innerText(),
      ),
    (await page.getByTestId('save-timeline').innerText()).replace(/\s+/g, ' '),
  );
  n = log.length;
  await saveButton().click();
  await page.waitForTimeout(400);
  check(
    'saving without a signboard is refused in words, and writes nothing',
    /An ikot is called by its signboard/.test(await body()) && writesSince(n).length === 0,
    said(writesSince(n)),
  );
  await page.getByLabel(/Signboard/).fill('UP – Ikot');
  await saveButton().click();
  await waitFor(async () => (await toast().count()) > 0);
  w = writesSince(n);
  const [ikot] = drawnIkots();
  const ikotV = ikot && directionsOf(ikot.id);
  check(
    'an ikot is one route row with is_loop and no ends, and one direction row: no slot',
    !!ikot &&
      ikot.head_stop_id === null &&
      ikot.tail_stop_id === null &&
      ikot.signboard === 'UP – Ikot' &&
      ikotV.length === 1 &&
      ikotV[0].reversed === false &&
      !!ikotV[0].shape,
    said(w),
  );
  check(
    '  its line is linked to the two hintuans it goes round',
    ['Stand-in Head', 'Stand-in Tail'].every((nm) =>
      tables.route_stop.some(
        (l) =>
          l.route_variant_id === ikotV?.[0]?.id &&
          l.stop_id === tables.stop.find((x) => x.name === nm)?.id,
      ),
    ),
  );
  await page.waitForTimeout(1200);
  check(
    '  and the toast offers no return trip: an ikot has no way back',
    (await toast().count()) === 1 && (await returnTrip().count()) === 0,
  );
  await dismissToasts();

  // The same signboard again, round the same two hintuans by a longer way so its
  // line is not under the first's: refused in words by the panel, before any write.
  const WIDER = [
    P1,
    at(-0.002, 0.005),
    at(0.002, 0.005),
    P2,
    at(0.002, -0.005),
    at(-0.002, -0.005),
  ];
  await go(at(0, 0), 15);
  await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
  await page.getByRole('menuitem', { name: /Routes/ }).click();
  await page.waitForTimeout(200);
  for (const p of WIDER) await clickAt(p, 300);
  await closeLoop().click();
  await done();
  await page.getByLabel(/Signboard/).fill('  up – IKOT ');
  n = log.length;
  await saveButton().click();
  await page.waitForTimeout(400);
  check(
    'a second ikot with the same signboard is refused in words, to the fold, and writes nothing',
    /Another ikot already has this signboard/.test(await body()) && writesSince(n).length === 0,
    said(writesSince(n)),
  );
  check(
    '  a via tells them apart: the refusal goes',
    await (async () => {
      await page.getByLabel(/^Via/).fill('Katipunan');
      await saveButton().click();
      await waitFor(async () => (await toast().count()) > 0);
      return drawnIkots().length === 2;
    })(),
    `${drawnIkots().length} ikots`,
  );
  await dismissToasts();

  // The card: no Extend, and an ikot's own words.
  await openCard(IKOT[1]);
  await waitFor(async () => (await page.getByRole('button', { name: 'Edit route' }).count()) > 0);
  check(
    "an ikot's card has Edit route and Delete, but no Extend: it has no end to go on from",
    (await page.getByRole('button', { name: 'Edit route' }).count()) === 1 &&
      (await page.getByRole('button', { name: 'Extend' }).count()) === 0 &&
      (await page.getByTestId('facts-loop').count()) === 1 &&
      // The trip is the ikot's: its word for the way, and no SWITCH to a way back.
      /Ikot/.test(await body()) &&
      !/Pabalik|Papunta/.test(await body()),
    (await page
      .getByTestId('facts-loop')
      .innerText()
      .catch(() => '')) || (await body()).slice(0, 120),
  );

  // Edit: the toggle is locked on, and the update names no ends and no is_loop.
  await page.getByRole('button', { name: 'Edit route' }).click();
  await waitFor(async () => (await pointsShown()) === IKOT.length + 1);
  await done();
  check(
    'Edit route on an ikot keeps the toggle ticked and locked, with no ends to pick',
    (await toggle().isChecked()) &&
      (await toggle().isDisabled()) &&
      (await page.getByTestId('save-head').count()) === 0 &&
      (await body()).includes('Update this ikot'),
  );
  n = log.length;
  await saveButton().click();
  await waitFor(async () => (await toast().count()) > 0);
  w = writesSince(n);
  const routePatch = w.find((x) => x.method === 'PATCH' && x.table === 'route');
  check(
    '  the update writes the route facts and the line, never the ends or is_loop',
    !!routePatch &&
      !('head_stop_id' in routePatch.body) &&
      !('tail_stop_id' in routePatch.body) &&
      !('is_loop' in routePatch.body) &&
      w.some((x) => x.method === 'PATCH' && x.table === 'route_variant'),
    said(w),
  );
  await dismissToasts();

  // A terminal drawn on the ikot afterwards is linked to it by itself, and its
  // checklist does not offer the ikot.
  const TERMINAL_AT = at(0, 0.0025);
  await go(TERMINAL_AT, 17);
  await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
  await page.getByRole('menuitem', { name: /Terminal/ }).click();
  await page.waitForTimeout(200);
  for (const [dx, dy] of [
    [-R, -R],
    [R, -R],
    [R, R],
    [-R, R],
  ])
    await clickAt([TERMINAL_AT[0] + dx, TERMINAL_AT[1] + dy], 150);
  await done();
  await page.getByPlaceholder('SM Fairview Terminal A').fill('Stand-in Ikot Terminal');
  check(
    "a terminal's checklist leaves an ikot out, and says it links its terminals itself",
    !(await body()).includes('UP – Ikot') &&
      /An ikot links the terminals on it by itself/.test(await body()),
  );
  n = log.length;
  await page.getByRole('button', { name: 'Save terminal' }).click();
  await waitFor(
    async () => (await page.getByRole('button', { name: 'Save terminal' }).count()) === 0,
  );
  // The panel goes before the save is done: its toast says when it is, and a
  // tap on the map before then opens nothing.
  await waitFor(async () => (await toast().count()) > 0);
  await dismissToasts();
  const ikotTerminal = tables.stop.find((x) => x.name === 'Stand-in Ikot Terminal');
  check(
    "  saved, the terminal is linked to the ikot's line, though nobody ticked it",
    !!ikotTerminal &&
      tables.route_stop.some(
        (l) => l.route_variant_id === ikotV?.[0]?.id && l.stop_id === ikotTerminal.id,
      ),
    said(writesSince(n)),
  );

  // Delete: the confirm names the ikot, and emptying its only direction removes the route.
  await openCard(IKOT[1]);
  // The card reads the line before it opens, as D's trip card does: wait for it.
  await waitFor(async () => (await page.getByRole('button', { name: 'Delete' }).count()) > 0);
  n = log.length;
  await page.getByRole('button', { name: 'Delete' }).click();
  await waitFor(async () => !tables.route.some((r) => r.id === ikot?.id));
  check(
    'Delete on an ikot asks about the ikot, and takes the route away with its only direction',
    dialogs.some((d) => d === 'Delete the ikot "UP – Ikot"?') &&
      !tables.route.some((r) => r.id === ikot?.id) &&
      directionsOf(ikot?.id).length === 0 &&
      !tables.route_stop.some((l) => l.route_variant_id === ikotV?.[0]?.id),
    `${dialogs.at(-1)} · ${said(writesSince(n))}`,
  );
  await dismissToasts();
  // The second ikot (with its via) is taken away too, so the sections after see what they saw before.
  for (const r of drawnIkots()) remove('route', [r]);
}

// ---- 7. A route's end is refused a delete, in words
await go(P1, 17);
await clickAt([P1[0] - R * 0.7, P1[1] + R * 0.7], 700);
const card = page.getByRole('button', { name: 'Edit hintuan' });
if ((await card.count()) === 0) {
  const row = page.getByRole('button', { name: /Stand-in Head/ });
  if (await row.count()) {
    await row.first().click();
    await page.waitForTimeout(500);
  }
}
check('a tap inside the hintuan opens its card', (await card.count()) === 1);
n = log.length;
if (await card.count()) {
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.waitForTimeout(500);
}
check(
  "  deleting a route's end is refused, naming the route (15)",
  /Stand-in Head.*is where .* ends?\. Delete .* first/.test(await body()),
  (await body()).slice(-200),
);
check(
  '  and nothing is sent to the database',
  !writesSince(n).some((x) => x.method === 'DELETE' && x.table === 'stop'),
  said(writesSince(n)),
);
await dismissToasts();
await page.keyboard.press('Escape');

// ---- 8. Undo to no points leaves no draft
await go(at(0, 0), 15);
await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
await page.getByRole('menuitem', { name: /Routes/ }).click();
await clickAt(OUT[0], 300);
await clickAt(OUT[1], 300);
await idle();
const drafted = (await page.evaluate(() => localStorage.getItem('parapo.draft.v1'))) !== null;
await page.keyboard.press('Control+z');
await page.keyboard.press('Control+z');
await page.waitForTimeout(400);
check(
  'undo down to no points leaves no draft to come back on reload (12)',
  drafted && (await page.evaluate(() => localStorage.getItem('parapo.draft.v1'))) === null,
);
await page.getByTitle('Discard this route').click();
await page.waitForTimeout(300);

// ---- 9. A link sync that fails, and the retry
await drawLine(VIA);
await page.getByPlaceholder('Zabarte').fill('Stand-in Road');
fault = (method, table, u) =>
  method === 'GET' && table === 'route_stop' && u.searchParams.has('route_variant_id');
n = log.length;
await saveButton().click();
await waitFor(async () => /links are not/.test(await body()));
w = writesSince(n);
check(
  'a link sync that fails says the line is saved and its links are not (13)',
  /The line is saved, but its hintuan links are not/.test(await body()),
  (await body()).slice(-200),
);
const viaRoute = tables.route.find((r) => r.via === 'Stand-in Road');
check(
  '  the route and its directions are in',
  !!viaRoute && directionsOf(viaRoute.id).length === 2,
  said(w),
);
check(
  '  and its ends are locked while the save is finished: the retry would not write them',
  await page.getByTestId('save-head').isDisabled(),
);
n = log.length;
await saveButton().click();
await waitFor(async () => (await toast().count()) > 0);
w = writesSince(n);
check(
  '  Save again updates the row it wrote, and inserts nothing (13)',
  w.some((x) => x.method === 'PATCH' && x.table === 'route_variant' && /id=eq\./.test(x.query)) &&
    !w.some((x) => x.method === 'POST' && (x.table === 'route' || x.table === 'route_variant')) &&
    (await toast().count()) === 1,
  said(w),
);
check(
  '  still one route for these ends and that via',
  tables.route.filter((r) => r.via === 'Stand-in Road').length === 1,
);
await dismissToasts();

// ---- 10. Edit route changes the route's facts (stage 11, the owner's ask)
await hintuan(at(-0.004, 0.006), 'Stand-in Phase');
const phase = tables.stop.find((s) => s.name === 'Stand-in Phase');
await openCard(OUT[1]);
await page.getByRole('button', { name: 'Edit route' }).click();
await waitFor(async () => (await pointsShown()) > 0);
await done();
check(
  'Edit route unlocks the ends and the facts',
  (await page.getByTestId('save-head').isEnabled()) &&
    (await page.getByPlaceholder('Zabarte').isEnabled()) &&
    (await page.getByLabel(/Mode/).isEnabled()),
);
await page.getByTestId('save-head').selectOption({ label: 'Stand-in Phase' });
// The form asks a jeepney for no signboard: the one the route has is kept.
const signboardBefore = tables.route.find((r) => r.id === outRoute?.id)?.signboard ?? null;
check(
  '  the panel says the change is to both directions',
  /a change here is a change to both directions/.test(await body()),
);
n = log.length;
const backId = directionsOf(outRoute?.id).find((v) => v.id !== outV?.id)?.id;
// A terminal link the owner set on this direction, as a hotspot's checklist
// would: Edit route must leave it where it is.
const aTerminal = tables.stop.find((s) => s.kind === 'terminal');
if (aTerminal && outV)
  tables.route_stop.push({ route_variant_id: outV.id, stop_id: aTerminal.id, stop_sequence: 0 });
await saveButton().click();
await waitFor(async () => (await toast().count()) > 0);
w = writesSince(n);
const edited = tables.route.find((r) => r.id === outRoute?.id);
check(
  '  Update writes the route row — its new head, its signboard kept — then the direction',
  edited?.head_stop_id === phase?.id &&
    (edited?.signboard ?? null) === signboardBefore &&
    w.findIndex((x) => x.method === 'PATCH' && x.table === 'route') <
      w.findIndex((x) => x.method === 'PATCH' && x.table === 'route_variant'),
  said(w),
);
check(
  '  the name follows the new end',
  (await toast().innerText()).includes('Stand-in Phase – Stand-in Tail'),
  (await toast().innerText()).replace(/\s+/g, ' '),
);
const terminals = new Set(tables.stop.filter((s) => s.kind === 'terminal').map((s) => s.id));
const linkWrites = w.filter((x) => x.table === 'route_stop');
check(
  '  the terminal links are left as they are: the one set stays, and the link writes name hintuans only',
  !!aTerminal &&
    tables.route_stop.some((l) => l.route_variant_id === outV?.id && l.stop_id === aTerminal.id) &&
    linkWrites.every(
      (x) =>
        !/stop_id=eq\./.test(x.query) &&
        ![x.body ?? []].flat().some((l) => terminals.has(l?.stop_id)) &&
        ![...terminals].some((t) => x.query.includes(t)),
    ),
  said(linkWrites),
);
await dismissToasts();
// The other direction, not saved here, shares the route: its card reads the
// new end once the list is read again.
// The card is the public map's trip card since 2026-09-30: its ends sit on
// rows of their own, and "origin → destination" is its sheet's name.
const cardName = async () =>
  (await page
    .locator('[data-testid="card"]')
    .first()
    .getAttribute('aria-label')
    .catch(() => null)) ?? '';
await waitFor(async () => {
  await openCard(BACK[1]);
  return (await cardName()) === 'Stand-in Tail → Stand-in Phase';
}, 8000);
check(
  '  and the other direction, which shares the route, is renamed with it',
  directionsOf(outRoute?.id).some((v) => v.id === backId) &&
    (await cardName()) === 'Stand-in Tail → Stand-in Phase',
  await cardName(),
);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await openCard(OUT[1]);
await page.getByRole('button', { name: 'Edit route' }).click();
await waitFor(async () => (await pointsShown()) > 0);
await done();
await page.getByTestId('save-head').selectOption({ label: 'Stand-in Head' });
await page.getByPlaceholder('Zabarte').fill('Stand-in Road');
n = log.length;
await saveButton().click();
await page.waitForTimeout(600);
check(
  'ends that another route already has are refused in a plain sentence',
  /Another route already runs between these two places/.test(await body()),
  (await body()).slice(-200),
);
check('  and nothing is written', writesSince(n).length === 0, said(writesSince(n)));
await page.getByTestId('save-head').selectOption({ label: 'Stand-in Tail' });
await page.getByTestId('save-tail').selectOption({ label: 'Stand-in Phase' });
n = log.length;
await saveButton().click();
await page.waitForTimeout(600);
check(
  'head and tail swapped are refused: the route would turn round',
  /Head and tail swapped would turn the route round/.test(await body()),
  (await body()).slice(-200),
);
check('  and nothing is written', writesSince(n).length === 0, said(writesSince(n)));
await page.getByRole('button', { name: 'Back to map' }).click();
await page.getByTitle('Discard this route').click();
await page.waitForTimeout(300);

// ---- 10b. The switch's top band, and a card left open under another map
{
  const mapOf = () => new URL(page.url()).searchParams.get('map');
  /** The text of the button under the middle of the named button, or null if something else is. */
  const reachable = (locator) =>
    locator.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return hit?.closest('button') === el;
    });
  const band = await page.locator('[role=radiogroup]').evaluate((el) => {
    const b = el.parentElement.getBoundingClientRect();
    return { top: b.top, bottom: b.bottom, width: b.width };
  });
  check(
    "the switch has a band of its own, 48 px high, at the page's top edge",
    band.top === 0 && band.bottom === 48 && band.width === 1280,
    JSON.stringify(band),
  );
  for (const width of [768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(400);
    check(
      `at ${width} px the pill's buttons are clickable, clear of the switch`,
      (await reachable(page.getByRole('button', { name: 'Password' }))) &&
        (await reachable(page.getByRole('button', { name: 'Sign out' }))),
    );
  }
  await page.setViewportSize({ width: 1024, height: 800 });
  await openCard(OUT[1]);
  await page.waitForTimeout(500);
  check(
    "at 1024 px the corner trip card's ✕ is clickable, clear of the switch",
    await reachable(
      page.locator('[data-testid="card"]').first().getByRole('button', { name: 'Close' }),
    ),
  );
  const cardOpen = async () => (await page.locator('[data-testid="card"]').count()) > 0;
  await page.getByRole('radio', { name: 'Playground' }).focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.locator('label', { hasText: 'Playground' }).click();
  await page.waitForTimeout(400);
  check(
    'Escape on another map leaves a card open in the Playground alone',
    mapOf() === 'playground' && (await cardOpen()),
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('  and Escape in the Playground still closes it', !(await cardOpen()));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(300);
}

// ---- 10c. A new head and tail made from the save panel, the line left alone
{
  const draftOf = () => page.evaluate(() => localStorage.getItem('parapo.draft.v1'));
  const NEW = '+new-place';
  const L = [at(-0.003, 0.02), at(0, 0.0212), at(0.003, 0.02)];
  await go(at(0, 0.02), 15);
  await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
  await page.getByRole('menuitem', { name: /Routes/ }).click();
  await page.waitForTimeout(200);
  for (const p of L) await clickAt(p, 300);
  await idle();
  await page.getByRole('button', { name: /Done/ }).click();
  await page.waitForTimeout(600);
  const draftBefore = await draftOf();
  // Where the clicks landed, a pixel's worth off the points asked for.
  const line = JSON.parse(draftBefore).controlPoints;
  const form = (end) => page.getByRole('group', { name: `New place for the ${end}` });
  const isFocused = (locator) => locator.evaluate((e) => e === document.activeElement);
  const stopsBefore = tables.stop.length;
  const routesBefore = tables.route.length;

  check(
    'each end picker ends with "+ New place here…"',
    (await page.getByTestId('save-head').locator('option').last().innerText()) ===
      '+ New place here…' &&
      (await page.getByTestId('save-tail').locator('option').last().innerText()) ===
        '+ New place here…',
  );

  await page.getByTestId('save-head').selectOption(NEW);
  await page.waitForTimeout(300);
  check(
    'the head option opens a form inside the panel: Terminal chosen, focus on the ground name',
    (await form('head').isVisible()) &&
      (await form('head').getByLabel('Terminal').isChecked()) &&
      (await isFocused(form('head').getByLabel(/Ground name/))),
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check(
    '  Escape closes only the form: the panel stays, focus returns to the picker',
    !(await form('head').isVisible()) &&
      (await saveButton().isVisible()) &&
      (await isFocused(page.getByTestId('save-head'))),
  );

  await page.getByTestId('save-head').selectOption(NEW);
  // A place that already has a terminal, in the name people say it by.
  const taken = tables.stop.find((r) => r.kind === 'terminal');
  await form('head')
    .getByLabel(/Ground name/)
    .fill(taken.informal ?? taken.name);
  await form('head').getByRole('button', { name: 'Save place' }).click();
  await page.waitForTimeout(500);
  check(
    '  a name that is already a place is refused in words, with nothing written',
    /is already a place/.test(await form('head').innerText()) && tables.stop.length === stopsBefore,
    (await form('head').innerText()).slice(-160),
  );

  let n = log.length;
  await form('head')
    .getByLabel(/Ground name/)
    .fill('Stand-in Newhead');
  await form('head')
    .getByLabel(/Stop name/)
    .fill('Newhead');
  await page.keyboard.press('Enter');
  await waitFor(() => tables.stop.some((r) => r.name === 'Stand-in Newhead'));
  // The save ends when its links are written and the form closes, not when the box is in the table.
  await form('head').waitFor({ state: 'hidden' });
  const head = tables.stop.find((r) => r.name === 'Stand-in Newhead');
  const boxOf = (r) => r.area.coordinates[0];
  const metres = ([lng1, lat1], [lng2, lat2]) => {
    const rad = Math.PI / 180;
    const h =
      Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
    return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
  };
  check(
    "the head is created as a terminal with a 30 m box centred on the line's first point",
    !!head &&
      head.kind === 'terminal' &&
      head.informal === 'Newhead' &&
      boxOf(head).length === 5 &&
      Math.abs(metres(boxOf(head)[0], boxOf(head)[1]) - 30) < 0.5 &&
      metres(head.point.coordinates, line[0]) < 0.5,
    '',
  );
  check(
    "  through the hotspot panel's own write: one stop row and its links, nothing else",
    writesSince(n).every((w) => w.table === 'stop' || w.table === 'route_stop') &&
      writesSince(n).filter((w) => w.method === 'POST' && w.table === 'stop').length === 1,
    said(writesSince(n)),
  );
  check(
    '  the picker shows it, the form is gone, focus is back on the picker',
    (await page.getByTestId('save-head').evaluate((e) => e.selectedOptions[0]?.text)) ===
      'Newhead' &&
      !(await form('head').isVisible()) &&
      (await isFocused(page.getByTestId('save-head'))),
  );

  await page.getByTestId('save-tail').selectOption(NEW);
  await page.waitForTimeout(300);
  check(
    'the tail option opens the same form, Hintuan chosen',
    (await form('tail').isVisible()) && (await form('tail').getByLabel('Hintuan').isChecked()),
  );
  await form('tail')
    .getByLabel(/Ground name/)
    .fill('Stand-in Newtail');
  await form('tail').getByRole('button', { name: 'Save place' }).click();
  await waitFor(() => tables.stop.some((r) => r.name === 'Stand-in Newtail'));
  await form('tail').waitFor({ state: 'hidden' });
  const tail = tables.stop.find((r) => r.name === 'Stand-in Newtail');
  check(
    "the tail is created as a hintuan with a 30 m box centred on the line's last point",
    !!tail &&
      tail.kind === 'hintuan' &&
      boxOf(tail).length === 5 &&
      Math.abs(metres(boxOf(tail)[0], boxOf(tail)[1]) - 30) < 0.5 &&
      metres(tail.point.coordinates, line[line.length - 1]) < 0.5,
  );
  check(
    '  the drawn line is untouched by both',
    (await draftOf()) === draftBefore && tables.stop.length === stopsBefore + 2,
  );

  n = log.length;
  await saveButton().click();
  await waitFor(async () => (await toast().count()) > 0);
  const made = tables.route.find((r) => r.head_stop_id === head?.id && r.tail_stop_id === tail?.id);
  check(
    'the route saves with the new places as its head and tail',
    !!made && tables.route.length === routesBefore + 1,
    said(writesSince(n)),
  );
  await dismissToasts();

  // Leave the stand-in as it was for what follows.
  if (made) remove('route', [made]);
  if (head) remove('stop', [head]);
  if (tail) remove('stop', [tail]);
  await page.evaluate(() => localStorage.removeItem('parapo.draft.v1'));
}

// ---- 10d. The new-place form: what Enter does, one write, a retry, a name already taken
{
  const NEW = '+new-place';
  const draftOf = () => page.evaluate(() => localStorage.getItem('parapo.draft.v1'));
  // A short line out of P1's corner, among the saved lines, so the lines near its ends are read.
  const L = [at(-0.004, 0.0004), at(-0.0035, 0.002)];
  await go(at(-0.004, 0.001), 15);
  await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
  await page.getByRole('menuitem', { name: /Routes/ }).click();
  await page.waitForTimeout(200);
  for (const p of L) await clickAt(p, 300);
  await idle();
  await page.getByRole('button', { name: /Done/ }).click();
  await page.waitForTimeout(600);
  const draftBefore = await draftOf();
  const routesBefore = tables.route.length;
  const form = (end) => page.getByRole('group', { name: `New place for the ${end}` });
  const stopsNamed = (name) => tables.stop.filter((r) => r.name === name);
  const stopWrites = (n) => writesSince(n).filter((w) => w.method === 'POST' && w.table === 'stop');
  const open = async (end) => {
    await page.getByTestId(`save-${end.toLowerCase()}`).selectOption(NEW);
    await form(end)
      .getByLabel(/Ground name/)
      .waitFor();
  };
  const taken = tables.stop.find((r) => r.kind === 'terminal');

  // 4. A name that is already a place is refused, case and spacing as the pickers group it.
  await open('Head');
  await form('Head')
    .getByLabel(/Ground name/)
    .fill(` ${(taken.informal ?? taken.name).toUpperCase()} `);
  let n = log.length;
  // Enter is ignored while nearby lines are loading, just like the disabled
  // Save place button. Exercise name validation only once saving is ready.
  await waitFor(async () => form('Head').getByRole('button', { name: 'Save place' }).isEnabled());
  await page.keyboard.press('Enter');
  await form('Head').getByRole('alert').waitFor();
  check(
    'a ground name that is already a place is refused, however it is cased, and nothing is written',
    /is already a place: pick it from the list/.test(await form('Head').innerText()) &&
      stopWrites(n).length === 0,
    (await form('Head').innerText()).slice(-140),
  );
  await page.keyboard.press('Escape');

  // 2. No write before the lines near the box are read; then one box for two quick Enters.
  const release = holdRequests(
    (method, table, u) => method === 'GET' && table === 'route_variant' && /shape/.test(u.search),
  );
  await open('Head');
  await form('Head')
    .getByLabel(/Ground name/)
    .fill('Stand-in Guard');
  n = log.length;
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  check(
    'Enter before the lines near the box are read writes nothing, and Save place waits',
    stopWrites(n).length === 0 &&
      (await form('Head').getByRole('button', { name: 'Save place' }).isDisabled()),
  );
  release();
  await waitFor(async () => form('Head').getByRole('button', { name: 'Save place' }).isEnabled());
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await waitFor(() => stopsNamed('Stand-in Guard').length > 0);
  // Only once the form has closed is the next one a new form, not this one still saving.
  await form('Head').waitFor({ state: 'hidden' });
  check(
    'two Enters write one box, once the lines are in',
    stopsNamed('Stand-in Guard').length === 1 && stopWrites(n).length === 1,
    said(writesSince(n)),
  );

  // 1. Enter on a radio saves the place and leaves the route unsaved.
  n = log.length;
  await open('Head');
  await form('Head')
    .getByLabel(/Ground name/)
    .fill('Stand-in Radio Head');
  await waitFor(async () => form('Head').getByRole('button', { name: 'Save place' }).isEnabled());
  await form('Head').getByLabel('Hintuan').focus();
  await page.keyboard.press('Enter');
  await waitFor(() => stopsNamed('Stand-in Radio Head').length > 0);
  await form('Head').waitFor({ state: 'hidden' });
  check(
    'Enter on the Hintuan radio saves the place and not the route',
    stopsNamed('Stand-in Radio Head').length === 1 &&
      tables.route.length === routesBefore &&
      (await saveButton().isVisible()),
  );
  await open('Tail');
  await form('Tail')
    .getByLabel(/Ground name/)
    .fill('Stand-in Radio Tail');
  await waitFor(async () => form('Tail').getByRole('button', { name: 'Save place' }).isEnabled());
  await form('Tail').getByLabel('Terminal').focus();
  await page.keyboard.press('Enter');
  await waitFor(() => stopsNamed('Stand-in Radio Tail').length > 0);
  await form('Tail').waitFor({ state: 'hidden' });
  check(
    '  and on the Terminal radio',
    stopsNamed('Stand-in Radio Tail').length === 1 &&
      tables.route.length === routesBefore &&
      (await saveButton().isVisible()),
  );

  // 3. A retry after the links failed updates the box it wrote.
  await open('Tail');
  await form('Tail')
    .getByLabel(/Ground name/)
    .fill('Stand-in Retry');
  await waitFor(async () => form('Tail').getByRole('button', { name: 'Save place' }).isEnabled());
  fault = (method, table) => method === 'DELETE' && table === 'route_stop';
  await page.keyboard.press('Enter');
  await waitFor(async () => /Press Save again to retry/.test(await form('Tail').innerText()));
  check(
    'a failed link write is said, with the box already written once',
    /Press Save again to retry/.test(await form('Tail').innerText()) &&
      stopsNamed('Stand-in Retry').length === 1,
  );
  n = log.length;
  await form('Tail')
    .getByLabel(/Ground name/)
    .press('Enter');
  await form('Tail').waitFor({ state: 'hidden' });
  check(
    '  the retry updates that box: one row, no second POST',
    stopsNamed('Stand-in Retry').length === 1 &&
      stopWrites(n).length === 0 &&
      writesSince(n).some((w) => w.method === 'PATCH' && w.table === 'stop'),
    said(writesSince(n)),
  );
  check('  the drawn line is untouched through all of it', (await draftOf()) === draftBefore);

  // Leave the stand-in as it was for what follows.
  for (const name of [
    'Stand-in Guard',
    'Stand-in Radio Head',
    'Stand-in Radio Tail',
    'Stand-in Retry',
  ])
    for (const r of stopsNamed(name)) remove('stop', [r]);
  await page.getByRole('button', { name: 'Back to map' }).click();
  await page.getByTitle('Discard this route').click();
  await page.waitForTimeout(300);
}

// ---- 11. Signing in from Done leaves the drawing keys alive
const guest = await open(false, '/studio/?e2e=1');
const guestBody = async () => (await guest.locator('body').innerText()).replace(/\s+/g, ' ');
const gbox = await guest.locator('canvas.maplibregl-canvas').boundingBox();
await guest.evaluate(([c]) => window.__map.jumpTo({ center: c, zoom: 15 }), [at(0, 0)]);
await guest.waitForTimeout(400);
await guest.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
await guest.getByRole('menuitem', { name: /Routes/ }).click();
for (const p of OUT) {
  const q = await guest.evaluate((ll) => {
    const r = window.__map.project(ll);
    return [r.x, r.y];
  }, p);
  await guest.mouse.click(gbox.x + q[0], gbox.y + q[1]);
  await guest.waitForTimeout(300);
}
await guest.getByRole('button', { name: /Done/ }).click();
await guest.waitForTimeout(400);
check(
  'signed out, Done asks for sign-in',
  (await guest.getByPlaceholder('you@example.com').count()) === 1,
);
await guest.getByPlaceholder('you@example.com').fill('owner@example.com');
await guest.getByPlaceholder('Password').fill('stand-in');
// With a Turnstile site key in the build, Sign in waits for the check.
await guest.waitForFunction(() => !document.querySelector('button[type="submit"]')?.disabled);
await guest.getByPlaceholder('Password').press('Enter');
await guest.waitForTimeout(1200);
check(
  '  signing in closes the dialog',
  (await guest.getByPlaceholder('you@example.com').count()) === 0,
);
const before = Number((await guestBody()).match(/(\d+) points?\b/)?.[1] ?? 0);
await guest.keyboard.press('Control+z');
await guest.waitForTimeout(300);
const after = Number((await guestBody()).match(/(\d+) points?\b/)?.[1] ?? 0);
check(
  '  and Ctrl+Z still undoes (9)',
  before === OUT.length && after === OUT.length - 1,
  `${before} → ${after} points`,
);
await guest.keyboard.press('Enter');
await guest.waitForTimeout(500);
check(
  '  and Enter still opens the save panel (9)',
  (await guest.getByTestId('save-head').count()) === 1,
);

// A line that comes back to where it began: the panel's first guess puts one
// place at both ends, and the timeline's two end rows used to share a key.
// Its last point south of the line, 50 m clear of it: one 9 m off, as it was,
// is two pixels at zoom 15, where a click inserts into the line instead.
await drawLine([P1, at(0, 0.0012), at(-0.0036, -0.0004)]);
check(
  'a line back to its start guesses one place at both ends',
  (await page.getByTestId('save-head').inputValue()) !== '' &&
    (await page.getByTestId('save-head').inputValue()) ===
      (await page.getByTestId('save-tail').inputValue()),
);
await page.getByRole('button', { name: 'Back to map' }).click();
await page.getByTitle('Discard this route').click();
await page.waitForTimeout(300);
// ---- 12. On a phone: 390×844, a notch of 47 px and a home bar of 34
const phone = await open(true, '/studio/', true);
const rect = (loc) => loc.first().boundingBox();
const overlap = (a, z) =>
  !!a &&
  !!z &&
  a.x < z.x + z.width &&
  z.x < a.x + a.width &&
  a.y < z.y + z.height &&
  z.y < a.y + a.height;
check(
  'phone: the credits start folded to their ⓘ',
  (await phone.locator('.maplibregl-compact-show').count()) === 0 &&
    (await phone.locator('.maplibregl-ctrl-attrib').count()) === 1,
);
const pill = await rect(phone.getByRole('button', { name: 'Sign out' }));
check('phone: the account pill is below the notch', !!pill && pill.y >= 47, JSON.stringify(pill));
// The band clears the notch itself, so the map's own offsets must not add it again.
const bandBox = await rect(phone.locator('[role=radiogroup]').locator('..'));
const pillBox = await rect(phone.getByRole('button', { name: 'Sign out' }).locator('..'));
const ctrlBox = await rect(phone.locator('.maplibregl-ctrl-top-right'));
check(
  'phone: the notch is paid once — the pill and the map controls start within 16 px of the band',
  !!bandBox &&
    !!pillBox &&
    !!ctrlBox &&
    bandBox.y + bandBox.height === 95 &&
    pillBox.y - 95 >= 0 &&
    pillBox.y - 95 <= 16 &&
    ctrlBox.y - 95 >= 0 &&
    ctrlBox.y - 95 <= 16,
  JSON.stringify({ bandBox, pillBox, ctrlBox }),
);
const newPlus = await rect(phone.getByRole('button', { name: 'New route, terminal or hintuan' }));
check(
  'phone: the New + is above the home bar',
  !!newPlus && newPlus.y + newPlus.height <= 844 - 34,
  JSON.stringify(newPlus),
);
await phone.evaluate(([c]) => window.__map.jumpTo({ center: c, zoom: 15 }), [at(0, 0)]);
await phone.waitForTimeout(400);
await phone.getByRole('button', { name: 'New route, terminal or hintuan' }).tap();
await phone.getByRole('menuitem', { name: /Routes/ }).tap();
const pbox = await phone.locator('canvas.maplibregl-canvas').boundingBox();
for (const p of [P1, at(0, -0.003), P2]) {
  const q = await phone.evaluate((ll) => {
    const r = window.__map.project(ll);
    return [r.x, r.y];
  }, p);
  await phone.touchscreen.tap(pbox.x + q[0], pbox.y + q[1]);
  await phone.waitForTimeout(300);
}
await phone
  .waitForFunction(() => !document.body.innerText.includes('snapping…'), null, { timeout: 15000 })
  .catch(() => {});
await phone.getByRole('button', { name: /Done/ }).tap();
await phone.waitForTimeout(600);
const sheet = await rect(phone.locator('form').filter({ has: phone.getByTestId('save-head') }));
check(
  'phone: the save panel fills the screen',
  !!sheet && sheet.x === 0 && sheet.width === 390 && sheet.height === 844,
  JSON.stringify(sheet),
);
const heading = await rect(phone.getByRole('heading').first());
check('  its heading clears the notch', !!heading && heading.y >= 47, JSON.stringify(heading));
check(
  '  no field is focused, so no keyboard springs up',
  await phone.evaluate(() => !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName ?? '')),
);
const small = await phone.evaluate(() =>
  [...document.querySelectorAll('form input:not([type=checkbox]), form select')]
    .map((e) => parseFloat(getComputedStyle(e).fontSize))
    .filter((px) => px < 16),
);
check(
  '  every field is 16 px, so iOS does not zoom in on it',
  small.length === 0,
  `${small.length} under 16 px`,
);
const phoneSave = phone.getByRole('button', { name: /^(Save|Update)$/ });
const saveAt = await rect(phoneSave);
check(
  '  Save shows at the foot, above the home bar',
  !!saveAt && saveAt.y + saveAt.height <= 844 - 34 && saveAt.y > 844 / 2,
  JSON.stringify(saveAt),
);
// The keyboard up: the page 365 px shorter, as interactive-widget=resizes-content makes it.
await phone.getByPlaceholder('Zabarte').fill('Phone Road');
await phone.setViewportSize({ width: 390, height: 479 });
await phone.waitForTimeout(300);
const saveUp = await rect(phoneSave);
check(
  '  and still shows over a keyboard',
  !!saveUp && saveUp.y + saveUp.height <= 479,
  JSON.stringify(saveUp),
);
await phone.setViewportSize({ width: 390, height: 844 });
await phone.waitForTimeout(300);
await phoneSave.tap();
const phoneToast = phone.getByTestId('toast').filter({ hasText: /^Saved/ });
for (let t = 0; t < 50 && (await phoneToast.count()) === 0; t++) await phone.waitForTimeout(100);
const toastAt = await rect(phoneToast);
check(
  'phone: the saved toast fits the screen, below the notch',
  !!toastAt && toastAt.x >= 0 && toastAt.x + toastAt.width <= 390 && toastAt.y >= 47,
  JSON.stringify(toastAt),
);
check('  and does not cover the New +', !overlap(toastAt, newPlus));
// The owner dropped the 44 px floor (2026-10-16): the toast's buttons are
// sized by their padding and text, the same under a finger as under a mouse.
const floored = await phone.evaluate(
  () =>
    [...document.querySelectorAll('[data-testid=toast] button')]
      .map((e) => getComputedStyle(e))
      .filter(
        (c) => !['auto', '0px'].includes(c.minHeight) || !['auto', '0px'].includes(c.minWidth),
      ).length,
);
check('  its buttons have no size floor for a finger', floored === 0, `${floored} floored`);
check(
  'phone: nothing scrolls sideways',
  await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
);

check(
  'no page errors or React warnings (the duplicate key)',
  warnings.length === 0,
  warnings.slice(0, 3).join(' | '),
);
await page.screenshot({ path: 'save-test.png' });
await b.close();
tally();
