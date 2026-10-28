// save-test's core flows a second time, with drafts on (VITE_STUDIO_DRAFTS=1),
// the save path the live studio takes: signed in, against the stand-in that
// keeps drafts (lib/fake-studio-db.mjs), on today's published map. The
// basemap is a flat grey and the router has no roads, so every line is
// freehand and nothing reaches the live project.
//
//   VITE_STUDIO_DRAFTS=1 npm run dev     (in another terminal)
//   node tests/e2e/save-drafts-test.mjs
//
// What it checks, flow by flow as save-test drives them: a hintuan traced and
// saved is a hotspot draft and no write to the approved tables; a new route
// is one route draft with its slot and its links to the two hintuans; Edit
// route is a draft built on the approved route's revision with the edited
// line; a signboard goes to the bucket and into the route's draft, the
// approved row untouched, and ✕ takes it out of the draft; Delete is a draft
// with the direction emptied, approved in the same press, so the line is gone
// and, being the route's last, the route comes down. Between flows the
// stand-in approves the draft, as an editor's Approve would, so each flow
// starts from the approved map as save-test's does.
import { chromium } from 'playwright';

import { readPublished } from './lib/big-map.mjs';
import { BASE, bareStyle, harness, waitForSource } from './lib/harness.mjs';
import { fakeStudioDb } from './lib/fake-studio-db.mjs';
import { fakeTurnstile } from './lib/fake-turnstile.mjs';
import { signInAsEditor } from './lib/studio-session.mjs';

const { check, tally } = harness();

// ------------------------------------------------------------- the tables
const m = readPublished();
const now = '2026-09-25T12:00:00+00:00';
const routes = new Map();
for (const v of m.variants) {
  routes.set(v.route.id, {
    id: v.route.id,
    owner_id: 'owner',
    signboard: v.route.signboard ?? null,
    route_code: null,
    short_name: null,
    long_name: v.route.long_name ?? null,
    mode: v.route.mode,
    fare_note: v.route.fare_note ?? null,
    fare_as_of: null,
    head_stop_id: v.route.head_stop_id ?? null,
    tail_stop_id: v.route.tail_stop_id ?? null,
    via: v.route.via ?? null,
    is_loop: v.route.is_loop === true,
    status: 'approved',
    revision: 1,
    created_at: now,
    updated_at: now,
  });
}
const seed = {
  route: [...routes.values()],
  route_variant: m.variants.map((v) => ({
    id: v.id,
    route_id: v.route_id,
    owner_id: 'owner',
    direction_name: null,
    origin_terminal: null,
    destination_terminal: null,
    shape: v.shape,
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
  stop: m.stops.map((s) => ({
    ...s,
    owner_id: 'owner',
    status: 'approved',
    revision: 1,
    created_at: now,
  })),
  route_stop: m.links.map((l) => ({
    route_variant_id: l.route_variant_id,
    stop_id: l.stop_id,
    stop_sequence: l.stop_sequence,
  })),
};

// The empty ground east of the data, where save-test draws too.
const all = m.variants.flatMap((v) => v.shape?.coordinates ?? []);
const east = Math.max(...all.map((c) => c[0]));
const south = Math.min(...all.map((c) => c[1]));
const north = Math.max(...all.map((c) => c[1]));
const A = [east + 0.03, (south + north) / 2];
const at = (dx, dy) => [A[0] + dx, A[1] + dy];
const P1 = at(-0.004, 0);
const P2 = at(0.004, 0);
const OUT = [P1, at(0, 0.0012), P2];
const R = 0.0004;
const APPROVED_TABLES = ['route', 'route_variant', 'route_stop', 'stop'];

// The signboards bucket (0010), as save-test answers it: an upload, the public read, a delete.
const bucket = new Map();
const storageLog = [];
const storage = async (r) => {
  const req = r.request();
  const u = new URL(req.url());
  const name = decodeURIComponent(u.pathname.split('/').pop());
  storageLog.push(`${req.method()} ${u.pathname}`);
  if (req.method() === 'GET' && u.pathname.includes('/object/public/signboards/'))
    return bucket.has(name)
      ? r.fulfill({ status: 200, contentType: 'image/svg+xml', body: bucket.get(name) })
      : r.fulfill({ status: 400, body: '{"error":"not_found"}' });
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

// ------------------------------------------------------------ the browser
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));
page.on('console', (msg) => {
  if (msg.type() === 'error' && /Warning|key/.test(msg.text()))
    errors.push(msg.text().slice(0, 160));
});
page.on('dialog', (d) => d.accept());
await bareStyle(page, '#e8e8e8');
await signInAsEditor(page);
const db = await fakeStudioDb(page, seed);
const { tables, log } = db;
await page.route(/\/storage\/v1\/object\//, storage);
await fakeTurnstile(page);
await page.route(/router\.project-osrm\.org|routing\.openstreetmap\.de/, (r) =>
  r.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 'NoRoute', routes: [] }),
  }),
);

