// SWITCH and a trip's pick (src/features/routes/map/ride-to.ts, useRideTo's
// carryTo): on a jeep, the picked hintuan goes with the trip to the other
// way round, landing where HintuanCard's SWITCH would (boxTheOtherWay), and a
// picked end follows its place; on a train, SWITCH lets the picks go; a new
// trip starts whole either way (the owner, 2026-10-15: "trains reset, jeeps
// keep"). The hook is read through Vite (map-view.tsx, which it takes
// APP_MOVE from, is TSX and MapLibre's, so a stub stands in for it) and
// mounted with no map: what is asked here is the pick, not the camera.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/switch-pick-test.mjs
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { act, createElement as h } from 'react';
import { createServer } from 'vite';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.window ??= globalThis;
globalThis.HTMLIFrameElement ??= class {};
const noop = () => {};
const container = {
  nodeType: 1,
  nodeName: 'DIV',
  tagName: 'DIV',
  namespaceURI: 'http://www.w3.org/1999/xhtml',
  addEventListener: noop,
  removeEventListener: noop,
};
const doc = {
  nodeType: 9,
  addEventListener: noop,
  removeEventListener: noop,
  defaultView: globalThis,
  documentElement: container,
  body: container,
  activeElement: null,
};
container.ownerDocument = doc;
globalThis.document ??= doc;
const { createRoot } = await import('react-dom/client');

const vite = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('../..', import.meta.url)),
  resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
  plugins: [
    {
      name: 'map-view-stub',
      enforce: 'pre',
      load: (id) =>
        id.endsWith('/features/routes/map/map-view.tsx')
          ? 'export const APP_MOVE = { appMove: true };'
          : null,
    },
  ],
  logLevel: 'silent',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, watch: null, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
});
after(() => vite.close());
const { useRideTo } = await vite.ssrLoadModule('/src/features/routes/map/ride-to.ts');

let n = 0;
/** A hintuan box of the place people call `informal`, at [lng, 14.7]. */
const box = (name, lng, informal) => ({
  id: `s${n++}`,
  kind: 'hintuan',
  name,
  informal,
  aliases: [],
  point: { type: 'Point', coordinates: [lng, 14.7] },
  createdAt: `2026-10-15T00:00:0${n % 10}Z`,
});

/** A direction with no line drawn: enough for the pick, which is all this asks. */
const direction = (id, name, routeCode = null, reversed = false) => ({
  id,
  name,
  reversed,
  shape: null,
  route: { name: name.replace(' → ', ' – '), routeCode },
});

/** Mounts the hook on `selected`; `out.ride` is what it last handed back. */
async function mount(selected, hotspots) {
  const out = {};
  function Probe(props) {
    out.ride = useRideTo(null, props.selected, props.hotspots);
    return null;
  }
  const root = createRoot({ ...container });
  const show = (v) => act(async () => root.render(h(Probe, { selected: v, hotspots })));
  await show(selected);
  return { out, show, root };
}

const lagro1 = box('Lagro 1', 121.0, 'Lagro');
const lagro2 = box('Lagro 2', 121.0003, 'Lagro');
const across = box('Bestlink', 121.01, 'Bestlink');
const hotspots = [lagro1, lagro2, across];
const passing =
  (...boxes) =>
  (id) =>
    boxes.some((b) => b.id === id);

const there = direction('there', 'Tala → SM Fairview');
const back = direction('back', 'SM Fairview → Tala', null, true);

test('a jeep’s SWITCH keeps a hintuan the other way passes too', async () => {
  const { out, show, root } = await mount(there, hotspots);
  await act(async () => out.ride.pick(across.id));
  assert.equal(out.ride.pickedId, across.id);
  await act(async () => out.ride.carryTo(back, passing(across, lagro2)));
  await show(back);
  assert.equal(out.ride.pickedId, across.id);
  root.unmount();
});

test('…and lands on its place’s box across the road when the other way misses this one', async () => {
  const { out, show, root } = await mount(there, hotspots);
  await act(async () => out.ride.pick(lagro1.id));
  await act(async () => out.ride.carryTo(back, passing(lagro2)));
  await show(back);
  assert.equal(out.ride.pickedId, lagro2.id);
  root.unmount();
});

