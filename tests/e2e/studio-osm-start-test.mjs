// "Start from OSM route" in the studio (.scratch/osm-route-start/plan.md), signed in, against the
// save suites' stand-in for the database (lib/save-studio.mjs): the + menu's "Route from OSM", the
// picker's search, the route's card, a drawing seeded from the route's line with its one gap to
// check, the drawing kept over a reload, and its save a draft that publishes nothing; then, once
// approved, "+ Add route" → "Start from an OSM route" filling the route's empty slot, the toast
// saying the line runs the same way as the drawn one. The OSM route
// files are the suite's own: one route from Philcoa to UP - Ikot, two published hotspots, with an
// 82 m gap in it. The router has no roads here (save-studio answers every request with no route),
// so the line between the seeded points is drawn straight; the seeding, the gap and the save do
// not depend on the streets.
//
//   node tests/e2e/studio-osm-start-test.mjs     against http://localhost:5173
import { BASE } from './lib/harness.mjs';
import {
  approveAll,
  check,
  clickAt,
  directionsOf,
  done,
  draftOf,
  go,
  drafted,
  finish,
  log,
  page,
  pointsShown,
  saveButton,
  tables,
  writesSince,
} from './lib/save-studio.mjs';

const PHILCOA = [121.053065, 14.654165];
const IKOT = [121.06234, 14.657689];
const LINE = [
  PHILCOA,
  [121.056, 14.6552],
  [121.0585, 14.6561],
  [121.0592, 14.6564],
  [121.061, 14.6571],
  IKOT,
];
/** seedPoints (src/features/studio/osm-routes/seed-points.ts) keeps 5 of LINE's 6: the 2-point run east of the gap is thinned. */
const SEEDED = 5;
const ID = 999001;

const header = {
  schema: 1,
  license: 'ODbL-1.0',
  attribution: '© OpenStreetMap contributors',
  extract_at: '2026-11-23T21:21:17Z',
};
const INDEX = {
  ...header,
  routes: [
    [
      ID,
      'jeepney',
      'T999',
      'Philcoa → UP Ikot (test)',
      'Philcoa',
      'UP - Ikot',
      'LTFRB National Capital Region',
      4,
      '2026-07-30',
      1,
      2,
      [PHILCOA, IKOT],
    ],
  ],
};
const ROUTE = {
  ...header,
  id: ID,
  kind: 'jeepney',
  ref: 'T999',
  name: 'Philcoa → UP Ikot (test)',
  from: 'Philcoa',
  to: 'UP - Ikot',
  network: 'LTFRB National Capital Region',
  operator: '',
  version: 4,
  last_edit: '2026-07-30',
  clipped: false,
  provenance: { 'source:ref': 'LTFRB Memorandum Circular 2022-067' },
  gaps: [[2, 82]],
  stops: [
    ['stop', ...PHILCOA, 'Philcoa'],
    ['stop_exit_only', ...IKOT, 'UP - Ikot'],
  ],
  line: LINE,
};

const asked = [];
await page.route(/\/data\/osm-routes\/v1\//, (route) => {
  const name = new URL(route.request().url()).pathname.split('/').pop();
  asked.push(name);
  const body = name === 'index.json' ? INDEX : name === `r${ID}.json` ? ROUTE : null;
  return body
    ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    : route.fulfill({ status: 404, body: '' });
});

// ---- 1. The picker
await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
await page.getByRole('menuitem', { name: /Route from OSM/ }).click();
const picker = page.getByRole('region', { name: 'Start from an OSM route' });
await picker.waitFor();
check(
  '"Route from OSM" opens the picker, marked as a placeholder',
  await picker.getByText('Placeholder look').isVisible(),
);
check(
  '  the picker reads the index once it opens, not before',
  asked.filter((n) => n === 'index.json').length === 1,
);
await picker.getByLabel('Ref, name or relation id').fill('T999');
const result = picker.getByRole('list', { name: 'OSM routes' }).getByRole('button');
await result.first().waitFor();
check(
  '  the ref finds the route, with its kind and its gap',
  (await result.count()) === 1 && /Jeepney · T999 · 1 gaps/.test(await result.first().innerText()),
);
await picker.getByLabel('Ref, name or relation id').fill(`r${ID}`);
check('  so does its relation id', (await result.count()) === 1);

// ---- 2. The card
await result.first().click();
await picker.getByRole('button', { name: 'Start drawing' }).waitFor();
const card = await picker.innerText();
check('the card reads the route’s own file', asked.includes(`r${ID}.json`));
check(
  '  and says where it comes from: relation, version, the mapper’s source tag, the credit',
  [
    `Relation ${ID}`,
    'version 4',
    'source:ref: LTFRB Memorandum Circular 2022-067',
    '© OpenStreetMap contributors, ODbL',
  ].every((text) => card.includes(text)),
  card.replace(/\s+/g, ' ').slice(0, 200),
);
check(
  '  its history is linked on OpenStreetMap',
  (await picker.getByRole('link', { name: `Relation ${ID}` }).getAttribute('href')) ===
    `https://www.openstreetmap.org/relation/${ID}/history`,
);