/** The studio, loaded with its routes: the first time, and again after the stand-in approves. */
async function load() {
  await page.goto(`${BASE}/studio/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__map && window.__map.loaded(), null, { timeout: 30000 });
  if ((await waitForSource(page, 'saved-routes', 30000)).length === 0)
    throw new Error('the routes did not load in 30 s');
  await page.waitForTimeout(500);
}
await load();

const body = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
const writesSince = (n) => log.slice(n).filter((w) => w.method !== 'GET' && w.method !== 'HEAD');
const said = (ws) => ws.map((w) => `${w.method} ${w.table}${w.query.slice(0, 70)}`).join(' · ');
const approvedWrites = (ws) => ws.filter((w) => APPROVED_TABLES.includes(w.table));
const rpcs = (ws, name) => ws.filter((w) => w.method === 'POST' && w.table === name);
const go = async (c, zoom) => {
  await page.evaluate(([c, z]) => window.__map.jumpTo({ center: c, zoom: z }), [c, zoom]);
  await page.waitForTimeout(400);
};
const px = async (ll) => {
  await page
    .waitForFunction(() => !window.__map.isMoving(), null, { timeout: 3000 })
    .catch(() => {});
  const box = await page.locator('canvas.maplibregl-canvas').boundingBox();
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
const waitFor = async (fn, ms = 5000) => {
  for (let t = 0; t < ms; t += 100) {
    if (await fn()) return true;
    await page.waitForTimeout(100);
  }
  return false;
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
const DRAFTED = 'Saved as a draft. The map changes once it is approved.';
const drafted = () => waitFor(async () => (await body()).includes(DRAFTED));
const draftOf = (kind, subjectId) =>
  tables.draft.find((d) => d.kind === kind && d.subject_id === subjectId);
/** The stand-in approves every draft, as an editor's Approve would, and the studio reads the map again. */
const approveAll = async () => {
  for (const d of [...tables.draft]) db.approve(d.id);
  await load();
};

// ---- 1. Two hintuans, traced and saved as drafts
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
  return writesSince(n);
}
let w = await hintuan(P1, 'Stand-in Head');
const headDraft = tables.draft.find(
  (d) => d.kind === 'hotspot' && d.payload.stop.name === 'Stand-in Head',
);
check(
  'a hintuan traced and saved is one new hotspot draft',
  !!headDraft && headDraft.is_new === true && rpcs(w, 'claim_draft').length === 1,
  said(w),
);
check(
  '  with its traced box and no links, where no line passes',
  headDraft?.payload.stop.kind === 'hintuan' &&
    headDraft?.payload.stop.area?.type === 'Polygon' &&
    headDraft?.payload.links.length === 0,
  JSON.stringify(headDraft?.payload.links),
);
check('  and nothing written to the approved tables', approvedWrites(w).length === 0, said(w));
check('  the studio says it is a draft', await drafted());
w = await hintuan(P2, 'Stand-in Tail');
check(
  'a second one',
  tables.draft.some((d) => d.kind === 'hotspot' && d.payload.stop.name === 'Stand-in Tail') &&
    approvedWrites(w).length === 0,
  said(w),
);
await approveAll();
const head = tables.stop.find((s) => s.name === 'Stand-in Head');
const tail = tables.stop.find((s) => s.name === 'Stand-in Tail');
check('  approved, both are places on the map', !!head && !!tail);

// ---- 2. A route between them, saved as a draft with its slot
await go(at(0, 0), 15);
await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
await page.getByRole('menuitem', { name: /Routes/ }).click();
await page.waitForTimeout(200);
for (const p of OUT) await clickAt(p, 300);
await done();
check(
  'Done opens the save panel, the ends guessed from where the line runs',
  (await page.getByTestId('save-head').inputValue()) !== '' &&
    (await page.getByTestId('save-tail').inputValue()) !== '',
);
let n = log.length;
await saveButton().click();
await drafted();
w = writesSince(n);
const routeDraft = tables.draft.find(
  (d) =>
    d.kind === 'route' &&
    d.payload.route.head_stop_id === head?.id &&
    d.payload.route.tail_stop_id === tail?.id,
);
const draftDirections = routeDraft?.payload.directions ?? [];
check(
  'a new route is one new route draft: two directions, one of them an empty slot',
  !!routeDraft &&
    routeDraft.is_new === true &&
    draftDirections.length === 2 &&
    draftDirections.filter((v) => v.shape === null).length === 1,
  said(w),
);
const outDraft = draftDirections.find((v) => v.shape);
check(
  '  its line carries the overview beside it (0009)',
  !!outDraft?.overview && outDraft.overview.coordinates.length >= 2,
);
check(
  '  the line is linked to the two hintuans it runs between',
  [head?.id, tail?.id].every((id) => outDraft?.links.some((l) => l.stop_id === id)),
  JSON.stringify(outDraft?.links),
);
check('  nothing written to the approved tables', approvedWrites(w).length === 0, said(w));
check(
  '  the drawing kept on the device is gone',
  (await page.evaluate(() => localStorage.getItem('para.draft.v1'))) === null,
);
await approveAll();
const route = tables.route.find((r) => r.id === routeDraft?.subject_id);
const outV = tables.route_variant.find((v) => v.id === outDraft?.id);
check(
  '  approved, the route is on the map with its line',
  route?.status === 'approved' && !!outV?.shape,
  `${route?.status}; ${outV ? 'line' : 'no line'}`,
);

// ---- 3. Edit a direction
async function openCard(ll) {
  await go(at(0, 0), 15);
  await clickAt(ll, 700);
}
await openCard(OUT[1]);
check(
  'a tap on the line opens its card, with Edit route',
  (await page.getByRole('button', { name: 'Edit route' }).count()) === 1,
);
await page.getByRole('button', { name: 'Edit route' }).click();
await waitFor(async () => (await pointsShown()) === OUT.length);
check(
  '  Edit route loads its points',
  (await pointsShown()) === OUT.length,
  `${await pointsShown()} points`,
);
await go(at(0, 0), 15);
await clickAt(at(0.0055, 0.0005), 300);
await waitFor(async () => (await pointsShown()) === OUT.length + 1);
await done();
check(
  '  the panel says it updates this direction',
  (await body()).includes('Update this direction'),
);
n = log.length;
const revisionBefore = route?.revision;
await saveButton().click();
await drafted();
w = writesSince(n);
const editDraft = draftOf('route', route?.id);
const editedOut = editDraft?.payload.directions.find((v) => v.id === outV?.id);
check(
  '  Update is a draft of the route, built on its approved revision',
  !!editDraft &&
    editDraft.is_new === false &&
    editDraft.base_revision === revisionBefore &&
    rpcs(w, 'claim_draft').length === 1,
  said(w),
);
check(
  '  with the edited line: one point more, the same two directions',
  editedOut?.control_points.length === OUT.length + 1 && editDraft?.payload.directions.length === 2,
  `${editedOut?.control_points.length} points`,
);
check('  nothing written to the approved tables', approvedWrites(w).length === 0, said(w));
check(
  '  the approved line is as it was until approval',
  outV?.control_points.length === OUT.length,
);
await approveAll();

// ---- 4. Signboards, per direction
const items = () => page.getByTestId('signboard-item');
const upload = (name, text) =>
  page
    .getByTestId('signboard-file')
    .setInputFiles({ name, mimeType: 'image/svg+xml', buffer: Buffer.from(text) });
await openCard(OUT[1]);
check(
  'the trip card has a Signboard for the direction on show',
  (await page.getByTestId('signboard-editor').count()) === 1 && (await items().count()) === 0,
);
n = log.length;
await upload(
  'board.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 98 40" onload="alert(1)"><rect width="98" height="40" fill="#111"/></svg>',
);
await waitFor(async () => (await items().count()) === 1);
w = writesSince(n);
const boardDraft = draftOf('route', route?.id);
const board = boardDraft?.payload.directions.find((v) => v.id === outV?.id)?.signboards?.[0];
check(
  '  an upload lands in the bucket cleaned, and is listed in the route draft',
  /^[0-9a-f-]{36}\.svg$/.test(board ?? '') &&
    bucket.has(board) &&
    !/onload|alert/.test(bucket.get(board) ?? ''),
  `${board}; ${said(w)}`,
);
check(
  '  the approved direction lists no board until approval',
  tables.route_variant.find((v) => v.id === outV?.id)?.signboards.length === 0 &&
    approvedWrites(w).length === 0,
  said(w),
);
n = log.length;
await page.getByRole('button', { name: 'Remove signboard 1' }).click();
await waitFor(async () => (await items().count()) === 0);
w = writesSince(n);
check(
  '  ✕ takes it out of the draft, which is updated in place',
  draftOf('route', route?.id)?.id === boardDraft?.id &&
    draftOf('route', route?.id)?.payload.directions.find((v) => v.id === outV?.id)?.signboards
      .length === 0 &&
    approvedWrites(w).length === 0,
  said(w),
);
check('  and leaves the file in the bucket: the approved map may still list it', bucket.has(board));
await approveAll();

// ---- 5. Delete a direction: a draft approved in the same press
await openCard(OUT[1]);
n = log.length;
await page.getByRole('button', { name: 'Delete' }).click();
await waitFor(async () => (await page.getByRole('button', { name: 'Edit route' }).count()) === 0);
await page.waitForTimeout(800);
w = writesSince(n);
check(
  'Delete stores a draft and approves it: claim, submit, approve',
  rpcs(w, 'claim_draft').length === 1 &&
    rpcs(w, 'submit_draft').length === 1 &&
    rpcs(w, 'approve_reviewed_draft').length === 1 &&
    !draftOf('route', route?.id),
  said(w),
);
const emptied = tables.route_variant.find((v) => v.id === outV?.id);
check(
  '  the direction is emptied into a slot: the row stays, with no line, overview or links',
  !!emptied &&
    emptied.shape === null &&
    emptied.overview === null &&
    !tables.route_stop.some((l) => l.route_variant_id === outV?.id),
);
check(
  '  its route had no other line, so it comes down',
  tables.route.find((r) => r.id === route?.id)?.status === 'taken_down',
);
check(
  '  no error shown',
  !/error|refused|Nothing was saved/i.test(await body()),
  (await body()).slice(-160),
);

check('no React warnings or page errors', errors.length === 0, errors.join(' | '));
await browser.close();
tally();
