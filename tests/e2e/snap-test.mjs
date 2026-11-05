// Snapping in the studio editor: far clicks, U-turns at joins, street names.
//
//   npm run dev                                (in another terminal)
//   node tests/e2e/snap-test.mjs
//
// Opens /studio/?e2e=1, draws routes on fixed streets, reads the drawn line
// back out of the map (the draw-line source: one feature per segment, with
// `index` and `snap`) and checks three things:
//
//   far click  A click no road is within 25 m of becomes a straight, solid
//              'freehand' segment, not a routed line to a road far away. The
//              only dashed line is the Snap preview's.
//   U-turns    Where the route turns back on itself at a join, the line is kept
//              as the router drew it and the editor says so: the point is
//              ringed in amber with its doubled-back stretch (the draw-uturns
//              source) and the toolbar counts it. A join that goes on is not
//              flagged. Checked after appending, after dragging a middle point
//              and after inserting a point. The owner chose this on 2026-09-15:
//              a U-turn can be a click past a corner or a jeepney that really
//              turns there, so it is shown, never changed.
//   streets    The routed segments carry the street names the save panel lists
//              as "via A → B". A ?e2e=1 session has no account, so Done opens
//              "Sign in to save" rather than the panel (regression-gestures.mjs
//              checks that); the names are read from the drawing's own draft
//              through routeStreets, as the panel does. The panel itself is in
//              the Studio/SavePanel story.
//
// A turn back is a turn sharper than 150° between the bearing into a vertex and
// the bearing out of it, within 10 m of the join. The detector is a pure
// function and runs first on made-up lines, so a result below cannot come from
// a detector that sees nothing.
//
// Why these coordinates. A U-turn at a join needs a particular street layout,
// so the clicks are fixed rather than taken from saved routes. They were found
// on 2026-09-15: OpenStreetMap roads around Novaliches from Overpass gave
// two-way streets with a T-junction side street, and the public OSRM router
// confirmed the layout: routing the gaps as the router naturally does left a
// 180° turn at a join in all three scenarios below. Every click is the spot
// OSRM snapped that coordinate to, so it is on the road. Sinai Street runs
// east-west; Assyria Street leaves it southwards between A and B, so A→B→C must
// turn around somewhere to reach C. The far point is in the La Mesa watershed
// forest: without radiuses OSRM snaps it to Quirino Highway 1,213 m away, with
// radiuses=25 it answers NoSegment.
//
// The router is the public OSRM demo (about one request a second, shared), so
// after every gesture the script waits for "snapping…" to clear and then 1.5 s.
import { chromium } from 'playwright';
import { BASE, harness, nodeFetch, waitForSource } from './lib/harness.mjs';
import { drawing } from './lib/studio.mjs';

const { check, tally } = harness({ bracketed: true });

// Sinai Street and Assyria Street, Novaliches. The junction is at 121.042397, 14.742005.
const A = [121.043326, 14.742006]; // Sinai Street, 100 m east of the junction
const B = [121.04184, 14.742003]; // Sinai Street, 60 m west of the junction
const C = [121.0424, 14.741507]; // Assyria Street, 55 m south of the junction
const P = [121.042399, 14.741896]; // Assyria Street, 12 m south of the junction: ~5 px off the Sinai line at zoom 16, so a click here lands on that line
const C0 = [121.041282, 14.742004]; // Sinai Street, 120 m west of the junction: where C starts before it is dragged
const D = [121.04075, 14.741919]; // Sinai Street, 180 m west of the junction
const E = [121.040297, 14.741603]; // Sinai Street, 240 m west of the junction
// Quirino Highway and the La Mesa watershed.
const Q1 = [121.081741, 14.747459]; // Quirino Highway: the spot OSRM snaps W to when no radius is given
const Q2 = [121.080245, 14.746203]; // Quirino Highway, 220 m along the road from Q1
const W = [121.09, 14.74]; // forest, 1,213 m from the nearest road
const ZOOM = 16; // about 2.3 m a pixel here, so 25 m is 11 px

// ------------------------------------------------------------ turn detector
const toRad = (d) => (d * Math.PI) / 180;
const metres = ([lng1, lat1], [lng2, lat2]) => {
  const a =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
};
const bearing = ([lng1, lat1], [lng2, lat2]) => {
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
  return (Math.atan2(y, x) * 180) / Math.PI;
};

