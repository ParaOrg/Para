// The studio's save flows, signed in, against a stand-in for the database
// (lib/save-studio.mjs): an ikot, and the refusals and failures around a
// route. One of three parts, each a CI job of its own; save-test and
// save-edit-test are the others. It starts from two hintuans and a route
// between them drawn both ways, made as save-test makes them.
//
//   npm run dev                          (in another terminal)
//   node tests/e2e/save-ikot-test.mjs    # against http://localhost:5173
//
// What it checks, each against the finding it guards (the review's numbers):
// an ikot (0021) closed on its own first point, saved with no ends and one
// direction, its signboard asked for and kept unique, its card, its edit and
// its delete, and a terminal on it linked by itself; a route's end refused a
// delete in words (15); undo to no points leaving no draft (12); a link sync
// that fails and a retry that updates rather than inserts (13); no React
// warnings.
import { waitFor } from './lib/harness.mjs';
import {
  at,
  body,
  check,
  clickAt,
  closeLoop,
  directionsOf,
  dismissToasts,
  done,
  drawLine,
  drawnPoints,
  drawTheRoute,
  finish,
  go,
  idle,
  log,
  metresBetween,
  openCard,
  OUT,
  P1,
  P2,
  page,
  pointsShown,
  publishedRoutes,
  R,
  remove,
  returnTrip,
  said,
  saveButton,
  stub,
  tables,
  toast,
  VIA,
  writesSince,
} from './lib/save-studio.mjs';

// The ground: the two hintuans and the route between them, drawn both ways.
await drawTheRoute();
let n;
let w;
let drawn;

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
  const drawnIkots = () => tables.route.filter((r) => r.is_loop && !publishedRoutes.has(r.id));
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
      (await page.getByLabel(/Signboard.*required/).count()) === 1,
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
  // Done when the studio says so: deleteDirection's five requests run one after
  // another (empty the line, unlink, unborrow, count, delete the route), and
  // only then does the card close. On a slow runner they take more than a few
  // seconds, so the wait is for that state, not for a fixed time.
  await waitFor(
    async () =>
      !tables.route.some((r) => r.id === ikot?.id) &&
      (await page.getByRole('button', { name: 'Edit route' }).count()) === 0,
    30000,
  );
  check(
    'Delete on an ikot asks about the ikot, and takes the route away with its only direction',
    dialogs.some((d) => d === 'Delete the ikot "UP – Ikot"?') &&
      !tables.route.some((r) => r.id === ikot?.id) &&
      directionsOf(ikot?.id).length === 0 &&
      !tables.route_stop.some((l) => l.route_variant_id === ikotV?.[0]?.id) &&
      // The card closes on a delete that went through; one that says it went
      // wrong leaves it open, though the rows are gone.
      !/Nothing was changed|error|refused/i.test(await body()),
    `${dialogs.at(-1)} · ${said(writesSince(n))} · ${(await body()).slice(-160)}`,
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
const drafted = (await page.evaluate(() => localStorage.getItem('para.draft.v1'))) !== null;
await page.keyboard.press('Control+z');
await page.keyboard.press('Control+z');
await page.waitForTimeout(400);
check(
  'undo down to no points leaves no draft to come back on reload (12)',
  drafted && (await page.evaluate(() => localStorage.getItem('para.draft.v1'))) === null,
);
await page.getByTitle('Discard this route').click();
await page.waitForTimeout(300);

// ---- 9. A link sync that fails, and the retry
await drawLine(VIA);
await page.getByPlaceholder('Zabarte').fill('Stand-in Road');
stub.fault = (method, table, u) =>
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

await finish('save-ikot-test.png');