// ---- 3. The drawing
const beforeDrawing = log.length;
await picker.getByRole('button', { name: 'Start drawing' }).click();
const hint = page.getByRole('region', { name: 'From an OSM route' });
await hint.waitFor();
check(
  'Start drawing closes the picker and begins a drawing',
  !(await picker.isVisible()) && (await page.getByRole('button', { name: 'Snap' }).count()) > 0,
);
await page.waitForTimeout(800);
check(
  `  seeded with ${SEEDED} control points from the route’s line`,
  (await pointsShown()) === SEEDED,
  `${await pointsShown()} points`,
);
check(
  '  the hint lists one place to check: the gap the router bridged',
  (await hint.innerText()).includes('1 place to check') &&
    (await hint.innerText()).includes('A 82 m gap in OSM’s line'),
);
check('  and a dot marks it on the map', (await page.getByTestId('osm-check-spot').count()) === 1);
check(
  '  nothing is written while drawing',
  writesSince(beforeDrawing).length === 0,
  writesSince(beforeDrawing)
    .map((w) => `${w.method} ${w.table}`)
    .join(', '),
);

// ---- 4. A reload keeps the drawing (draft.ts), as any drawing is kept
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => window.__map && window.__map.loaded(), null, { timeout: 30000 });
await page.waitForTimeout(1500);
check(
  'a reload keeps the drawing, its points as they were',
  (await pointsShown()) === SEEDED,
  `${await pointsShown()} points`,
);

// ---- 5. The save is a draft, and publishes nothing
await done();
check(
  'Done opens the save panel, its ends at Philcoa and UP - Ikot',
  (await page.getByTestId('save-head').inputValue()) !== '' &&
    (await page.getByTestId('save-tail').inputValue()) !== '',
);
const before = log.length;
const routesBefore = tables.route.length;
await saveButton().click();
await drafted();
const writes = writesSince(before);
const draft = tables.draft.find((d) => d.kind === 'route' && d.is_new === true);
check(
  'the save writes a new route draft',
  !!draft,
  writes.map((w) => `${w.method} ${w.table}`).join(', '),
);
check(
  '  and nothing published: no route row, no publish call',
  tables.route.length === routesBefore && !writes.some((w) => /publish/.test(w.table)),
);

// ---- 6. The public page never asks for the OSM route files
const publicPage = await page.context().newPage();
const publicAsked = [];
publicPage.on('request', (request) => {
  if (request.url().includes('/data/osm-routes/')) publicAsked.push(request.url());
});
await publicPage.goto(`${BASE}/`, { waitUntil: 'load' });
await publicPage.waitForTimeout(3000);
check(
  'the public page never asks for an OSM route file',
  publicAsked.length === 0,
  publicAsked.join(', '),
);
await publicPage.close();

// ---- 7. "+ Add route" fills the route's empty slot from an OSM route
await approveAll();
const osmRoute = tables.route.find((r) => r.id === draft?.subject_id);
const slotId = directionsOf(osmRoute?.id).find((v) => v.shape === null)?.id;
check(
  'approved, the OSM route is one route and two directions, one of them an empty slot',
  !!slotId && directionsOf(osmRoute?.id).length === 2,
);
await go(LINE[1], 16);
await clickAt([(LINE[1][0] + LINE[2][0]) / 2, (LINE[1][1] + LINE[2][1]) / 2], 700);
const detail = page.getByTestId('route-line-detail');
await detail.waitFor();
await detail.getByRole('button', { name: '+ Add route' }).click();
await page.getByRole('menuitem', { name: 'Start from an OSM route' }).click();
await picker.waitFor();
check(
  '"+ Add route" → "Start from an OSM route" opens the same picker, the detail closed',
  (await picker.isVisible()) && !(await detail.isVisible()),
);
await picker.getByLabel('Ref, name or relation id').fill('T999');
await result.first().click();
await picker.getByRole('button', { name: 'Start drawing' }).click();
await hint.waitFor();
await page.waitForTimeout(800);
check(
  '  Start drawing seeds the slot from the route’s line, the other way faint underneath',
  (await pointsShown()) === SEEDED &&
    (await page.evaluate(() => window.__src('draw-outbound')))?.features.length === 3,
  `${await pointsShown()} points`,
);
const toast = (await page.getByTestId('toast').allInnerTexts()).join(' ');
check(
  '  the line runs the same way as the drawn one: the toast says so, nothing reversed',
  /This line runs the same way as (.+?), and the empty slot is for the other way\./.test(toast),
  toast,
);
await done();
const slotWrites = log.length;
await saveButton().click();
await drafted();
const slotDraft = draftOf('route', osmRoute?.id);
const slotDirections = slotDraft?.payload.directions ?? [];
check(
  '  saved, it is a draft of the same route that fills the slot: no new route, both ways drawn',
  slotDraft?.is_new === false &&
    slotDirections.length === 2 &&
    slotDirections.every((v) => v.shape) &&
    slotDirections.some((v) => v.id === slotId && v.reversed === true),
  writesSince(slotWrites)
    .map((w) => `${w.method} ${w.table}`)
    .join(', '),
);

await finish('studio-osm-start-test.png');