/**
 * Turn angles around each join of a line drawn as segments (arrays of
 * [lng, lat], in order). The segments are joined the way joinSegments in
 * src/shared/utils/geo.ts does it for routed segments: every segment after the
 * first loses its first coordinate, which repeats the previous segment's last
 * (joinSegments keeps it when it does not, since 2026-10-03). For the join before
 * control point k it reports the worst turn within atM metres along the line.
 * A vertex's turn is the angle, 0–180°, between the bearing in from the last
 * vertex at least minStepM behind it and the bearing out to the first vertex
 * at least minStepM ahead, so repeated points cannot invent one. minStepM is
 * 5 m because the editor ignores retraces shorter than 5 m (a route running
 * back over itself at a control point), so the test does not count them either.
 */
function turnsAtJoins(segments, { atM = 10, maxTurn = 150, minStepM = 5 } = {}) {
  const line = [],
    joins = [];
  segments.forEach((s, i) => {
    if (i > 0) joins.push(line.length - 1);
    line.push(...(i === 0 ? s : s.slice(1)));
  });
  const along = [0];
  for (let i = 1; i < line.length; i++) along.push(along[i - 1] + metres(line[i - 1], line[i]));
  const turn = (i) => {
    let p = i - 1;
    while (p >= 0 && metres(line[p], line[i]) < minStepM) p--;
    let q = i + 1;
    while (q < line.length && metres(line[i], line[q]) < minStepM) q++;
    if (p < 0 || q >= line.length) return 0;
    const d = Math.abs(bearing(line[i], line[q]) - bearing(line[p], line[i])) % 360;
    return d > 180 ? 360 - d : d;
  };
  return joins.map((j, k) => {
    let at = 0;
    for (let i = 1; i < line.length - 1; i++)
      if (Math.abs(along[i] - along[j]) <= atM) at = Math.max(at, turn(i));
    return { point: k + 1, at: Math.round(at), turnsBack: at > maxTurn };
  });
}

console.log('== Turn detector, on made-up lines');
// metres east and north of a point in Novaliches, as [lng, lat]
const M = (east, north) => [
  121.05 + east / (111320 * Math.cos(toRad(14.745))),
  14.745 + north / 110574,
];
let j = turnsAtJoins([
  [M(0, 0), M(0, 25), M(0, 50)],
  [M(0, 50), M(0, 75), M(0, 100)],
])[0];
check(
  'detector: a straight line due north does not turn back (negative control)',
  !j.turnsBack,
  `${j.at}°`,
);
j = turnsAtJoins([
  [M(0, 0), M(25, 0), M(50, 0)],
  [M(50, 0), M(25, 0), M(0, 0)],
])[0];
check(
  'detector: 50 m east then 50 m back west turns back at the join (positive control)',
  j.turnsBack,
  `${j.at}°`,
);
j = turnsAtJoins([
  [M(0, 0), M(25, 0), M(50, 0)],
  [M(50, 0), M(90, 0), M(60, 0)],
])[0];
check('detector: a U-turn 40 m past the join is not at the join', !j.turnsBack, `${j.at}°`);

// ------------------------------------------------------------------ browser
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
await nodeFetch(page);
// NoSegment comes back as HTTP 400 and is an answer; only 429 and 5xx mean the router turned us away.
const isRouter = (u) => /routing\.openstreetmap\.de|route\/v1\/driving/.test(u);
let routerCalls = 0,
  routerRefused = 0;
page.on('request', (r) => {
  if (isRouter(r.url())) routerCalls++;
});
page.on('response', (r) => {
  if (isRouter(r.url()) && (r.status() === 429 || r.status() >= 500)) routerRefused++;
});
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.addInitScript(() => {
  window.__src = async (id) => {
    const s = window.__map?.getSource(id);
    return s ? await s.getData() : null;
  };
});

const { proj, idle, renderedAt } = drawing(page);
// After a gesture that routes: let the request start, let it finish, then give the shared router a breather.
const settle = async () => {
  await page.waitForTimeout(400);
  await idle();
  await page.waitForTimeout(1500);
  await idle();
};
// Each drawn segment, with `real`: whether the router really answered it. A gap
// still waiting shows a straight stand-in that is also 'snapped' on the map; the
// draft marks it pending, with no streets.
const segs = async () =>
  (
    await page.evaluate(async () => {
      const d = JSON.parse(localStorage.getItem('para.draft.v1') ?? 'null');
      return ((await window.__src('draw-line'))?.features ?? []).map((f) => {
        const kept = d?.segments?.[f.properties.index];
        return {
          index: f.properties.index,
          snap: f.properties.snap,
          coords: f.geometry.coordinates,
          real: !!kept && Array.isArray(kept.streets) && !kept.pending,
        };
      });
    })
  )
    .filter((s) => s.index >= 0)
    .sort((a, b) => a.index - b.index);
