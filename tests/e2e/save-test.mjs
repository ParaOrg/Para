// The studio's save flows, signed in, against a stand-in for the database
// (lib/save-studio.mjs): a route's life, from two hintuans and its first save
// to its delete and its redraw. One of three parts, each a CI job of its own;
// save-ikot-test and save-edit-test are the others.
//
//   npm run dev                          (in another terminal)
//   node tests/e2e/save-test.mjs         # against http://localhost:5173
//
// The other suites run signed out, so until 2026-09-29 nothing in
// routes-write.ts or hotspots-write.ts ran under a check (docs/archive/review-2026-09-29.md,
// section 4). The stand-in grew from the one the review drove them with
// (tests/unit/fixtures/fake-supabase.mjs).
//
// What it checks, each against the finding it guards (the review's numbers):
// the pill counts routes (7) and the stop table is read once a load (6); a
// hotspot saved with its links, and the directions read again after it (8);
// the map switch — Contributors, Playground and Public, the address, a
// half-drawn line, the camera and the basemap kept, the keys and clicks dead
// on the other maps; a route saved with its slot, the return trip offered
// while the slot is empty and written into it (2); the return trip closing
// the loop: it begins on the outbound's end, the outbound shows faintly under
// it, Close the loop ends it on the outbound's start, and the save panel says
// how far an open loop falls short; every request line short with 500
// hintuans (4); an edit that writes one row and offers no return trip (2),
// and the camera with the cards, the public map's in the studio too (the
// owner, 2026-09-30); a direction's signboards; the route exported both ways;
// a delete that empties the direction into a slot and a redraw that fills it
// again (3), a refused step of it said (16); no React warnings.
import { readFileSync } from 'node:fs';

import { waitFor } from './lib/harness.mjs';
import {
  at,
  BACK,
  body,
  box,
  bucket,
  check,
  clickAt,
  closeLoop,
  directionsOf,
  dismissToasts,
  done,
  drawLine,
  drawnPoints,
  finish,
  go,
  hintuan,
  holdAnswers,
  idle,
  log,
  metresBetween,
  openCard,
  OUT,
  P1,
  P2,
  page,
  pointsShown,
  returnTrip,
  said,
  saveButton,
  since,
  stub,
  tables,
  toast,
  URL_LIMIT,
  writesSince,
} from './lib/save-studio.mjs';

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
  const basemapAtOpen = await basemapPicked();
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
  const draftBefore = await page.evaluate(() => localStorage.getItem('para.draft.v1'));
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
    (await page.evaluate(() => localStorage.getItem('para.draft.v1'))) === draftBefore &&
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
      (await page.evaluate(() => localStorage.getItem('para.draft.v1'))) === draftBefore &&
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
    (await page.evaluate(() => localStorage.getItem('para.draft.v1'))) === null,
  );

  // Back to the basemap it opened on for the rest of the run. Terrain's 3D ground costs a
  // headless browser's software rendering about a second a frame, so every map update after
  // it stalls the page, and on a slower runner the signboard and delete steps below would miss
  // their waits.
  await page.getByRole('button', { name: 'Map design' }).click();
  const menu = page.getByTestId('basemap-menu');
  await menu.getByRole('button', { name: basemapAtOpen, exact: true }).click();
  await menu.getByRole('button', { name: 'Close' }).click();
  await page.waitForTimeout(300);
  const basemapAfter = await basemapPicked();
  check(
    '  then the basemap it opened on again, flat, for the steps after',
    basemapAfter === basemapAtOpen &&
      basemapAtOpen !== 'Terrain' &&
      (await page.evaluate(() => !window.__map.getTerrain())),
    `${basemapAtOpen} → ${basemapAfter}`,
  );
}

// ---- 3. A route between them, saved with its slot
await drawLine(OUT, async () =>
  check(
    'a new route has no "Close the loop" before its first point, and no outbound under it',
    (await page.getByTestId('close-loop').count()) === 0 &&
      (await page.evaluate(() => window.__src('draw-outbound')))?.features.length === 0,
  ),
);
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
  (await page.evaluate(() => localStorage.getItem('para.draft.v1'))) === null,
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

// The race the step above met on slower runners, made certain: removing the
// last two boards reads the directions twice, and the first read, which
// still lists a board, answers after the second. A late answer must never
// bring a removed board back to the card or the editor.
await upload(
  'third.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 98 40"><rect width="98" height="40" fill="#333"/></svg>',
);
await waitFor(async () => (await items().count()) === 1);
await upload(
  'fourth.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 98 40"><rect width="98" height="40" fill="#444"/></svg>',
);
await waitFor(
  async () =>
    (await items().count()) === 2 && (await page.getByTestId('trip-signboard').count()) === 2,
);
let isListHeld = false;
const releaseList = holdAnswers((method, table, u) => {
  const isListRead =
    method === 'GET' &&
    table === 'route_variant' &&
    (u.searchParams.get('select') ?? '').startsWith('id,route_id,direction_name');
  if (isListHeld || !isListRead) return false;
  isListHeld = true;
  return true;
});
await page.getByRole('button', { name: 'Remove signboard 1' }).click();
await waitFor(async () => isListHeld && (await items().count()) === 1);
await page.getByRole('button', { name: 'Remove signboard 1' }).click();
await waitFor(
  async () =>
    (await items().count()) === 0 && (await page.getByTestId('trip-signboards').count()) === 0,
);
// The held read is the only list read still out: wait for its answer to be
// delivered, then for the page to have taken it in.
const lateAnswer = page.waitForResponse(
  (r) =>
    r.request().method() === 'GET' &&
    /\/rest\/v1\/route_variant\?select=id,route_id,direction_name/.test(
      decodeURIComponent(r.url()),
    ),
);
releaseList();
await lateAnswer;
// Watched for 5 s after: a board shown again at any moment is the race lost.
const shownAgain = async () =>
  (await items().count()) + (await page.getByTestId('trip-signboards').count());
const isBroughtBack = await waitFor(async () => (await shownAgain()) > 0, 5000);
check(
  '  a list read that answers late, after the last is gone, never brings a board back',
  isListHeld && !isBroughtBack && outRow()?.signboards?.length === 0,
  `held: ${isListHeld}; ${JSON.stringify(outRow()?.signboards)}; ${await items().count()} in the editor; ${await page.getByTestId('trip-signboards').count()} row(s) on the card`,
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
const csvRows = csv.text
  .replace(/^\uFEFF/, '')
  .trimEnd()
  .split('\r\n');
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
stub.fault = (method, table) => method === 'HEAD' && table === 'route_variant';
await page.getByRole('button', { name: 'Delete' }).click();
await waitFor(async () => /refused this one, on purpose/.test(await body()));
check(
  'a refused step of the delete is said, not swallowed (16)',
  stub.fault === null && /refused this one, on purpose/.test(await body()),
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

await finish('save-test.png');
