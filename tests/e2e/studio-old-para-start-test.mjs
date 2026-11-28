// "Start from an old Para route" in the studio (.scratch/old-para-routes/spec.md), signed in,
// against the save suites' stand-in for the database (lib/save-studio.mjs): the + menu's "Route
// from old Para", the picker's search by Para ID and by name, a route with a line seeded as the
// OSM start seeds one (its one gap to check), its save a draft that publishes nothing, then a
// route with no line, its start placed and its end marked. The old Para route files are the
// suite's own: one route from Philcoa to UP - Ikot with an 82 m gap, and one with no line. The
// router has no roads here, so the line between the seeded points is drawn straight.
//
//   node tests/e2e/studio-old-para-start-test.mjs     against http://localhost:5173
import { BASE } from './lib/harness.mjs';
import {
  check,
  done,
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
/** seedPoints (src/features/studio/osm-routes/seed-points.ts) keeps 5 of LINE's 6, as for OSM's. */
const SEEDED = 5;
const NAME = 'Philcoa - UP Ikot (test)';

const header = { schema: 1, source: 'The suite’s own.', built_from: 'tests/e2e' };
const INDEX = {
  ...header,
  routes: [
    ['PARA-9001', 'jeepney', NAME, false, false, true, PHILCOA, IKOT, 1100, 1, [PHILCOA, IKOT]],
    [
      'PARA-9002',
      'bus',
      'Katipunan - Cubao (test)',
      true,
      false,
      false,
      IKOT,
      PHILCOA,
      null,
      0,
      null,
    ],
  ],
};
const ROUTE = {
  ...header,
  para_id: 'PARA-9001',
  old_id: '00000000-0000-4000-8000-000000009001',
  name: NAME,
  mode: 'jeepney',
  verified: false,
  loop: false,
  oneway: true,
  start: PHILCOA,
  end: IKOT,
  length_m: 1100,
  gaps: [[2, 82]],
  line: LINE,
};

const asked = [];
await page.route(/\/data\/old-para-routes\/v1\//, (route) => {
  const name = new URL(route.request().url()).pathname.split('/').pop();
  asked.push(name);
  const body = name === 'index.json' ? INDEX : name === 'para-9001.json' ? ROUTE : null;
  return body
    ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    : route.fulfill({ status: 404, body: '' });
});

const openPicker = async () => {
  await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
  await page.getByRole('menuitem', { name: /Route from old Para/ }).click();
  const picker = page.getByRole('region', { name: 'Start from an old Para route' });
  await picker.waitFor();
  return picker;
};

// ---- 1. The picker
const picker = await openPicker();
check(
  '"Route from old Para" opens the picker, marked as a placeholder, reading the index once',
  (await picker.getByText('Placeholder look').isVisible()) &&
    asked.filter((n) => n === 'index.json').length === 1,
);
const field = picker.getByLabel('Name, place or Para ID');
const result = picker.getByRole('list', { name: 'Old Para routes' }).getByRole('button');
await field.fill('para-9001');
await result.first().waitFor();
check(
  '  the Para ID finds the route, with its mode and whether it was verified',
  (await result.count()) === 1 &&
    (await result.first().innerText()).includes('Jeepney · PARA-9001 · Unverified'),
);
await field.fill('Katipunan');
check(
  '  a place in the name finds the route with no line, said so',
  (await result.count()) === 1 &&
    (await result.first().innerText()).includes('Bus · PARA-9002 · Verified · No line'),
);

// ---- 2. A route with a line: the card, then the drawing
await field.fill('Philcoa');
await result.first().click();
await picker.getByRole('button', { name: 'Start drawing' }).waitFor();
check('the card reads the route’s own file', asked.includes('para-9001.json'));
const beforeDrawing = log.length;
await picker.getByRole('button', { name: 'Start drawing' }).click();
const hint = page.getByRole('region', { name: 'From an old Para route' });
await hint.waitFor();
await page.waitForTimeout(800);
check(
  `Start drawing seeds ${SEEDED} control points from the route’s line`,
  (await pointsShown()) === SEEDED,
  `${await pointsShown()} points`,
);
check(
  '  the hint lists the gap the router bridged, a dot marks it, and nothing is written',
  (await hint.innerText()).includes('A 82 m gap in the old route’s line') &&
    (await page.getByTestId('osm-check-spot').count()) === 1 &&
    writesSince(beforeDrawing).length === 0,
);

// ---- 3. The save is a draft, and publishes nothing
await done();
const before = log.length;
const routesBefore = tables.route.length;
await saveButton().click();
await drafted();
const writes = writesSince(before);
check(
  'the save writes a new route draft and publishes nothing',
  tables.draft.some((d) => d.kind === 'route' && d.is_new === true) &&
    tables.route.length === routesBefore &&
    !writes.some((w) => /publish/.test(w.table)),
  writes.map((w) => `${w.method} ${w.table}`).join(', '),
);

// ---- 4. A route with no line: its start placed, its end marked
const again = await openPicker();
await again.getByLabel('Name, place or Para ID').fill('PARA-9002');
await again.getByRole('list', { name: 'Old Para routes' }).getByRole('button').first().click();
await again.getByRole('button', { name: 'Start drawing' }).click();
await hint.waitFor();
await page.waitForTimeout(500);
check(
  'a route with no line starts with its start as the one point, its end marked to draw to',
  (await pointsShown()) === 1 &&
    (await page.getByTestId('old-para-end').count()) === 1 &&
    (await hint.innerText()).includes('The old app has no line for it'),
  `${await pointsShown()} points`,
);
check('  and reads no route file for it', !asked.includes('para-9002.json'));

// ---- 5. The public page never asks for the old Para route files
const publicPage = await page.context().newPage();
const publicAsked = [];
publicPage.on('request', (request) => {
  if (request.url().includes('/data/old-para-routes/')) publicAsked.push(request.url());
});
await publicPage.goto(`${BASE}/`, { waitUntil: 'load' });
await publicPage.waitForTimeout(3000);
check(
  'the public page never asks for an old Para route file',
  publicAsked.length === 0,
  publicAsked.join(', '),
);
await publicPage.close();

await finish('studio-old-para-start-test.png');
