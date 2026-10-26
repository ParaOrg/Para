// Two editors, one route: "being changed by", looked at and not changed, then
// discarded and taken over. /studio/?e2e=1 with VITE_STUDIO_DRAFTS=1, against
// a stand-in for the database that two pages share; no router, no tiles, no
// account, nothing reaches the live project.
//
//   VITE_STUDIO_DRAFTS=1 npm run dev       (in another terminal)
//   node tests/e2e/studio-two-editors-test.mjs
//
// What it checks: editor A edits a route and saves, which stores a draft
// under A's id. Editor B opens the same route and is told it is being changed
// by A's name (from `editor_name`), sees no Edit, Extend, Delete or signboard
// controls, and sends no write; B's Drafts list says the same under the
// draft. With no name on file, B is told "another editor" and no id or email
// shows. After A discards the draft, B reloads, can edit, and B's save
// stores a draft under B's id. B reviewing A's draft is offered Approve but not
// its details form. A card opened before A's draft cannot save over it, and a
// direct update of A's draft by B changes nothing (the stand-in applies
// draft_update as the migration 20261026090000 writes it). A hotspot's draft is held the same way: B's
// card for it says so and offers no Edit or Delete.
import { chromium } from 'playwright';

import { BASE, bareStyle, harness } from './lib/harness.mjs';
import { fakeStudioDb } from './lib/fake-studio-db.mjs';
import { signInAsEditor } from './lib/studio-session.mjs';

const { check, tally } = harness();

const A_ID = 'aaaaaaaa-0000-4000-8000-00000000000a';
const B_ID = 'bbbbbbbb-0000-4000-8000-00000000000b';
const ROUTE_ID = 'cccccccc-0000-4000-8000-00000000000c';
const OUT_ID = 'dddddddd-0000-4000-8000-00000000000d';
const BACK_ID = 'dddddddd-0000-4000-8000-00000000000e';
const NOW = '2026-10-22T00:00:00+00:00';
const LINE = [
  [121.05, 14.7],
  [121.0505, 14.7035],
  [121.049, 14.707],
  [121.05, 14.71],
];
const MIDDLE = [(LINE[1][0] + LINE[2][0]) / 2, (LINE[1][1] + LINE[2][1]) / 2];

const terminal = (id, name, [x, y]) => ({
  id,
  name,
  informal: name,
  aliases: [],
  note: null,
  created_at: NOW,
  kind: 'terminal',
  point: { type: 'Point', coordinates: [x, y] },
  area: {
    type: 'Polygon',
    coordinates: [
      [
        [x - 0.0004, y - 0.0004],
        [x + 0.0004, y - 0.0004],
        [x + 0.0004, y + 0.0004],
        [x - 0.0004, y + 0.0004],
        [x - 0.0004, y - 0.0004],
      ],
    ],
  },
  owner_id: 'owner',
  status: 'approved',
  revision: 1,
  line: null,
});
const T1 = '11111111-0000-4000-8000-000000000001';
const T2 = '11111111-0000-4000-8000-000000000002';
const shape = { type: 'LineString', coordinates: LINE };

const direction = (id, reversed, line) => ({
  id,
  route_id: ROUTE_ID,
  owner_id: 'owner',
  direction_name: null,
  origin_terminal: null,
  destination_terminal: null,
  shape: line ? shape : null,
  overview: line ? shape : null,
  control_points: line ? [LINE[0], LINE.at(-1)] : [],
  segments: line ? [{ snap: 'snapped', coordinates: LINE, streets: [] }] : [],
  reversed,
  confidence: 'drawn',
  borrowed_from: null,
  borrowed_part: null,
  borrowed_m: null,
  signboards: [],
  created_at: NOW,
  updated_at: NOW,
});