const cps = async () =>
  (
    await page.evaluate(async () =>
      ((await window.__src('draw-points'))?.features ?? []).map((f) => ({
        index: f.properties.index,
        c: f.geometry.coordinates,
      })),
    )
  )
    .sort((a, b) => a.index - b.index)
    .map((p) => p.c);
const box0 = { x: 0, y: 0 };
const clickAt = async (c) => {
  const [x, y] = await proj(c);
  await page.mouse.click(box0.x + x, box0.y + y);
};
// Centre the map on a scenario's points at street level; each scenario spans well under the viewport.
const view = async (points) => {
  const lng = points.map((p) => p[0]),
    lat = points.map((p) => p[1]);
  const center = [
    (Math.min(...lng) + Math.max(...lng)) / 2,
    (Math.min(...lat) + Math.max(...lat)) / 2,
  ];
  await page.evaluate(([c, z]) => window.__map.jumpTo({ center: c, zoom: z }), [center, ZOOM]);
  await page.waitForTimeout(300);
};
const newRoute = async () => {
  await page.getByRole('button', { name: 'New route, terminal or hintuan' }).click();
  await page.getByRole('menuitem', { name: /Routes/ }).click();
  await page.getByTestId('draw-toolbar').waitFor({ timeout: 5000 });
};
const discard = async () => {
  await page.getByRole('button', { name: /^Discard this/ }).click();
  await page
    .getByRole('button', { name: 'New route, terminal or hintuan' })
    .waitFor({ timeout: 5000 });
};
const drawRoute = async (points) => {
  await newRoute();
  for (const [i, p] of points.entries()) {
    await clickAt(p);
    if (i === 0) await page.waitForTimeout(250);
    else await settle();
  }
};
// "snapped?" marks a stand-in: snapped on the map, but the router has not answered it.
const snapModes = (s) =>
  s.map((x) => x.snap + (x.snap === 'snapped' && !x.real ? '?' : '')).join(',') || 'none';
const allSnapped = (s, points) =>
  s.length === points - 1 && s.every((x) => x.snap === 'snapped' && x.real);

// What the editor flags: rings (points) and stubs (lines) in draw-uturns, and the toolbar count.
const flagged = async () => {
  const f = await page.evaluate(async () => (await window.__src('draw-uturns'))?.features ?? []);
  return {
    rings: f
      .filter((x) => x.geometry.type === 'Point')
      .map((x) => x.properties.point)
      .sort((a, b) => a - b),
    stubs: f.filter((x) => x.geometry.type === 'LineString').length,
  };
};
const toolbarCount = async () =>
  Number((await page.locator('body').innerText()).match(/⚠ (\d+) U-turn/)?.[1] ?? 0);

// Three checks per scenario. The first is the positive control: the router's
// line really does turn back, so the two after it cannot pass by flagging nothing.
const uTurnChecks = async (scenario, s, labels) => {
  const snapped = allSnapped(s, labels.length);
  const joins = turnsAtJoins(s.map((x) => x.coords));
  const back = joins.filter((x) => x.turnsBack).map((x) => x.point);
  const f = await flagged();
  const n = await toolbarCount();
  const names = (ps) => ps.map((p) => labels[p]).join(', ') || 'none';
  const why = snapped ? '' : `gaps not all snapped: ${snapModes(s)}; `;
  check(
    `${scenario}: the line still turns back where the router drew it (kept, not hidden)`,
    snapped && back.length > 0,
    why + joins.map((x) => `${labels[x.point]} ${x.at}°`).join(', '),
  );
  check(
    `${scenario}: exactly the joins that turn back are ringed in amber, each with its stretch`,
    snapped && f.rings.join() === back.join() && f.stubs === f.rings.length,
    `turn back: ${names(back)}; ringed: ${names(f.rings)}; stretches: ${f.stubs}`,
  );
  check(
    `${scenario}: the toolbar counts them`,
    n === back.length,
    `toolbar ⚠ ${n}, turn back ${back.length}`,
  );
};

