// What the save suites share: today's published map and 500 far-off hintuans
// in a stand-in for the database, answered the way PostgREST answers (the
// filters the studio sends, its unique indexes, foreign keys and cascades),
// the signboards bucket, a faked stored session, and the studio opened on it,
// signed in, at /studio/. The basemap is a flat grey and the router has no
// roads, so every line is freehand and nothing needs the network, an account
// or the router. Nothing reaches the live tables.
//
// Importing it opens the page: save-test, save-ikot-test and save-edit-test
// each start from it, then draw their own ground on it.
import { chromium } from 'playwright';
import { readPublished } from './big-map.mjs';
import { BASE, bareStyle, harness, waitFor } from './harness.mjs';
import { fakeTurnstile } from './fake-turnstile.mjs';

/** The project ref in VITE_SUPABASE_URL, which names the storage key. */
const PROJECT_REF = 'smzwbqxttdyvohuizynl';
/** A request line past this is trouble at the gateway; the link sync once sent 19 kB. */
export const URL_LIMIT = 2000;

export const { check, tally } = harness();

// ------------------------------------------------------------- the tables
const m = readPublished();
const now = '2026-09-25T12:00:00+00:00';
const OWNER = '11111111-1111-4111-8111-111111111111';
/** The published map's routes, by id: the ones no part drew. */
export const publishedRoutes = new Map();
for (const v of m.variants) {
  publishedRoutes.set(v.route.id, {
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
export const tables = {
  route: [...publishedRoutes.values()],
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
export const at = (dx, dy) => [A[0] + dx, A[1] + dy];
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
export const remove = (table, rows) => {
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
export const log = [];
/** `stub.fault`: the next request it matches is refused with a 500, once. */
export const stub = { fault: null };
/** Requests matching `when` wait until `release()` is called: `{ when, release }`. */
let hold = null;
export const holdRequests = (when) => {
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
  if (stub.fault && stub.fault(method, table, u)) {
    stub.fault = null;
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
  // 20261030090000: the studio asks at sign-in; this stand-in's session is an editor's.
  if (table === 'rpc/am_i_editor') return { status: 200, body: true };
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
    if (no) return no;
    // A delete that asks for its rows back (`.select()`, Prefer:
    // return=representation) gets them, as PostgREST answers; the studio reads
    // none as nothing deleted.
    return /return=representation/.test(prefer) ? answer(rows) : { status: 204, body: null };
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
export const bucket = new Map();
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
export async function open(signedIn, path, phone = false) {
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

export const page = await open(true, '/studio/');
export const body = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
export const since = (n) => log.slice(n);
export const writesSince = (n) => since(n).filter((w) => w.method !== 'GET' && w.method !== 'HEAD');
export const said = (ws) =>
  ws.map((w) => `${w.method} ${w.table}${w.query.slice(0, 70)}`).join(' · ');
/** Put the map on a place, at a zoom, and give back where a [lng, lat] lands on the page. */
export const go = async (c, zoom) => {
  await page.evaluate(([c, z]) => window.__map.jumpTo({ center: c, zoom: z }), [c, zoom]);
  await page.waitForTimeout(400);
};
export const box = await page.locator('canvas.maplibregl-canvas').boundingBox();
/**
 * Where a [lng, lat] lands on the page once the camera is at rest: it glides
 * with the cards, as on the public map, since 2026-10-01 (the trip opening on
 * its whole route), and a point read mid-glide is clicked where it no longer is.
 */
export const px = async (ll) => {
  await page
    .waitForFunction(() => !window.__map.isMoving(), null, { timeout: 3000 })
    .catch(() => {});
  const p = await page.evaluate((ll) => {
    const q = window.__map.project(ll);
    return [q.x, q.y];
  }, ll);
  return [box.x + p[0], box.y + p[1]];
};
export const clickAt = async (ll, wait = 250) => {
  const [x, y] = await px(ll);
  await page.mouse.click(x, y);
  await page.waitForTimeout(wait);
};
export const idle = () =>
  page
    .waitForFunction(() => !document.body.innerText.includes('snapping…'), null, { timeout: 15000 })
    .catch(() => {});
export const pointsShown = async () => Number((await body()).match(/(\d+) points?\b/)?.[1] ?? 0);
export const done = async () => {
  await idle();
  await page.getByRole('button', { name: /Done/ }).click();
  await page.waitForTimeout(600);
};
export const saveButton = () => page.getByRole('button', { name: /^(Save|Update)$/ });
export const toast = () => page.getByTestId('toast').filter({ hasText: /^Saved/ });
export const returnTrip = () => page.getByRole('button', { name: 'Draw the return trip' });
export const dismissToasts = async () => {
  for (const d of await page.getByRole('button', { name: 'Dismiss' }).all())
    await d.click().catch(() => {});
  await page.waitForTimeout(200);
};
export const directionsOf = (routeId) => tables.route_variant.filter((v) => v.route_id === routeId);

// The ground the suite draws on, at street level: two hintuans 900 m apart,
// a route between them, its return trip by another street.
export const P1 = at(-0.004, 0),
  P2 = at(0.004, 0);
export const OUT = [P1, at(0, 0.0012), P2];
export const BACK = [P2, at(0, -0.0015), P1];
export const VIA = [P1, at(0, 0.003), P2];
export const R = 0.0004;

/** A hintuan traced round `c` and saved as `name`; the writes it sent. */
export async function hintuan(c, name) {
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

/**
 * A new route through `points`, its save panel open. `onRoutes` runs once the
 * Routes tool is picked, before the first point.
 */
export async function drawLine(points, onRoutes = async () => {}) {
  await go(at(0, 0), 15);
  await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
  await page.getByRole('menuitem', { name: /Routes/ }).click();
  await page.waitForTimeout(200);
  await onRoutes();
  for (const p of points) await clickAt(p, 300);
  await done();
}

export const metresBetween = ([lng1, lat1], [lng2, lat2]) => {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
};
export const drawnPoints = async () =>
  (await page.evaluate(() => window.__src('draw-points')))?.features.map(
    (f) => f.geometry.coordinates,
  ) ?? [];
export const closeLoop = () => page.getByTestId('close-loop');

/** Taps `ll` from the suite's ground at zoom 15; the camera as it was before the tap. */
export async function openCard(ll) {
  await go(at(0, 0), 15);
  const before = await page.evaluate(() => {
    const m = window.__map;
    const c = m.getCenter();
    return { lng: c.lng, lat: c.lat, zoom: m.getZoom() };
  });
  await clickAt(ll, 700);
  return before;
}

/**
 * The ground the parts after save-test start from, made as save-test makes it
 * and with no checks: the two hintuans, and the route between them drawn both
 * ways, its return trip closed on papunta's start. Its outbound is `outV`.
 */
export async function drawTheRoute() {
  await hintuan(P1, 'Stand-in Head');
  await hintuan(P2, 'Stand-in Tail');
  const head = tables.stop.find((s) => s.name === 'Stand-in Head');
  const tail = tables.stop.find((s) => s.name === 'Stand-in Tail');
  await drawLine(OUT);
  await saveButton().click();
  await waitFor(async () => (await toast().count()) > 0);
  await waitFor(async () => (await returnTrip().count()) > 0);
  await returnTrip().click();
  await page.waitForTimeout(400);
  await clickAt(BACK[1], 300);
  await clickAt(at(-0.002, -0.0015), 300);
  await closeLoop().click();
  await idle();
  await page.waitForTimeout(400);
  await done();
  await saveButton().click();
  await waitFor(async () => (await toast().count()) > 0);
  await page.waitForTimeout(1200);
  await dismissToasts();
  const outRoute = tables.route.find(
    (r) => r.head_stop_id === head?.id && r.tail_stop_id === tail?.id,
  );
  const outV = outRoute && directionsOf(outRoute.id).find((v) => v.reversed === false);
  if (!outV?.shape || directionsOf(outRoute.id).some((v) => !v.shape))
    throw new Error('drawTheRoute: the route is not drawn both ways');
  return { outRoute, outV };
}

/** The last check every part makes, then its screenshot, and its count. */
export async function finish(screenshot) {
  check(
    'no page errors or React warnings (the duplicate key)',
    warnings.length === 0,
    warnings.slice(0, 3).join(' | '),
  );
  await page.screenshot({ path: screenshot });
  await b.close();
  tally();
}