const seed = {
  stop: [terminal(T1, 'Tala', LINE[0]), terminal(T2, 'Fairview', LINE.at(-1))],
  route: [
    {
      id: ROUTE_ID,
      owner_id: 'owner',
      signboard: null,
      route_code: null,
      short_name: null,
      long_name: null,
      mode: 'jeepney',
      fare_note: null,
      fare_as_of: null,
      head_stop_id: T1,
      tail_stop_id: T2,
      via: null,
      is_loop: false,
      status: 'approved',
      revision: 1,
      created_at: NOW,
      updated_at: NOW,
    },
  ],
  route_variant: [direction(OUT_ID, false, true), direction(BACK_ID, true, false)],
  route_stop: [
    { route_variant_id: OUT_ID, stop_id: T1, stop_sequence: 0 },
    { route_variant_id: OUT_ID, stop_id: T2, stop_sequence: 1 },
  ],
  editor_name: [
    { user_id: A_ID, name: 'Marisol' },
    { user_id: B_ID, name: 'Dindo' },
  ],
};

const browser = await chromium.launch();
const errors = [];

/** The map and its routes, loaded. */
async function load(page) {
  await page.goto(`${BASE}/studio/?e2e=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__map && window.__map.loaded(), null, { timeout: 30000 });
  await page.waitForFunction(
    async () => ((await window.__src('saved-routes'))?.features?.length ?? 0) > 0,
    null,
    { timeout: 30000 },
  );
}

/** An editor's page on the stand-in (shared with the other editor's), with the map loaded. */
async function editor(id, email, shared) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/Failed to load resource/.test(msg.text()))
      errors.push(msg.text().slice(0, 160));
  });
  await bareStyle(page);
  await signInAsEditor(page, { id, email });
  const db = await fakeStudioDb(page, seed, shared);
  await load(page);
  return { page, db };
}

/** Taps the map at a [lng, lat], once the camera is on it. */
async function tapAt(page, ll, zoom) {
  await page.evaluate(([c, z]) => window.__map.jumpTo({ center: c, zoom: z }), [ll, zoom]);
  await page.waitForTimeout(500);
  const box = await page.locator('canvas.maplibregl-canvas').boundingBox();
  const [x, y] = await page.evaluate((c) => {
    const p = window.__map.project(c);
    return [p.x, p.y];
  }, ll);
  await page.mouse.click(box.x + x, box.y + y);
  await page.waitForTimeout(700);
}

/** Opens the route's trip card by tapping its line. */
async function openRoute(page) {
  await tapAt(page, MIDDLE, 15);
}

/**
 * Opens the route's trip card from the place at its end. A tap on the line
 * would not do once there is a draft: its dashed line lies on the route's and
 * takes the tap, which opens the review.
 */
async function openRouteFromPlace(page) {
  // Inside the place's box, clear of the line's end and the draft's marker.
  // The draft's marker may sit over the place: leave it out of the tap's way.
  await page.addStyleTag({ content: '.maplibregl-marker { pointer-events: none !important; }' });
  await tapAt(page, [LINE.at(-1)[0] + 0.0003, LINE.at(-1)[1] - 0.0002], 17);
  await page.getByTestId('card-item').first().click();
  await page.waitForTimeout(700);
}

const body = async (page) => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
const writesOf = (db) => db.log.filter((r) => r.method !== 'GET' && r.method !== 'HEAD');

/** Edit route → Done → Update: the editor's own save, which becomes a draft. */
async function editAndSave(page) {
  await page.getByRole('button', { name: 'Edit route' }).click();
  await page.waitForFunction(() => /\d+ points?\b/.test(document.body.innerText));
  await page
    .waitForFunction(() => !document.body.innerText.includes('snapping…'), null, { timeout: 15000 })
    .catch(() => {});
  await page.getByRole('button', { name: /Done/ }).click();
  await page.getByRole('button', { name: /^(Save|Update)$/ }).click();
  await page.getByText('Saved as a draft').waitFor({ timeout: 10000 });
}

// ---- A starts a draft on the route.
const a = await editor(A_ID, 'a@example.com', null);
const db = a.db;
await openRoute(a.page);
check(
  'A, with no draft on the route, is offered Edit route',
  (await a.page.getByRole('button', { name: 'Edit route' }).count()) === 1,
);
await editAndSave(a.page);
check(
  "A's save is a draft under A's id, and the approved route is untouched",
  db.tables.draft.length === 1 &&
    db.tables.draft[0].editor_id === A_ID &&
    db.tables.draft[0].subject_id === ROUTE_ID &&
    db.tables.route_variant.find((v) => v.id === OUT_ID)?.updated_at === NOW,
  JSON.stringify(db.tables.draft.map((d) => [d.kind, d.editor_id])),
);

// ---- B opens the same route: looks, cannot change.
const b = await editor(B_ID, 'b@example.com', db);
const writesBefore = writesOf(db).length;
await openRouteFromPlace(b.page);
await b.page.getByText('Being changed by Marisol').waitFor({ timeout: 10000 });
check(
  "B is told the route is being changed by A's name",
  (await body(b.page)).includes('Being changed by Marisol. You can look at it, but not change it.'),
);
check(
  '  and is offered no Edit, Extend, Delete or signboard control',
  (await b.page.getByRole('button', { name: /^(Edit route|Extend|Delete)/ }).count()) === 0 &&
    (await b.page.getByTestId('signboard-editor').count()) === 0,
);
check(
  '  no user id or email shows',
  !(await body(b.page)).includes(A_ID) && !(await body(b.page)).includes('a@example.com'),
);
check('  and B has sent no write', writesOf(db).length === writesBefore);

// B's Drafts list says it too, and marks the draft a Draft.
await b.page.getByRole('button', { name: /^Drafts \(\d+\)$/ }).click();
const item = b.page.getByRole('listitem').filter({ hasText: 'Discard…' });
await item.first().waitFor();
check(
  "B's Drafts list marks it Draft and says who is changing it",
  (await item.first().innerText()).includes('route · Draft') &&
    (await item.first().innerText()).includes('Being changed by Marisol'),
);

// B can review that draft, but not edit its details or resolve its conflict.
await item.first().getByRole('button', { name: 'Review changes' }).click();
await b.page.getByText('Being changed by Marisol').waitFor();
await b.page.getByRole('button', { name: 'Approve', exact: true }).waitFor({ timeout: 10000 });
check(
  "B, reviewing A's draft, is offered Approve but not its details form",
  (await b.page.getByRole('button', { name: 'Save draft details' }).count()) === 0 &&
    (await b.page.getByRole('heading', { name: 'Edit draft details' }).count()) === 0,
  (await body(b.page)).slice(0, 700),
);
await b.page.getByRole('button', { name: 'Back to drafts' }).click();
await b.page.locator('dialog').getByRole('button', { name: 'Close', exact: true }).click();

// ---- No name on file: plain words.
db.tables.editor_name = db.tables.editor_name.filter((r) => r.user_id !== A_ID);
await load(b.page);
await openRouteFromPlace(b.page);
await b.page.getByText('Being changed by another editor').waitFor({ timeout: 10000 });
check(
  'with no name on file for A, B is told "another editor", and no id shows',
  !(await body(b.page)).includes(A_ID),
);

// ---- A discards; B can claim the route.
await a.page.getByRole('button', { name: /^Drafts \(\d+\)$/ }).click();
const own = a.page.getByRole('listitem').filter({ hasText: 'Discard…' });
await own.first().waitFor();
check(
  "A's own Drafts list marks it Draft and does not say another editor is changing it",
  (await own.first().innerText()).includes('route · Draft') &&
    !(await own.first().innerText()).includes('Being changed by'),
);
await own.first().getByRole('button', { name: 'Discard…' }).click();
await a.page.getByRole('button', { name: 'Discard draft', exact: true }).click();
await a.page.getByRole('status').filter({ hasText: 'Draft discarded' }).waitFor();
check('A discards: no draft is left', db.tables.draft.length === 0);

await load(b.page);
await openRouteFromPlace(b.page);
await b.page.getByRole('button', { name: 'Edit route' }).waitFor({ timeout: 10000 });
check(
  'B, now that the draft is gone, is offered Edit route and no notice',
  !(await body(b.page)).includes('Being changed by'),
);
await editAndSave(b.page);
check(
  "B's save is a draft under B's id",
  db.tables.draft.length === 1 && db.tables.draft[0].editor_id === B_ID,
  JSON.stringify(db.tables.draft.map((d) => d.editor_id)),
);

// ---- A card opened before A's draft cannot save over it.
db.tables.draft = [];
await load(b.page);
await openRouteFromPlace(b.page);
await b.page.getByRole('button', { name: 'Edit route' }).waitFor();
await b.page.getByRole('button', { name: 'Edit route' }).click();
await b.page.waitForFunction(() => /\d+ points?/.test(document.body.innerText));
db.tables.editor_name = [{ user_id: A_ID, name: 'Marisol' }];
db.tables.draft.push({
  id: 'eeeeeeee-0000-4000-8000-0000000000aa',
  kind: 'route',
  subject_id: ROUTE_ID,
  is_new: false,
  base_revision: 1,
  revision: 1,
  status: 'draft',
  payload: { version: 1 },
  note: null,
  editor_id: A_ID,
  created_at: NOW,
  updated_at: NOW,
  submitted_at: null,
});
const staleWrites = writesOf(db).length;
await b.page.getByRole('button', { name: /Done/ }).click();
await b.page.getByRole('button', { name: /^(Save|Update)$/ }).click();
await b.page.getByText('This is being changed by Marisol').waitFor({ timeout: 10000 });
check(
  "B's save from a card opened before A's draft is refused, and nothing is written",
  writesOf(db).length === staleWrites &&
    db.tables.draft.length === 1 &&
    db.tables.draft[0].revision === 1,
);
const direct = await b.page
  .evaluate(
    async ([url]) => {
      const r = await fetch(url, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.endsWith('-auth-token')))).access_token}`,
          prefer: 'return=representation',
        },
        body: JSON.stringify({ note: 'overwritten' }),
      });
      return r.json();
    },
    [`${new URL(b.page.url()).origin}/rest/v1/draft?id=eq.eeeeeeee-0000-4000-8000-0000000000aa`],
  )
  .catch(() => null);