await page.goto(`${BASE}/studio/?e2e=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__map && window.__map.loaded(), null, { timeout: 30000 });
// The studio frames its saved routes once, as they come in, unless a drawing
// has begun (useSavedRoutes). A view set before then is undone by it, as the
// other drawing suites know: they wait for the routes too. Since the
// cheap-phone work the map's 'load' comes sooner, and on GitHub's runner the
// routes came about 1.3 s after it, after this suite's first view: the far
// click's two points went down at the routes' zoom, a pixel or two apart, and
// the second landed on the first ("gaps none", 3 runs in 4 on staging,
// 2026-10-06). An empty table frames nothing, so after 20 s the run goes on.
await waitForSource(page, 'saved-routes');
await page.waitForTimeout(800);
const box = await page.locator('canvas.maplibregl-canvas').boundingBox();
box0.x = box.x;
box0.y = box.y;
const zoomNow = async () => (await page.evaluate(() => window.__map.getZoom())).toFixed(1);

console.log('== Far click (Quirino Highway, La Mesa watershed)');
await view([Q1, Q2, W]);
await drawRoute([Q2, Q1]);
let s = await segs();
check(
  'far click: an on-road second point is snapped (control)',
  allSnapped(s, 2),
  `gaps ${snapModes(s)}, at zoom ${await zoomNow()}`,
);
// Which way the line goes: the public map's chevrons, on its solid stretches only.
const chevrons = async () =>
  ((await page.evaluate(() => window.__src('draw-arrows')))?.features ?? []).length;
let arrows = await chevrons();
check('far click: chevrons flow along the snapped line', arrows > 0, `${arrows} chevrons`);
const where = () =>
  page.evaluate(async () =>
    JSON.stringify((await window.__src('draw-arrows'))?.features?.[0]?.geometry.coordinates),
  );
const before = await where();
await page.waitForTimeout(400);
check('far click: the chevrons move along it', before !== (await where()));
await discard();
// A 429, a 5xx or a timeout also leaves the gap freehand, so a freehand line
// alone does not prove the router refused the point. Keep the router's answers
// to this gesture: one must be HTTP 400 with NoSegment in its body.
const answers = [],
  onAnswer = (r) => {
    if (isRouter(r.url())) answers.push(r);
  };
page.on('response', onAnswer);
await drawRoute([Q2, W]);
page.off('response', onAnswer);
const said = await Promise.all(
  answers.map(async (r) => ({ status: r.status(), body: await r.text().catch(() => null) })),
);
const noSegment = said.some((a) => a.status === 400 && !!a.body?.includes('NoSegment'));
const saidText =
  said
    .map(
      (a) =>
        `${a.status}${a.body == null ? ' (body unavailable)' : a.body.includes('NoSegment') ? ' NoSegment' : ''}`,
    )
    .join(', ') || 'nothing';
s = await segs();
const end = s[0]?.coords.at(-1);
check(
  'far click: a point 1.2 km from any road draws freehand, not a line to that road',
  s.length === 1 && s[0].snap === 'freehand' && noSegment,
  `gaps ${snapModes(s)}, the line ends ${end ? Math.round(metres(end, W)) : '?'} m from the click, router answered ${saidText}`,
);
arrows = await chevrons();
check('far click: no chevrons on the freehand line', arrows === 0, `${arrows} chevrons`);
const freehandDash = await page.evaluate(() =>
  window.__map.getPaintProperty('draw-line-freehand', 'line-dasharray'),
);
check(
  'far click: the freehand line is solid, not dashed',
  freehandDash === undefined,
  JSON.stringify(freehandDash),
);
await discard();

console.log('== Append (Sinai Street, Novaliches)');
await view([A, B, C, D, E]);
await drawRoute([A, B, C]);
s = await segs();
let pts = await cps();
check(
  'append: A→B→C drawn, 3 points, every gap snapped',
  pts.length === 3 && allSnapped(s, 3),
  `${pts.length} points, gaps ${snapModes(s)}`,
);
await uTurnChecks('append', s, ['A', 'B', 'C']);

console.log('== Street names');
const streets = await page.evaluate(async () => {
  const draft = JSON.parse(localStorage.getItem('para.draft.v1') ?? 'null');
  if (!draft) return null;
  const { routeStreets } = await import('/src/features/studio/drawing/streets.ts');
  return routeStreets(draft.segments);
});
check(
  'street names: every routed segment carries its streets, and "via …" names at least one',
  !!streets && streets.names.length > 0 && streets.missing === 0,
  streets
    ? `via ${streets.names.join(' → ')}; missing ${streets.missing}`
    : 'no draft in localStorage',
);
await discard();

console.log('== Drag a middle point');
// Five points so the dragged one has an untouched segment on both sides.
await drawRoute([A, B, C0, D, E]);
pts = await cps();
const from = await proj(pts[2] ?? C0),
  to = await proj(C);
await renderedAt(from, 'draw-point-dots');
await page.mouse.move(box0.x + from[0], box0.y + from[1]);
await page.mouse.down();
for (let i = 1; i <= 10; i++)
  await page.mouse.move(
    box0.x + from[0] + ((to[0] - from[0]) * i) / 10,
    box0.y + from[1] + ((to[1] - from[1]) * i) / 10,
  );
await page.mouse.up();
await settle();
pts = await cps();
s = await segs();
const moved = pts.length === 5 ? metres(pts[2], C) : Infinity;
check(
  'drag: C dragged from Sinai onto Assyria Street, 5 points, every gap snapped',
  pts.length === 5 && moved < 5 && allSnapped(s, 5),
  `${pts.length} points, C is ${Math.round(moved)} m from where it was dropped, gaps ${snapModes(s)}`,
);
await uTurnChecks('drag', s, ['A', 'B', 'C', 'D', 'E']);
await page.screenshot({ path: 'snap-drag.png' });
await discard();

console.log('== Insert a point on the line');
await drawRoute([A, B, D]);
s = await segs();
const straightOn = turnsAtJoins(s.map((x) => x.coords));
const noFlags = await flagged();
check(
  'insert, before: A→B→D goes on at B, nothing ringed, no toolbar count (control)',
  allSnapped(s, 3) &&
    straightOn.every((x) => !x.turnsBack) &&
    noFlags.rings.length === 0 &&
    noFlags.stubs === 0 &&
    (await toolbarCount()) === 0,
  `B ${straightOn[0]?.at}°, ringed ${noFlags.rings.length}, gaps ${snapModes(s)}`,
);
const pPx = await proj(P);
const onLine = await renderedAt(pPx, 'draw-line-hit');
await clickAt(P);
await settle();
pts = await cps();
s = await segs();
const placed = pts.length === 4 ? metres(pts[1], P) : Infinity;
check(
  'insert: clicking the A→B line at Assyria Street inserts P as the second point, every gap snapped',
  pts.length === 4 && placed < 5 && allSnapped(s, 4),
  `line under the click: ${onLine}, ${pts.length} points, P is ${Math.round(placed)} m from the click, gaps ${snapModes(s)}`,
);
await uTurnChecks('insert', s, ['A', 'P', 'B', 'D']);
await discard();

console.log('== Live preview');
// As the cursor moves, a straight dashed guide from the last point to it shows
// at once in draw-preview; once it rests, the road replaces it; a move puts
// the guide back at once; there is none in Draw.
const preview = async () =>
  ((await page.evaluate(() => window.__src('draw-preview')))?.features ?? []).flatMap(
    (f) => f.geometry?.coordinates ?? [],
  );
const restAt = async (c) => {
  const [x, y] = await proj(c);
  await page.mouse.move(box0.x + x, box0.y + y, { steps: 4 });
};
/** The road offered once the cursor rests, and how long after the rest it came. */
const roadOffered = async () => {
  const restedAt = Date.now();
  let line = await preview();
  for (let i = 0; i < 120 && line.length <= 2; i++) {
    await page.waitForTimeout(50);
    line = await preview();
  }
  return { line, ms: Date.now() - restedAt };
};
await drawRoute([A, B]);
await restAt(D);
const guide = await preview();
check(
  'preview: the moment the cursor stops, a straight guide from B to it, before any road',
  guide.length === 2 && metres(guide[0], B) < 25 && metres(guide[1], D) < 5,
  `${guide.length} coords`,
);
let { line: offered, ms: roadMs } = await roadOffered();
console.log(`      the road showed ${roadMs} ms after the rest`);
check(
  'preview: resting past B, the road from B to the cursor shows',
  offered.length > 2 && metres(offered[0], B) < 25 && metres(offered.at(-1), D) < 25,
  `${offered.length} coords, from B ${offered[0] ? Math.round(metres(offered[0], B)) : '?'} m, to the cursor ${offered.length ? Math.round(metres(offered.at(-1), D)) : '?'} m`,
);
const previewDash = await page.evaluate(() =>
  window.__map.getPaintProperty('draw-preview-line', 'line-dasharray'),
);
check(
  'preview: dashed, the one dashed line in the drawing',
  Array.isArray(previewDash),
  JSON.stringify(previewDash),
);
const segsBefore = (await segs()).length;
await restAt(E);
const guideAgain = await preview();
check(
  'preview: a move puts the straight guide back at once, to the cursor',
  guideAgain.length === 2 && metres(guideAgain[1], E) < 5,
  `${guideAgain.length} coords`,
);
check('preview: it is never part of the line', (await segs()).length === segsBefore);
({ ms: roadMs } = await roadOffered());
console.log(`      and ${roadMs} ms after a second rest, the queue a second apart`);
await restAt(D);
({ line: offered } = await roadOffered());
await page.keyboard.press('f');
await page.waitForTimeout(200);
check(
  'preview: F for Draw takes it away, the cursor never moving',
  offered.length > 2 && (await preview()).length === 0,
  `${offered.length} coords before`,
);
await page.keyboard.press('f');
const pressed = (name) =>
  page.getByTestId('snap-draw').getByRole('button', { name }).getAttribute('aria-pressed');
await page.keyboard.press('d');
const drawOnD = await pressed('Draw');
await page.keyboard.press('s');
const snapOnS = await pressed('Snap');
check('keys: D picks Draw, S picks Snap', drawOnD === 'true' && snapOnS === 'true');
await page.getByTestId('snap-draw').getByRole('button', { name: 'Draw' }).click();
await restAt(D);
await page.waitForTimeout(2500);
check('preview: none in Draw', (await preview()).length === 0);
await discard();

console.log('== Curves in Draw');
// A click places a corner; a press and a drag places a smooth point, its
// handles mirrored; the stretches either side bend to it, and keep their bend
// as the point is dragged. Only Draw's stretches bend.
const drafted = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('para.draft.v1') ?? 'null')?.segments ?? []);
await view([A, B, C, D, E]);
await newRoute();
await page.getByTestId('snap-draw').getByRole('button', { name: 'Draw' }).click();
await clickAt(A);
await page.waitForTimeout(250);
const [bx, by] = await proj(C0);
await page.mouse.move(box0.x + bx, box0.y + by);
// Draw's line to the cursor: from the last point, the stretch a click would add.
const cursorLine = async () =>
  ((await page.evaluate(() => window.__src('draw-cursor')))?.features ?? []).flatMap(
    (f) => f.geometry?.coordinates ?? [],
  );
let toCursor = await cursorLine();
check(
  'cursor line: from a corner, straight from the last point to the cursor',
  toCursor.length === 2 && metres(toCursor[0], A) < 5 && metres(toCursor[1], C0) < 5,
  `${toCursor.length} coords, from A ${toCursor[0] ? metres(toCursor[0], A).toFixed(1) : '?'} m, to the cursor ${toCursor[1] ? metres(toCursor[1], C0).toFixed(1) : '?'} m`,
);
await page.mouse.down();
for (let i = 1; i <= 6; i++) await page.mouse.move(box0.x + bx + i * 8, box0.y + by - i * 6);
// Before the release, the stretch into the point bends live on the line.
const liveLine = (await page.evaluate(() => window.__src('draw-line')))?.features ?? [];
const liveSegs = (await drafted()).length;
check(
  'curves: while the pen drags, the stretch in bends live, before the release writes it',
  liveLine.length === 1 && liveLine[0].geometry.coordinates.length > 2 && liveSegs === 0,
  `${liveLine.length} line features, ${liveLine[0]?.geometry.coordinates.length} coords, ${liveSegs} drafted`,
);
await page.mouse.up();
await page.waitForTimeout(250);
const handleCount = async () =>
  ((await page.evaluate(() => window.__src('draw-handles')))?.features ?? []).length;
/** Whether point `i`'s handles show: its stretch in's end handle, or its stretch out's start one. */
const showsHandlesOf = async (i) =>
  ((await page.evaluate(() => window.__src('draw-handles')))?.features ?? []).some(
    (f) =>
      f.geometry.type === 'Point' &&
      ((f.properties.seg === i - 1 && f.properties.end === 1) ||
        (f.properties.seg === i && f.properties.end === 0)),
  );
const handleColours = await page.evaluate(() => [
  window.__map.getPaintProperty('draw-handle-arms', 'line-color'),
  window.__map.getPaintProperty('draw-handle-dots', 'circle-color'),
]);
check(
  'handles: the arm red/400, the dot red/600',
  handleColours[0] === '#ff6467' && handleColours[1] === '#e7000b',
  JSON.stringify(handleColours),
);
check(
  'handles: the smooth point just placed shows its two handles',
  (await handleCount()) === 4,
  `${await handleCount()}`,
);
const [ex, ey] = await proj(E);
await page.mouse.move(box0.x + ex, box0.y + ey, { steps: 3 });
toCursor = await cursorLine();
check(
  'cursor line: after a smooth point, bent along its handle to the cursor',
  toCursor.length > 2 && metres(toCursor.at(-1), E) < 25,
  `${toCursor.length} coords`,
);
await clickAt(E);
await page.waitForTimeout(400);
let bent = await drafted();
const handles = await handleCount();
check(
  'curves: a corner, a dragged smooth point, a corner: two Draw stretches, both bent',
  bent.length === 2 &&
    bent.every((x) => x.snap === 'freehand' && x.handles && x.coordinates.length > 2),
  JSON.stringify(bent.map((x) => [x.snap, x.coordinates.length, !!x.handles])),
);
check(
  'handles: the last two points always show theirs: the smooth one, an arm and a dot each',
  handles === 4 && (await showsHandlesOf(1)),
  `${handles}`,
);
const [px1, py1] = await proj((await cps())[1]);
await page.mouse.move(box0.x + px1, box0.y + py1);
await page.mouse.down();
for (let i = 1; i <= 5; i++) await page.mouse.move(box0.x + px1, box0.y + py1 + i * 6);
await page.mouse.up();
await page.waitForTimeout(400);
bent = await drafted();
check(
  'curves: dragging the smooth point keeps both stretches bent',
  bent.length === 2 && bent.every((x) => x.handles && x.coordinates.length > 2),
  JSON.stringify(bent.map((x) => [x.snap, x.coordinates.length, !!x.handles])),
);
// The handle at the smooth point's end of the first stretch, dragged: the
// stretch bends to it and the handle across the point turns to mirror it;
// with Alt it moves alone; a double-click makes the point a corner, and back.
const dotOf = async (seg, end) =>
  (await page.evaluate(() => window.__src('draw-handles')))?.features?.find(
    (f) => f.geometry.type === 'Point' && f.properties.seg === seg && f.properties.end === end,
  )?.geometry.coordinates;
const dragFrom = async (ll, dx, dy, { alt = false } = {}) => {
  const [x, y] = await proj(ll);
  await page.mouse.move(box0.x + x, box0.y + y);
  if (alt) await page.keyboard.down('Alt');
  await page.mouse.down();
  for (let i = 1; i <= 5; i++)
    await page.mouse.move(box0.x + x + (dx * i) / 5, box0.y + y + (dy * i) / 5);
  await page.mouse.up();
  if (alt) await page.keyboard.up('Alt');
  await page.waitForTimeout(300);
};
const smoothAt = (await cps())[1];
/** The sine of the angle between two handles about the point: 0 when they lie on one line through it. */
const across = (h1, h2) => {
  const a = [h1[0] - smoothAt[0], h1[1] - smoothAt[1]];
  const b = [h2[0] - smoothAt[0], h2[1] - smoothAt[1]];
  return Math.abs(a[0] * b[1] - a[1] * b[0]) / (Math.hypot(...a) * Math.hypot(...b));
};
const unbent = await drafted();
await dragFrom(await dotOf(0, 1), -30, -20);
let after = await drafted();
check(
  'curves: a handle dragged bends its stretch, the one across the point mirroring it',
  JSON.stringify(after[0].handles[1]) !== JSON.stringify(unbent[0].handles[1]) &&
    across(after[0].handles[1], after[1].handles[0]) < 0.01 &&
    (await cps()).length === 3,
  JSON.stringify([after[0].handles, after[1].handles]),
);
const partner = after[1].handles[0];
await dragFrom(await dotOf(0, 1), 0, 30, { alt: true });
after = await drafted();
check(
  '  with Alt it moves alone',
  JSON.stringify(after[1].handles[0]) === JSON.stringify(partner) &&
    across(after[0].handles[1], after[1].handles[0]) > 0.05,
);
const [sx, sy] = await proj(smoothAt);
await page.mouse.dblclick(box0.x + sx, box0.y + sy);
await page.waitForTimeout(300);
after = await drafted();
check(
  'curves: a double-click makes the smooth point a corner',
  (await cps()).length === 3 &&
    [after[0].handles?.[1], after[1].handles?.[0]].every(
      (h) => !h || h.every((v, k) => Math.abs(v - smoothAt[k]) <= 1e-6),
    ),
  JSON.stringify([after[0].handles, after[1].handles]),
);
await page.mouse.dblclick(box0.x + sx, box0.y + sy);
await page.waitForTimeout(300);
after = await drafted();
check(
  '  and again smooth, its handles on one line through it',
  after.every((x) => x.handles) && across(after[0].handles[1], after[1].handles[0]) < 0.01,
  JSON.stringify([after[0].handles, after[1].handles]),
);
// The second stretch's line itself, pressed in its middle and dragged: it
// bends through the pointer, its two points staying where they are.
const unpulled = (await drafted())[1];
const middleOf = unpulled.coordinates[unpulled.coordinates.length >> 1];
const pointsBefore = JSON.stringify(await cps());
await dragFrom(middleOf, 0, 40);
const pulled = (await drafted())[1];
const [mx, my] = await proj(middleOf);
const nearest = Math.min(
  ...(await Promise.all(pulled.coordinates.map((c) => proj(c)))).map(([x, y]) =>
    Math.hypot(x - mx, y - (my + 40)),
  ),
);
check(
  'curves: a Draw stretch dragged by its line bends through the pointer, its points staying put',
  JSON.stringify(await cps()) === pointsBefore &&
    JSON.stringify(pulled.coordinates[0]) === JSON.stringify(unpulled.coordinates[0]) &&
    JSON.stringify(pulled.coordinates.at(-1)) === JSON.stringify(unpulled.coordinates.at(-1)) &&
    nearest < 6,
  `the line passes ${nearest.toFixed(1)} px from the pointer`,
);
// A press with no drag is a click, and inserts a point on the curve.
const [ix, iy] = await proj(pulled.coordinates[pulled.coordinates.length >> 2]);
await page.mouse.click(box0.x + ix, box0.y + iy);
await page.waitForTimeout(300);
check(
  'curves: a press on a Draw stretch with no drag still inserts a point',
  (await cps()).length === 4,
);
// Four points now: the smooth one, second, is no longer among the last two.
check(
  'handles: an older point shows none until it is selected',
  !(await showsHandlesOf(1)) && (await handleCount()) > 0,
  `${await handleCount()} handle features`,
);
const [sx1, sy1] = await proj((await cps())[1]);
await page.mouse.click(box0.x + sx1, box0.y + sy1);
await page.waitForTimeout(250);
check('handles: a click on its circle selects it, showing its handles', await showsHandlesOf(1));
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
check('handles: Escape deselects it', !(await showsHandlesOf(1)));
await page.mouse.click(box0.x + sx1, box0.y + sy1);
await page.waitForTimeout(250);
const [fx, fy] = await proj(E);
await page.mouse.click(box0.x + fx + 60, box0.y + fy + 60);
await page.waitForTimeout(250);
check('handles: a click elsewhere on the map deselects it', !(await showsHandlesOf(1)));
await page.keyboard.press('Control+z');
await page.waitForTimeout(250);
await page.mouse.click(box0.x + sx1, box0.y + sy1);
await page.waitForTimeout(250);
// A routed stretch is not held: a drag on it leaves the line as it was.
const handlesInDraw = await handleCount();
await page.getByTestId('snap-draw').getByRole('button', { name: 'Snap' }).click();
await page.waitForTimeout(150);
check(
  'handles: in Snap nothing shows handles, the point still selected',
  handlesInDraw > 0 && (await handleCount()) === 0,
  `${handlesInDraw} in Draw, ${await handleCount()} in Snap`,
);
const [dx0, dy0] = await proj(D);
await page.mouse.move(box0.x + dx0, box0.y + dy0, { steps: 3 });
check('cursor line: none in Snap', (await cursorLine()).length === 0);
await clickAt(D);
await settle();
// The router's answer in, so nothing but the drag could change the line.
for (let i = 0; i < 30 && !(await drafted()).at(-1)?.streets; i++) await page.waitForTimeout(300);
const routedLine = (await drafted()).at(-1);
const segmentsBefore = JSON.stringify(await drafted());
// The middle of one of its pieces: never one of its points, which a drag moves.
const k = Math.max(1, routedLine.coordinates.length >> 1);
const [p0, p1] = [routedLine.coordinates[k - 1], routedLine.coordinates[k]];
await dragFrom([(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], 0, 60);
check(
  'curves: a drag on a routed stretch never bends it',
  routedLine.snap === 'snapped' && JSON.stringify(await drafted()) === segmentsBefore,
  routedLine.snap,
);
await discard();

check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
await b.close();
console.log(
  `\nrouter: ${routerCalls} requests${routerRefused ? `, ${routerRefused} turned away (429/5xx): routing checks above may have failed for that reason` : ''}`,
);
tally();
