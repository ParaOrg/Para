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