test('…and turns whole when the other way passes no box of the place', async () => {
  const { out, show, root } = await mount(there, hotspots);
  await act(async () => out.ride.pick(lagro1.id));
  await act(async () => out.ride.carryTo(back, passing(across)));
  await show(back);
  assert.equal(out.ride.pickedId, null);
  root.unmount();
});

test('a picked end follows its place: where the trip went is where the way back leaves', async () => {
  const { out, show, root } = await mount(there, hotspots);
  await act(async () => out.ride.toEnd('to'));
  assert.equal(out.ride.endPicked, 'to');
  await act(async () => out.ride.carryTo(back, passing()));
  await show(back);
  assert.equal(out.ride.endPicked, 'from');
  assert.equal(out.ride.pickedId, null);
  root.unmount();
});

test('a train’s SWITCH lets the pick go: trains reset', async () => {
  const north = direction('north', 'Taft Avenue → North Avenue', 'MRT-3', true);
  const south = direction('south', 'North Avenue → Taft Avenue', 'MRT-3');
  const { out, show, root } = await mount(south, hotspots);
  await act(async () => out.ride.pick(across.id));
  await act(async () => out.ride.carryTo(north, passing(across)));
  await show(north);
  assert.equal(out.ride.pickedId, null);
  root.unmount();
});

test('another trip opened, with no SWITCH, starts whole as before', async () => {
  const other = direction('other', 'Novaliches → Tala');
  const { out, show, root } = await mount(there, hotspots);
  await act(async () => out.ride.pick(across.id));
  await show(other);
  assert.equal(out.ride.pickedId, null);
  await show(there);
  assert.equal(out.ride.pickedId, null, 'and coming back finds it whole too');
  root.unmount();
});

// A ride's start (the owner's TimelineRouteDetail, 2026-10-15): Set as start
// makes the picked hintuan the start, × Remove as start lets it go, and
// SWITCH treats it as it treats the end: a jeep's goes with the trip, a
// train's resets. A jeep's start and end both picked swap on SWITCH, the
// ride back (the owner, 2026-10-16).

test('Set as start: the picked hintuan becomes the start, and no end is picked', async () => {
  const { out, root } = await mount(there, hotspots);
  await act(async () => out.ride.pick(lagro1.id));
  await act(async () => out.ride.setStart());
  assert.equal(out.ride.startId, lagro1.id);
  assert.equal(out.ride.pickedId, null);
  await act(async () => out.ride.pick(across.id));
  assert.equal(out.ride.startId, lagro1.id, 'a row tapped after is the end');
  assert.equal(out.ride.pickedId, across.id);
  await act(async () => out.ride.removeStart());
  assert.equal(out.ride.startId, null);
  assert.equal(out.ride.pickedId, across.id, 'the end stays');
  root.unmount();
});

test('the start’s row tapped again lets the start go, as × Remove as start does', async () => {
  const { out, root } = await mount(there, hotspots);
  await act(async () => out.ride.pick(lagro1.id));
  await act(async () => out.ride.setStart());
  await act(async () => out.ride.pick(lagro1.id));
  assert.equal(out.ride.startId, null);
  assert.equal(out.ride.pickedId, null);
  root.unmount();
});

test('an end row tapped lets the start go too: the whole ride again', async () => {
  const { out, root } = await mount(there, hotspots);
  await act(async () => out.ride.pick(lagro1.id));
  await act(async () => out.ride.setStart());
  await act(async () => out.ride.toEnd('to'));
  assert.equal(out.ride.startId, null);
  assert.equal(out.ride.endPicked, 'to');
  root.unmount();
});

