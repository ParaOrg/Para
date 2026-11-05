// The studio's save flows, signed in, against a stand-in for the database
// (lib/save-studio.mjs): a route's life, from two hintuans and its first save
// to its delete and its redraw. Every save is a draft, and the stand-in
// approves it (approveAll) before the next step, as an editor's Approve
// would. One of three parts, each a CI job of its own; save-ikot-test and
// save-edit-test are the others.
//
//   npm run dev                          (in another terminal)
//   node tests/e2e/save-test.mjs         # against http://localhost:5173
//
// The other suites run signed out, so until 2026-09-29 nothing that writes
// ran under a check (docs/archive/review-2026-09-29.md, section 4). The
// stand-in grew from the one the review drove them with
// (tests/unit/fixtures/fake-supabase.mjs).
//
// What it checks, each against the finding it guards (the review's numbers):
// the pill counts routes (7) and the stop table is read once a load (6); a
// hotspot saved as a draft with its links, nothing written to the approved
// tables; the map switch — Contributors, Playground and Public, the address,
// a half-drawn line, the camera and the basemap kept, the keys and clicks
// dead on the other maps; a route saved with its slot (2); the return trip
// from the card's SWITCH, closing the loop: it begins on the outbound's end,
// the outbound shows faintly under it, a click by its start's badge ends it on the
// outbound's start, and the save panel says how far an open loop falls short,
// and its draft fills the slot; every request line short with 500 hintuans
// (4); an edit that rewrites one direction by its id (2), and the camera with
// the cards, the public map's in the studio too (the owner, 2026-09-30); a
// direction's signboards in its draft; the route exported both ways; a delete
// that empties the direction into a slot and a redraw that fills it again
// (3), a refused step of it said (16); no React warnings.
import { readFileSync } from 'node:fs';

import { waitFor } from './lib/harness.mjs';
import {
  approveAll,
  approvedWrites,
  backToMap,
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
  draftOf,
  drafted,
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
  px,
  said,
  saveButton,
  since,
  stub,
  tables,
  URL_LIMIT,
  writesSince,
} from './lib/save-studio.mjs';

// ---- 1. The load: the pill and the reads
const loadReads = [...log];
const listReads = loadReads.filter(
  (w) => w.method === 'GET' && w.table === 'route_variant' && /route:route/.test(w.query),
).length;
// The hotspot list's own read (select=*); the Public map and Drafts read their few columns apart.
const hotspotReads = loadReads.filter(
  (w) => w.method === 'GET' && w.table === 'stop' && /select=\*/.test(w.query),
).length;
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

// ---- 2. Two hintuans, traced and saved as drafts
const hotspotDraftNamed = (name) =>
  tables.draft.find((d) => d.kind === 'hotspot' && d.payload.stop.name === name);
