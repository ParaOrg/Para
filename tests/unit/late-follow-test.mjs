// A followed line read after the drawing moved on is not joined
// (src/features/studio/drawing/use-line-borrowing.ts, connect): the line is
// read from the database between the right-click (or Follow) and the join, and
// meanwhile the editor may add points, undo, cancel or start another drawing.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/late-follow-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, createElement as h } from 'react';
import { useLineBorrowing } from '../../src/features/studio/drawing/use-line-borrowing.ts';

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

// A saved line running north, and a drawing that comes to it from the west.
const SAVED = [
  [121.05, 14.7],
  [121.05, 14.705],
  [121.05, 14.71],
];
const savedLine = {
  id: 'saved',
  controlPoints: [SAVED[0], SAVED[2]],
  segments: [{ snap: 'snapped', coordinates: SAVED }],
};
const AT = [121.05, 14.703];

async function borrowing() {
  const refs = {
    points: {
      current: [
        [121.04, 14.7],
        [121.045, 14.702],
      ],
    },
    segments: {
      current: [
        {
          snap: 'snapped',
          coordinates: [
            [121.04, 14.7],
            [121.045, 14.702],
          ],
        },
      ],
    },
    area: { current: null },
    picking: { current: null },
    join: { current: null },
    borrow: { current: null },
    connected: { current: null },
    freehand: { current: false },
  };
  const written = [];
  const actions = {
    writePoints: (pts) => {
      refs.points.current = pts;
      written.push(pts);
    },
    writeSegments: (segs) => {
      refs.segments.current = segs;
    },
    resolveGaps: async () => {},
    setBorrow: noop,
    setPicking: noop,
  };
  const out = {};
  function Probe() {
    Object.assign(out, useLineBorrowing(refs, actions));
    return null;
  }
  const root = createRoot({ ...container });
  await act(async () => root.render(h(Probe)));
  return { ...out, refs, actions, written, unmount: () => act(async () => root.unmount()) };
}

test('a line that arrives while the drawing is as it was is joined', async () => {
  const b = await borrowing();
  const gate = b.joinGate();
  assert.equal(gate.go, true);
  assert.equal(b.connect(savedLine, AT, false, gate.points), null);
  assert.equal(b.written.length, 1, 'the join is written');
  assert.deepEqual(b.refs.borrow.current, { directionId: 'saved', part: 'end' }, 'held at once');
  await b.unmount();
});

test('a line that arrives after the drawing changed is not joined, and nothing is said', async () => {
  const b = await borrowing();
  const gate = b.joinGate();
  // A click while the line was on its way.
  b.actions.writePoints([...b.refs.points.current, [121.047, 14.703]]);
  const before = b.refs.points.current;
  assert.equal(b.connect(savedLine, AT, false, gate.points), null);
  assert.equal(b.refs.points.current, before, 'the drawing is left as it is');
  assert.equal(b.refs.borrow.current, null);
  await b.unmount();
});

test('after ✕ and a new drawing, the old line is not joined to it', async () => {
  const b = await borrowing();
  const gate = b.joinGate();
  b.actions.writePoints([]);
  b.actions.writePoints([[121.06, 14.72]]);
  const before = b.refs.points.current;
  assert.equal(b.connect(savedLine, AT, false, gate.points), null);
  assert.equal(b.refs.points.current, before);
  await b.unmount();
});

test('a second line arriving before the next commit meets the one-join rule', async () => {
  const b = await borrowing();
  const gate = b.joinGate();
  assert.equal(b.connect(savedLine, AT, false, gate.points), null);
  const again = b.joinGate();
  assert.equal(again.go, false);
  assert.match(again.problem, /already follows part of another line/);
  await b.unmount();
});
