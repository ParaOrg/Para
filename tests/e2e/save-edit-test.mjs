// The studio's save flows, signed in, against a stand-in for the database
// (lib/save-studio.mjs): Edit route on a route's facts, the new-place form,
// signing in from Done, and the editor on a phone. One of three parts, each a
// CI job of its own; save-test and save-ikot-test are the others. It starts
// from two hintuans, a route between them drawn both ways, and a second route
// between them by Stand-in Road, made as the other two parts make them.
//
//   npm run dev                          (in another terminal)
//   node tests/e2e/save-edit-test.mjs    # against http://localhost:5173
//
// What it checks, each against the finding it guards (the review's numbers):
// Edit route changing a route's ends and facts, and refusing ends another
// route has and a head–tail swap; the switch in a band of its own and Escape
// leaving a card open under the other maps alone; a new head or tail made from
// the save panel's pickers (a 30 m box at the line's end, the hotspot panel's
// own write, the drawn line left alone; Enter on any field saving the place
// and not the route, one write however many Enters, none before the lines are
// read, a retry updating the box it wrote, a name already a place refused);
// the drawing keys alive after signing in from Done (9); a line back to its
// start; the save panel and the toast on a phone with a notch and a home bar;
// no React warnings (the duplicate key).
import { waitFor } from './lib/harness.mjs';
import {
  at,
  BACK,
  body,
  check,
  clickAt,
  directionsOf,
  dismissToasts,
  done,
  drawLine,
  drawTheRoute,
  finish,
  go,
  hintuan,
  holdRequests,
  idle,
  log,
  open,
  openCard,
  OUT,
  P1,
  P2,
  page,
  pointsShown,
  remove,
  said,
  saveButton,
  stub,
  tables,
  toast,
  VIA,
  writesSince,
} from './lib/save-studio.mjs';

// The ground: the two hintuans, the route between them drawn both ways, and a
// second route between them by Stand-in Road, as save-ikot-test's link sync
// leaves it once its retry is in.
const { outRoute, outV } = await drawTheRoute();
await drawLine(VIA);
await page.getByPlaceholder('Zabarte').fill('Stand-in Road');
await saveButton().click();
await waitFor(async () => (await toast().count()) > 0);
await dismissToasts();
let n;
let w;

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
  // One try (a jump, a tap and its 700 ms) takes up to 5 s on a slow page.
}, 30000);
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
  const draftOf = () => page.evaluate(() => localStorage.getItem('para.draft.v1'));
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
  await page.evaluate(() => localStorage.removeItem('para.draft.v1'));
}

// ---- 10d. The new-place form: what Enter does, one write, a retry, a name already taken
{
  const NEW = '+new-place';
  const draftOf = () => page.evaluate(() => localStorage.getItem('para.draft.v1'));
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
  stub.fault = (method, table) => method === 'DELETE' && table === 'route_stop';
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

await finish('save-edit-test.png');