let w = await hintuan(P1, 'Stand-in Head');
const headDraft = hotspotDraftNamed('Stand-in Head');
check(
  'a hintuan traced and saved is one draft of a new hotspot, and no approved row',
  !!headDraft &&
    headDraft.is_new === true &&
    w.filter((x) => x.method === 'POST' && x.table === 'rpc/claim_draft').length === 1 &&
    approvedWrites(w).length === 0,
  said(w),
);
check(
  '  its draft lists its links: none, where no line passes',
  Array.isArray(headDraft?.payload.links) && headDraft.payload.links.length === 0,
  JSON.stringify(headDraft?.payload.links),
);
await hintuan(P2, 'Stand-in Tail');
check('a second one', !!hotspotDraftNamed('Stand-in Tail'));
await approveAll();
const head = tables.stop.find((s) => s.name === 'Stand-in Head');
const tail = tables.stop.find((s) => s.name === 'Stand-in Tail');
check(
  '  approved, both are places on the map, under the ids their drafts held',
  head?.id === headDraft?.subject_id && !!tail,
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

  // The Map Style sheet's Close, reached by keyboard: signed in, the provisional
  // "Drafts" button overlaps it and takes the click. The sidebar's replacement
  // of that button fixes the overlap; Enter still proves Close works.
  const closeMapStyle = async (sheet) => {
    await sheet.getByRole('button', { name: 'Close' }).focus();
    await page.keyboard.press('Enter');
  };
  const basemapPicked = async () => {
    await page.getByRole('button', { name: 'Map design' }).click();
    const dialog = page.getByRole('dialog');
    const picked = await dialog.locator('button[aria-pressed="true"]').innerText();
    await closeMapStyle(dialog);
    await page.waitForTimeout(300);
    return picked.trim();
  };
  // Another basemap than the one it opens on, so that "kept" means something.
  const basemapAtOpen = await basemapPicked();
  await page.getByRole('button', { name: 'Map design' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Terrain' }).click();
  await closeMapStyle(page.getByRole('dialog'));
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
      (await page.getByRole('region', { name: 'Published public view' }).isVisible()),
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
  await closeMapStyle(menu);
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

// ---- 2c. The map's ⓘ, as on the public map: at the map's bottom left, opening Map Data Source
{
  const drafts = await page.getByRole('button', { name: /^Drafts/ }).boundingBox();
  check(
    'on a computer Drafts stands in the top bar, clear of the map and its controls',
    !!drafts && drafts.y + drafts.height <= 48 && drafts.x + drafts.width <= 1280 - 16 + 1,
    JSON.stringify(drafts),
  );

  const info = page.getByRole('button', { name: 'Map data sources' });
  const sheet = page.getByRole('dialog', { name: 'Map Data Source' });
  const infoBox = await info.boundingBox();
  const mapBox = await page.locator('[data-map-box]').boundingBox();
  const scaleBox = await page.locator('.maplibregl-ctrl-scale').boundingBox();
  check(
    "the studio's ⓘ sits at the map's bottom left, 12 in, 32 across, MapLibre's corner credits gone",
    !!infoBox &&
      !!mapBox &&
      Math.abs(infoBox.x - mapBox.x - 12) < 1 &&
      Math.abs(infoBox.width - 32) < 1 &&
      Math.abs(mapBox.y + mapBox.height - (infoBox.y + infoBox.height) - 12) < 1 &&
      !(await page.locator('.maplibregl-ctrl-attrib').isVisible()),
    JSON.stringify({ infoBox, mapBox }),
  );
  check(
    '  the scale steps to its right: both are read',
    !!infoBox && !!scaleBox && scaleBox.x >= infoBox.x + infoBox.width,
    JSON.stringify(scaleBox),
  );
  await info.click();
  await sheet.waitFor();
  check(
    '  it opens Map Data Source over the studio, the map and the switch out of reach under it',
    (await page.evaluate(() => !!document.querySelector('[data-map-box]')?.closest('[inert]'))) &&
      (await page.evaluate(
        () => !!document.querySelector('[role=radiogroup]')?.closest('[inert]'),
      )),
  );
  await page.keyboard.press('Escape');
  await sheet.waitFor({ state: 'detached' });
  check(
    '  Escape closes it, focus back on the ⓘ, the map live again',
    (await page.evaluate(
      () => document.activeElement?.getAttribute('aria-label') === 'Map data sources',
    )) &&
      !(await page.evaluate(() => !!document.querySelector('[data-map-box]')?.closest('[inert]'))),
  );
}

// ---- 3a. On a computer, the route's form stands beside the map while the line is drawn
{
  await go(at(0, 0), 15);
  await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
  await page.getByRole('menuitem', { name: /Routes/ }).click();
  await page.waitForTimeout(300);
  const panel = page.getByTestId('sidebar');
  const save = panel.getByRole('button', { name: /^(Publish|Save as draft)$/ }).last();
  check(
    "the route's form is beside the map from the first click, named by its heading",
    (await panel.isVisible()) &&
      (await page.getByRole('form', { name: 'Route Information' }).isVisible()),
  );
  check(
    '  the map beside it is live, and the toolbar has no Done: Save is Done',
    !(await page.locator('[data-map-box]').evaluate((e) => e.inert)) &&
      (await page.getByRole('button', { name: 'Done' }).count()) === 0,
  );
  check(
    '  Line detail says a new route is a Draft',
    /Status\s+Draft/.test(await page.getByTestId('line-detail').innerText()),
  );
  check(
    '  Save waits for a line, and says so',
    (await save.isDisabled()) && (await panel.innerText()).includes('Add at least 2 points'),
  );
  await clickAt(OUT[0], 300);
  check(
    '  one point is no line yet: no end is guessed',
    (await page.getByTestId('save-head').inputValue()) === '',
  );
  for (const p of OUT.slice(1)) await clickAt(p, 300);
  await idle();
  await page.waitForTimeout(300);
  check(
    '  as the line reaches its places, both ends show at once',
    (await page.getByTestId('save-head').inputValue()) !== '' &&
      (await page.getByTestId('save-tail').inputValue()) !== '' &&
      (await save.isEnabled()),
    await page.getByTestId('save-head').inputValue(),
  );
  const panelBox = await panel.boundingBox();
  const mapBox = await page.locator('[data-map-box]').boundingBox();
  check(
    '  the form stands left of the map, 380 px wide, and the map starts where it ends',
    panelBox !== null &&
      mapBox !== null &&
      panelBox.x === 0 &&
      Math.round(panelBox.width) === 380 &&
      Math.round(mapBox.x) === 380,
    JSON.stringify({ panel: panelBox, map: mapBox }),
  );
  const infoBesideBox = await page.getByRole('button', { name: 'Map data sources' }).boundingBox();
  check(
    "  the map's ⓘ stays clear of the form, 12 in from the map's own left edge",
    !!infoBesideBox && !!mapBox && Math.abs(infoBesideBox.x - mapBox.x - 12) < 1,
    JSON.stringify(infoBesideBox),
  );
  // Shift+Tab from the toolbar's first button walks back into the form: it comes before the map in the page.
  await page.getByTitle('Discard this route').focus();
  let tabs = 0;
  while (tabs < 40 && !(await panel.evaluate((e) => e.contains(document.activeElement)))) {
    await page.keyboard.press('Shift+Tab');
    tabs += 1;
  }
  check(
    '  Shift+Tab from the toolbar reaches the form',
    await panel.evaluate((e) => e.contains(document.activeElement)),
    `${tabs} tabs`,
  );
  await page.setViewportSize({ width: 900, height: 800 });
  await page.waitForTimeout(300);
  check(
    '  narrower than a computer, the form leaves and Done comes back',
    !(await panel.isVisible()) && (await page.getByRole('button', { name: 'Done' }).isVisible()),
  );
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(300);
  await page.getByTitle('Discard this route').click();
  await page.waitForTimeout(300);
  check('  ✕ takes the form away with the line', !(await panel.isVisible()));

  // Exit, at the sidebar's foot: it asks before it loses a line, and ends the drawing.
  await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
  await page.getByRole('menuitem', { name: /Routes/ }).click();
  await page.waitForTimeout(300);
  const exit = panel.getByRole('button', { name: 'Exit' });
  await clickAt(OUT[0], 300);
  await clickAt(OUT[1], 300);
  // The suite's own dialog handler says yes to every question, so the page's is answered here.
  const answerConfirm = (answer) =>
    page.evaluate((a) => {
      window.confirm = (message) => {
        window.__asked = message;
        return a;
      };
    }, answer);
  await answerConfirm(false);
  await exit.click();
  await page.waitForTimeout(300);
  const asked = await page.evaluate(() => window.__asked);
  check(
    '  Exit with a line asks "Discard your changes?"; No keeps the line and the form',
    asked === 'Discard your changes?' && (await panel.isVisible()) && (await pointsShown()) === 2,
    asked,
  );
  await answerConfirm(true);
  await exit.click();
  await page.waitForTimeout(300);
  check('  and Yes ends the drawing', !(await panel.isVisible()));
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
  'the save panel has the ends guessed from where the line runs',
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
  'a new route is one draft: the route and two directions, one of them an empty slot',
  !!routeDraft &&
    routeDraft.is_new === true &&
    draftDirections.length === 2 &&
    draftDirections.filter((v) => v.shape === null).length === 1,
  said(w),
);
check('  nothing written to the approved tables', approvedWrites(w).length === 0, said(w));
const drawnDraft = draftDirections.find((v) => v.shape);
check(
  '  the draft holds the overview beside the line, from the same points (0009)',
  !!drawnDraft?.overview &&
    drawnDraft.overview.coordinates.length >= 2 &&
    drawnDraft.overview.coordinates.length <= drawnDraft.shape.coordinates.length &&
    String(drawnDraft.overview.coordinates[0][0]).split('.')[1].length <= 5,
  `${drawnDraft?.overview?.coordinates.length} of ${drawnDraft?.shape?.coordinates.length} points`,
);
check(
  '  the line is linked to the two hintuans it runs between',
  [head?.id, tail?.id].every((id) => drawnDraft?.links.some((l) => l.stop_id === id)),
  JSON.stringify(drawnDraft?.links),
);
const longest = since(n).reduce((a, x) => (x.url.length > a.url.length ? x : a), { url: '' });
check(
  `  no request line over ${URL_LIMIT} characters with ${tables.stop.length} hotspots (4)`,
  longest.url.length <= URL_LIMIT,
  `${longest.url.length}: ${longest.method} ${longest.table}${longest.query.slice(0, 60)}`,
);
check(
  '  the drawing is gone',
  (await page.evaluate(() => localStorage.getItem('para.draft.v1'))) === null,
);
await approveAll();
const outRoute = tables.route.find((r) => r.id === routeDraft?.subject_id);
check(
  '  approved, it is one route row and two directions, one of them an empty slot',
  !!outRoute &&
    directionsOf(outRoute.id).length === 2 &&
    directionsOf(outRoute.id).filter((v) => v.shape === null).length === 1,
);
const outV = outRoute && directionsOf(outRoute.id).find((v) => v.shape);
check(
  '  the pill counts one route more (7)',
  (await body()).includes(`${routesToday + 1} routes`),
  (await body()).match(/\d+ routes?/)?.[0],
);

// ---- 4. The return trip, into the slot
const outLine = outV?.shape?.coordinates ?? [];
const slotId = directionsOf(outRoute?.id).find((v) => v.shape === null)?.id;
await openCard(OUT[1]);
await page.getByTestId('card-switch').click();
await page.waitForTimeout(400);
let drawn = await drawnPoints();
check(
  "the card's SWITCH begins the return trip with its first point on the outbound line's end (<1 m)",
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
  '  the toolbar has no "Close the loop": a line closes by its first point\'s badge',
  (await closeLoop().count()) === 0,
);
{
  // Nearing where papunta began, the connect badge shows there: a click would close the loop.
  const [sx, sy] = await px(outLine[0]);
  await page.mouse.move(sx + 6, sy + 6, { steps: 3 });
  await page.waitForTimeout(150);
  const near = await page.getByTestId('connect-hint').count();
  await page.mouse.move(sx + 80, sy + 80, { steps: 3 });
  check(
    "  nearing the outbound's start shows the connect badge, away from it none",
    near === 1 && (await page.getByTestId('connect-hint').count()) === 0,
    `near ${near}`,
  );
}
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
await backToMap();
await page.waitForTimeout(300);
// A click by the connect badge closes the loop, on the outbound line's start exactly.
{
  const [sx, sy] = await px(outLine[0]);
  await page.mouse.move(sx + 4, sy + 4, { steps: 3 });
  await page.mouse.click(sx + 4, sy + 4);
}
await idle();
await page.waitForTimeout(400);
drawn = await drawnPoints();
check(
  "  a click by the badge adds a last point on the outbound line's start (<1 m)",
  drawn.length === 4 && outLine.length > 1 && metresBetween(drawn.at(-1), outLine[0]) < 1,
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
await drafted();
w = writesSince(n);
const returnDraft = draftOf('route', outRoute?.id);
check(
  '  its draft fills the slot of the same route: no new route, both ways drawn (2)',
  returnDraft?.is_new === false &&
    returnDraft.payload.directions.length === 2 &&
    returnDraft.payload.directions.every((v) => v.shape) &&
    returnDraft.payload.directions.some((v) => v.id === slotId && v.reversed === true) &&
    approvedWrites(w).length === 0,
  said(w),
);
await approveAll();
const backV = directionsOf(outRoute?.id).find((v) => v !== outV);
check(
  '  approved, both directions are drawn, still two rows',
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
// Edit route opens in Move, where a click adds nothing: Snap, to add.
const moveOnEdit = await page
  .getByTestId('snap-draw')
  .getByRole('button', { name: 'Move' })
  .getAttribute('aria-pressed');
check('  Edit route opens in Move', moveOnEdit === 'true', `${moveOnEdit}`);
await page.getByTestId('snap-draw').getByRole('button', { name: 'Snap' }).click();
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
await backToMap();
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
await drafted();
w = writesSince(n);
const editDraft = draftOf('route', outRoute?.id);
check(
  '  Update is a draft of the route that rewrites that one direction, by its id',
  editDraft?.is_new === false &&
    editDraft.payload.directions.find((v) => v.id === outV?.id)?.control_points.length ===
      OUT.length + 1 &&
    approvedWrites(w).length === 0,
  said(w),
);
check(
  '  no direction added or lost',
  editDraft?.payload.directions.length === 2 && tables.route_variant.length === rowsBefore,
);
await approveAll();

// ---- 5b. Signboards, per direction (0010, the owner's ask of 2026-10-01)
const outRow = () => tables.route_variant.find((v) => v.id === outV?.id);
/** The direction's boards as the route's draft lists them. */
const draftBoards = () =>
  draftOf('route', outRoute?.id)?.payload.directions.find((v) => v.id === outV?.id)?.signboards ??
  [];
const items = () => page.getByTestId('signboard-item');
const upload = (name, text) =>
  page
    .getByTestId('signboard-file')
    .setInputFiles({ name, mimeType: 'image/svg+xml', buffer: Buffer.from(text) });
await openCard(OUT[1]);
const editor = page.getByTestId('signboard-editor');
// The signboards wait for the route's draft to be read.
await waitFor(async () => (await editor.count()) === 1);
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
const firstBoard = draftBoards()[0];
const stored = bucket.get(firstBoard) ?? '';
check(
  '  an upload lands in the bucket cleaned: no script, no handler, no link out',
  /^[0-9a-f-]{36}\.svg$/.test(firstBoard ?? '') &&
    stored.includes('<rect width="98" height="40" fill="#111"/>') &&
    !/script|onload|alert|example\.com/.test(stored),
  stored.slice(0, 160),
);
check(
  "  and is listed in the route's draft, file first and then the draft; the approved row untouched",
  (await items().count()) === 1 &&
    since(n).findIndex((x) => x.table === 'storage') <
      since(n).findIndex((x) => x.method === 'POST' && x.table === 'rpc/claim_draft') &&
    outRow()?.signboards.length === 0 &&
    approvedWrites(writesSince(n)).length === 0,
  said(since(n)),
);
check(
  '  the card above shows only what is approved: no board yet',
  (await page.getByTestId('trip-signboard').count()) === 0,
);
// Approved, the card above shows the board as commuters will see it.
await approveAll();
await openCard(OUT[1]);
await waitFor(async () => (await page.getByTestId('trip-signboard').count()) === 1);
await waitFor(async () => (await items().count()) === 1);
check(
  '  approved, the card above shows it as commuters will',
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
const second = draftBoards()[1];
await page.getByRole('button', { name: 'Move signboard 2 earlier' }).click();
await waitFor(async () => draftBoards()[0] === second);
check(
  '  a second goes last, and ‹ moves it first',
  draftBoards().join() === [second, firstBoard].join(),
  JSON.stringify(draftBoards()),
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
  "  ✕ takes it off the draft's list; its file stays, as the approved map may still list it",
  draftBoards().join() === firstBoard && bucket.has(second),
  JSON.stringify(draftBoards()),
);
await page.getByRole('button', { name: 'Remove signboard 1' }).click();
await waitFor(async () => (await items().count()) === 0);
check(
  '  and the last one leaves none in the draft; the card above keeps the approved board until approval',
  draftBoards().length === 0 &&
    (await items().count()) === 0 &&
    (await page.getByTestId('trip-signboard').count()) === 1,
  `${JSON.stringify(draftBoards())}; ${await page.getByTestId('trip-signboard').count()} board(s) on the card`,
);

// The race the step above met on slower runners, made certain: removing the
// last two boards reads the directions twice, and the first read, which
// still lists a board, answers after the second. A late answer must never
// bring a removed board back to the editor (the card above lists the approved
// boards, which a draft leaves as they are).
await upload(
  'third.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 98 40"><rect width="98" height="40" fill="#333"/></svg>',
);
await waitFor(async () => (await items().count()) === 1);
await upload(
  'fourth.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 98 40"><rect width="98" height="40" fill="#444"/></svg>',
);
await waitFor(async () => (await items().count()) === 2);
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
await waitFor(async () => (await items().count()) === 0);
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
const shownAgain = async () => await items().count();
const isBroughtBack = await waitFor(async () => (await shownAgain()) > 0, 5000);
check(
  '  a list read that answers late, after the last is gone, never brings a board back',
  isListHeld && !isBroughtBack && draftBoards().length === 0,
  `held: ${isListHeld}; ${JSON.stringify(draftBoards())}; ${await items().count()} in the editor`,
);

// The boards' draft, empty again, approved: the map moves on as it was.
await approveAll();

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
// A refused step — here the draft the delete is stored as — is said, not
// swallowed (16). Delete again finishes it.
stub.fault = (method, table) => method === 'POST' && table === 'rpc/claim_draft';
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
  'Delete is approved in the same press, and empties the direction into a slot: the row stays, with no line (3)',
  directionsOf(outRoute?.id).length === 2 &&
    directionsOf(outRoute?.id).find((v) => v.id === outV?.id)?.shape === null &&
    !draftOf('route', outRoute?.id),
  said(w),
);
check(
  '  its links go with its line, and its overview',
  !tables.route_stop.some((l) => l.route_variant_id === outV?.id) &&
    directionsOf(outRoute?.id).find((v) => v.id === outV?.id)?.overview === null,
);
check(
  '  the route stays: its other way is drawn',
  tables.route.some((r) => r.id === outRoute?.id && r.status === 'approved'),
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
  async () =>
    (await body()).includes('Saved as a draft') ||
    /already has this direction drawn/.test(await body()),
);
w = writesSince(n);
const refillDraft = draftOf('route', outRoute?.id);
check(
  '+ then Routes with the same ends fills the slot again in a draft of that route, not "already drawn" (3)',
  refillDraft?.is_new === false &&
    refillDraft.payload.directions.length === 2 &&
    refillDraft.payload.directions.every((v) => v.shape) &&
    !/already has this direction drawn/.test(await body()),
  (await body()).slice(-160),
);
await approveAll();
check(
  '  approved, one route, two drawn directions',
  tables.route.filter((r) => r.id === outRoute?.id).length === 1 &&
    directionsOf(outRoute?.id).length === 2 &&
    directionsOf(outRoute?.id).every((v) => v.shape),
  said(w),
);

await finish('save-test.png');