test('a jeep’s SWITCH with a start and an end swaps them: the ride back, each on a box the other way passes', async () => {
  const { out, show, root } = await mount(there, hotspots);
  await act(async () => out.ride.pick(lagro1.id));
  await act(async () => out.ride.setStart());
  await act(async () => out.ride.pick(across.id));
  await act(async () => out.ride.carryTo(back, passing(lagro2, across)));
  await show(back);
  assert.equal(out.ride.startId, across.id, 'the way back starts where the ride ended');
  assert.equal(out.ride.pickedId, lagro2.id, 'and ends at the start’s place, across the road');
  root.unmount();
});

test('…and a pick the other way passes no box of is let go: the start alone stays, no ride yet', async () => {
  const { out, show, root } = await mount(there, hotspots);
  await act(async () => out.ride.pick(lagro1.id));
  await act(async () => out.ride.setStart());
  await act(async () => out.ride.pick(across.id));
  await act(async () => out.ride.carryTo(back, passing(across)));
  await show(back);
  assert.equal(out.ride.startId, across.id);
  assert.equal(out.ride.pickedId, null, 'Lagro, passed by neither of its boxes, goes');
  root.unmount();
});

test('a jeep’s SWITCH keeps a start alone a start, on its place’s box the other way passes', async () => {
  const { out, show, root } = await mount(there, hotspots);
  await act(async () => out.ride.pick(lagro1.id));
  await act(async () => out.ride.setStart());
  await act(async () => out.ride.carryTo(back, passing(lagro2)));
  await show(back);
  assert.equal(out.ride.startId, lagro2.id);
  assert.equal(out.ride.pickedId, null);
  root.unmount();
});

test('a train’s SWITCH lets the start go with the end', async () => {
  const north = direction('north', 'Taft Avenue → North Avenue', 'MRT-3', true);
  const south = direction('south', 'North Avenue → Taft Avenue', 'MRT-3');
  const { out, show, root } = await mount(south, hotspots);
  await act(async () => out.ride.pick(lagro1.id));
  await act(async () => out.ride.setStart());
  await act(async () => out.ride.pick(across.id));
  await act(async () => out.ride.carryTo(north, passing(lagro1, across)));
  await show(north);
  assert.equal(out.ride.startId, null);
  assert.equal(out.ride.pickedId, null);
  root.unmount();
});

// The ride itself, on lines: from the start to the end, the line outside it
// pale; a row above the start made the start (the owner, 2026-10-16).
const pt = (lng) => ({ type: 'Point', coordinates: [lng, 0] });
const ringAt = (lng, r = 0.0002) => ({
  type: 'Polygon',
  coordinates: [
    [
      [lng - r, -r],
      [lng + r, -r],
      [lng + r, r],
      [lng - r, r],
      [lng - r, -r],
    ],
  ],
});
const stop = (id, lng, informal) => ({
  ...box(informal, lng, informal),
  id,
  point: pt(lng),
  area: ringAt(lng),
});
const lined = [
  { id: 'head', kind: 'terminal', name: 'Head', informal: null, aliases: [], point: pt(0) },
  { id: 'tail', kind: 'terminal', name: 'Tail', informal: null, aliases: [], point: pt(0.04) },
  stop('a', 0.01, 'Amparo'),
  stop('b', 0.02, 'Bestlink'),
  stop('c', 0.03, 'Camarin'),
];
const LINE = [
  [0, 0],
  [0.01, 0],
  [0.02, 0],
  [0.03, 0],
  [0.04, 0],
];
const withLine = (id, coordinates, reversed) => ({
  id,
  routeId: 'r',
  name: null,
  reversed,
  shape: { type: 'LineString', coordinates },
  route: { name: 'Head – Tail', routeCode: null, headHotspotId: 'head', tailHotspotId: 'tail' },
});
const out1 = withLine('out', LINE, false);

/** Mounts the hook on `selected`, on its line through Amparo, Bestlink and Camarin. */
async function mountLined(selected) {
  const out = {};
  function Probe(props) {
    out.ride = useRideTo(null, props.selected, lined);
    return null;
  }
  const root = createRoot({ ...container });
  const show = (next) => act(async () => root.render(h(Probe, { selected: next })));
  await show(selected);
  return { out, root, show };
}

