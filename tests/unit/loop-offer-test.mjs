// When the drawing toolbar offers "Close the loop" on a line's own first point
// (src/features/studio/drawing/use-loop-closing.ts): a new route, as drawn or
// after it followed a saved line, may go round and end where it began; one
// drawn up to the end Extend kept ends on that other line, and is never a loop.
// The point offered is a copy, as the drawing finds its points by identity.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/loop-offer-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, createElement as h } from 'react';
import { useLoopClosing } from '../../src/features/studio/drawing/use-loop-closing.ts';

// ------------------------------------------------------------ React in Node
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

const POINTS = [
  [121.05, 14.7],
  [121.06, 14.7],
  [121.06, 14.71],
];

/** The plan useLoopClosing gives for a new route's drawing in this state. */
async function planFor({ borrow, hasJoin }) {
  const draw = {
    drawing: true,
    area: null,
    picking: null,
    start: noop,
    addPoint: noop,
    target: { routeId: null, directionId: null },
    controlPoints: POINTS,
    borrow,
    hasJoin: () => hasJoin,
  };
  const out = {};
  function Probe() {
    out.plan = useLoopClosing(null, draw, null, null, [], []);
    return null;
  }
  const root = createRoot({ ...container });
  await act(async () => root.render(h(Probe)));
  await act(async () => root.unmount());
  return out.plan.loop;
}

test('a new route as drawn may close on its own first point, offered as a copy', async () => {
  const loop = await planFor({ borrow: null, hasJoin: false });
  assert.deepEqual(loop, { closeAt: POINTS[0], other: null });
  assert.notEqual(loop.closeAt, POINTS[0], 'a copy, not the stored point');
});

test('after following a saved line, the drawing may still close on its own first point', async () => {
  // Follow (connect) borrows the line's end, but sets no join: new points go on after it.
  const loop = await planFor({ borrow: { directionId: 'saved', part: 'end' }, hasJoin: false });
  assert.deepEqual(loop, { closeAt: POINTS[0], other: null });
});

test('drawn up to the end Extend kept, the line ends on another and is offered no loop', async () => {
  const loop = await planFor({ borrow: { directionId: 'saved', part: 'end' }, hasJoin: true });
  assert.equal(loop, null);
});
