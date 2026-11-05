// The studio's save flows, signed in, against a stand-in for the database
// (lib/save-studio.mjs): an ikot, and the refusals and failures around a
// route. One of three parts, each a CI job of its own; save-test and
// save-edit-test are the others. It starts from two hintuans and a route
// between them drawn both ways, made as save-test makes them.
//
//   npm run dev                          (in another terminal)
//   node tests/e2e/save-ikot-test.mjs    # against http://localhost:5173
//
// Every save is a draft, approved by the stand-in (approveAll) before the
// next step, as an editor's Approve would.
//
// What it checks, each against the finding it guards (the review's numbers):
// an ikot (0021) closed on its own first point, saved with no ends and one
// direction, its signboard asked for and kept unique, its card, its edit and
// its delete, and a terminal on it linked by itself; a route's end refused a
// delete in words (15); undo to no points leaving no drawing (12); a save
// whose draft is refused, said in words, and Save again storing one draft
// under the same new route (13); no React warnings.
import { waitFor } from './lib/harness.mjs';
import {
  approveAll,
  approvedWrites,
  at,
  body,
  check,
  clickAt,
  closeLoop,
  directionsOf,
  dismissToasts,
  done,
  draftOf,
  drafted,
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
  px,
  P2,
  page,
  pointsShown,
  publishedRoutes,
  R,
  remove,
  said,
  saveButton,
  stub,
  tables,
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
  // Closed by the first point itself: the connect badge shows as the cursor nears it.
  const hint = page.getByTestId('connect-hint');
  const [fx, fy] = await px(IKOT[0]);
  await page.mouse.move(fx + 60, fy + 60, { steps: 3 });
  const hintAway = await hint.count();
  await page.mouse.move(fx + 6, fy + 6, { steps: 3 });
  await page.waitForTimeout(150);
  check(
    '  nearing the first point shows the connect badge, away from it none',
    hintAway === 0 && (await hint.isVisible()),
    `away ${hintAway}, near ${await hint.count()}`,
  );
  await page.mouse.click(fx + 6, fy + 6);
  await idle();
  await page.waitForTimeout(400);
  drawn = await drawnPoints();
  check(
    '  a click there ends the line on the first point (<1 m), the badge gone, and then rests',
    (await hint.count()) === 0 &&
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
    '  its places are listed from the first drawn, the Ikot name asked for',
    (await page.getByTestId('save-timeline').innerText()).includes('Stand-in Head') &&
      (await page.getByTestId('save-timeline').innerText()).includes('Stand-in Tail') &&
      (await page.getByLabel('Ikot name').getAttribute('aria-required')) === 'true',
    (await page.getByTestId('save-timeline').innerText()).replace(/\s+/g, ' '),
  );
  n = log.length;
  await saveButton().click();
  await page.waitForTimeout(400);
  check(
    'saving without an Ikot name is refused in words, and writes nothing',
    /An ikot is called by its Ikot name/.test(await body()) && writesSince(n).length === 0,
    said(writesSince(n)),
  );
  await page.getByLabel('Ikot name').fill('UP – Ikot');
  await saveButton().click();
  await drafted();
  w = writesSince(n);
  const ikotDraft = tables.draft.find((d) => d.kind === 'route' && d.payload.route.is_loop);
  const draftV = ikotDraft?.payload.directions ?? [];
  check(
    'an ikot is one draft of a route with is_loop and no ends, and one direction: no slot',
    !!ikotDraft &&
      ikotDraft.payload.route.head_stop_id === null &&
      ikotDraft.payload.route.tail_stop_id === null &&
      ikotDraft.payload.route.signboard === 'UP – Ikot' &&
      draftV.length === 1 &&
      draftV[0].reversed === false &&
      !!draftV[0].shape &&
      approvedWrites(w).length === 0,
    said(w),
  );
  check(
    '  its line is linked to the two hintuans it goes round',
    ['Stand-in Head', 'Stand-in Tail'].every((nm) =>
      draftV[0]?.links.some((l) => l.stop_id === tables.stop.find((x) => x.name === nm)?.id),
    ),
    JSON.stringify(draftV[0]?.links),
  );
  await approveAll();
  const [ikot] = drawnIkots();
  const ikotV = ikot && directionsOf(ikot.id);
  check(
    '  approved, it is one route row with is_loop and no ends, and one direction row',
    !!ikot &&
      ikot.id === ikotDraft?.subject_id &&
      ikot.is_loop === true &&
      ikot.head_stop_id === null &&
      ikot.tail_stop_id === null &&
      ikotV.length === 1 &&
      !!ikotV[0].shape,
  );

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
  await page.getByLabel('Ikot name').fill('  up – IKOT ');
  n = log.length;
  await saveButton().click();
  await page.waitForTimeout(400);
  check(
    'a second ikot with the same signboard is refused in words, to the fold, and writes nothing',
    /Another ikot already has this signboard/.test(await body()) && writesSince(n).length === 0,
    said(writesSince(n)),
  );
  check(
    '  a via tells them apart: the refusal goes, and approved it is a second ikot',
    await (async () => {
      await page.getByLabel(/^Via/).fill('Katipunan');
      await saveButton().click();
      await drafted();
      await approveAll();
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
  await drafted();
  w = writesSince(n);
  const editDraft = draftOf('route', ikot?.id);
  check(
    '  the update keeps it an ikot with no ends, and rewrites its one line',
    editDraft?.is_new === false &&
      editDraft.payload.route.is_loop === true &&
      editDraft.payload.route.head_stop_id === null &&
      editDraft.payload.route.tail_stop_id === null &&
      editDraft.payload.directions.length === 1 &&
      editDraft.payload.directions[0].id === ikotV?.[0]?.id &&
      approvedWrites(w).length === 0,
    said(w),
  );
  await approveAll();

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
  await page.getByRole('button', { name: 'Save as draft', exact: true }).click();
  await waitFor(
    async () =>
      (await page.getByRole('button', { name: 'Save as draft', exact: true }).count()) === 0,
  );
  await drafted();
  const terminalDraft = tables.draft.find(
    (d) => d.kind === 'hotspot' && d.payload.stop.name === 'Stand-in Ikot Terminal',
  );
  check(
    "  saved, the terminal's draft links it to the ikot's line, though nobody ticked it",
    !!terminalDraft &&
      terminalDraft.payload.links.some((l) => l.route_variant_id === ikotV?.[0]?.id) &&
      approvedWrites(writesSince(n)).length === 0,
    said(writesSince(n)),
  );
  await approveAll();
  const ikotTerminal = tables.stop.find((x) => x.name === 'Stand-in Ikot Terminal');
  check(
    '  approved, the link is on the map',
    !!ikotTerminal &&
      tables.route_stop.some(
        (l) => l.route_variant_id === ikotV?.[0]?.id && l.stop_id === ikotTerminal.id,
      ),
  );

  // Delete: the confirm names the ikot, and emptying its only direction removes the route.
  await openCard(IKOT[1]);
  // The card reads the line before it opens, as D's trip card does: wait for it.
  await waitFor(async () => (await page.getByRole('button', { name: 'Delete' }).count()) > 0);
  n = log.length;
  await page.getByRole('button', { name: 'Delete' }).click();
  // Done when the studio says so: the delete's draft is stored and approved in
  // the same press, and only then does the card close. On a slow runner that
  // takes more than a few seconds, so the wait is for that state, not for a
  // fixed time.
  const isTakenDown = () =>
    tables.route.some((r) => r.id === ikot?.id && r.status === 'taken_down');
  await waitFor(
    async () =>
      isTakenDown() && (await page.getByRole('button', { name: 'Edit route' }).count()) === 0,
    30000,
  );
  check(
    'Delete on an ikot asks about the ikot, and takes the route down with its only direction emptied',
    dialogs.some((d) => d === 'Delete the ikot "UP – Ikot"?') &&
      isTakenDown() &&
      directionsOf(ikot?.id).every((v) => v.shape === null) &&
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
check('  and nothing is sent to the database', writesSince(n).length === 0, said(writesSince(n)));
await dismissToasts();
await page.keyboard.press('Escape');

// ---- 8. Undo to no points leaves no draft
await go(at(0, 0), 15);
await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
await page.getByRole('menuitem', { name: /Routes/ }).click();
await clickAt(OUT[0], 300);
await clickAt(OUT[1], 300);
await idle();
const isStored = (await page.evaluate(() => localStorage.getItem('para.draft.v1'))) !== null;
await page.keyboard.press('Control+z');
await page.keyboard.press('Control+z');
await page.waitForTimeout(400);
check(
  'undo down to no points leaves no draft to come back on reload (12)',
  isStored && (await page.evaluate(() => localStorage.getItem('para.draft.v1'))) === null,
);
await page.getByTitle('Discard this route').click();
await page.waitForTimeout(300);

// ---- 9. A save whose draft is refused, and the retry
await drawLine(VIA);
await page.getByLabel('Via (if applicable)').fill('Stand-in Road');
stub.fault = (method, table) => method === 'POST' && table === 'rpc/claim_draft';
n = log.length;
await saveButton().click();
await waitFor(async () => /refused this one, on purpose/.test(await body()));
w = writesSince(n);
const firstClaim = w.find((x) => x.table === 'rpc/claim_draft');
check(
  'a save whose draft is refused says so in words, and stores nothing (13)',
  /refused this one, on purpose/.test(await body()) &&
    !tables.draft.some((d) => d.payload.route?.via === 'Stand-in Road') &&
    approvedWrites(w).length === 0,
  (await body()).slice(-200),
);
n = log.length;
await saveButton().click();
await drafted();
w = writesSince(n);
const viaDrafts = tables.draft.filter((d) => d.payload.route?.via === 'Stand-in Road');
check(
  '  Save again stores one draft, under the same new route id as the first try (13)',
  viaDrafts.length === 1 && viaDrafts[0].subject_id === firstClaim?.body.p_subject_id,
  said(w),
);
await approveAll();
const viaRoute = tables.route.find((r) => r.via === 'Stand-in Road');
check(
  '  approved, one route for these ends and that via, drawn with its slot',
  tables.route.filter((r) => r.via === 'Stand-in Road').length === 1 &&
    !!viaRoute &&
    directionsOf(viaRoute.id).length === 2,
);

await finish('save-ikot-test.png');