check(
  "a direct update of A's draft by B changes nothing (draft_update)",
  db.tables.draft[0].note === null &&
    (direct === null || (Array.isArray(direct) && direct.length === 0)),
);

// ---- A hotspot's draft is held the same way.
db.tables.draft = [];
db.tables.editor_name = [{ user_id: A_ID, name: 'Marisol' }];
db.tables.draft.push({
  id: 'eeeeeeee-0000-4000-8000-00000000000f',
  kind: 'hotspot',
  subject_id: T2,
  is_new: false,
  base_revision: 1,
  revision: 1,
  status: 'draft',
  payload: { version: 1, stop: { name: 'Fairview' }, links: [] },
  note: null,
  editor_id: A_ID,
  created_at: NOW,
  updated_at: NOW,
  submitted_at: null,
});
// The refused save left B's line on B's device, as any unsaved drawing is; drop it.
await b.page.addInitScript(() => localStorage.removeItem('parapo.draft.v1'));
await load(b.page);
await tapAt(b.page, [LINE.at(-1)[0] + 0.0003, LINE.at(-1)[1] - 0.0002], 17);
await b.page.getByText('Being changed by Marisol').waitFor({ timeout: 10000 });
check(
  "B is told a hotspot is being changed by A's name, with no Edit terminal or Delete",
  (await b.page.getByRole('button', { name: /^(Edit terminal|Edit hintuan|Delete)/ }).count()) ===
    0,
);

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
tally();