test('a start and an end: the ride between them, the line on either side pale', async () => {
  const { out, root } = await mountLined(out1);
  await act(async () => out.ride.pick('a'));
  await act(async () => out.ride.setStart());
  await act(async () => out.ride.pick('c'));
  assert.equal(out.ride.ridden.directionId, 'out');
  assert.equal(out.ride.ridden.pale.length, 2, 'before the start and after the end');
  assert.ok(Math.abs(out.ride.rideTo.metres - 2226) < 40, `${out.ride.rideTo.metres}`);
  assert.deepEqual(out.ride.startPinAt, out.ride.ridden.line[0]);
  assert.deepEqual(out.ride.pinAt, out.ride.ridden.line.at(-1));
  root.unmount();
});

test('a start alone is no ride yet: the trip whole, nothing pale, its circle where the line passes it', async () => {
  const { out, root } = await mountLined(out1);
  await act(async () => out.ride.pick('b'));
  await act(async () => out.ride.setStart());
  assert.equal(out.ride.startId, 'b');
  assert.equal(out.ride.rideTo, null, 'the tiles the whole trip’s (the owner, 2026-10-16)');
  assert.equal(out.ride.ridden, null, 'the map’s line whole, nothing pale');
  assert.ok(out.ride.startPinAt, 'its circle on the map');
  await act(async () => out.ride.pick('c'));
  assert.ok(out.ride.ridden, 'an end picked: the ride, Variant4');
  root.unmount();
});

test('a row above the start becomes the start, the start the end: the ride follows the trip’s arrows', async () => {
  // The owner, 2026-10-16: "it should follow the arrow … so users can study
  // the route, fare without changing to southbound and north bound".
  const { out, root } = await mountLined(out1);
  await act(async () => out.ride.pick('c'));
  await act(async () => out.ride.setStart());
  await act(async () => out.ride.pick('a'));
  assert.equal(out.ride.startId, 'a', 'Amparo, tapped above Camarin, is the start');
  assert.equal(out.ride.pickedId, 'c', 'and Camarin the end');
  assert.equal(out.ride.ridden.directionId, 'out', 'on the trip’s own line');
  const ride = out.ride.ridden.line;
  assert.ok(ride[0][0] < ride.at(-1)[0], 'from Amparo on to Camarin, the way the trip runs');
  assert.ok(Math.abs(out.ride.rideTo.metres - 2226) < 40, `${out.ride.rideTo.metres}`);
  // With an end already picked, Bestlink the start and Camarin the end:
  // Amparo tapped is the start, and Bestlink the end, as any tap picks the
  // ride's other end.
  await act(async () => out.ride.removeStart());
  await act(async () => out.ride.pick('b'));
  await act(async () => out.ride.setStart());
  await act(async () => out.ride.pick('c'));
  assert.deepEqual([out.ride.startId, out.ride.pickedId], ['b', 'c']);
  await act(async () => out.ride.pick('a'));
  assert.deepEqual([out.ride.startId, out.ride.pickedId], ['a', 'b']);
  root.unmount();
});

test('a jeep’s SWITCH back by other streets, reaching the start’s place first: it stays the start, the ride following the arrows', async () => {
  // The way back loops round and reaches Amparo before Bestlink, the
  // opposite of the swap's order (the owner, 2026-10-16: the ride follows
  // the trip's arrows).
  const loop = withLine(
    'in',
    [
      [0.04, 0],
      [0.04, 0.01],
      [0.01, 0.01],
      [0.01, 0],
      [0.02, 0],
      [0.02, -0.01],
      [0, -0.01],
      [0, 0],
    ],
    true,
  );
  const { out, root, show } = await mountLined(out1);
  await act(async () => out.ride.pick('a'));
  await act(async () => out.ride.setStart());
  await act(async () => out.ride.pick('b'));
  await act(async () => out.ride.carryTo(loop, () => true));
  await show(loop);
  assert.deepEqual(
    [out.ride.startId, out.ride.pickedId],
    ['a', 'b'],
    'Amparo, reached first, starts',
  );
  assert.ok(out.ride.ridden, 'a ride along the way back, priced');
  root.unmount();
});
