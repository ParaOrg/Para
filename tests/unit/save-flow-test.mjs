// The studio's save flow (src/features/studio/panels/use-save-flow.ts): a save
// panel belongs to a drawing, so a drawing that ends with the panel open
// closes it, and the next drawing starts without one.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/save-flow-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, createElement as h } from 'react';
import { useSaveFlow } from '../../src/features/studio/panels/use-save-flow.ts';

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

test('a drawing that ends with its save panel open closes the panel; the next one starts without it', async () => {
  const seen = {};
  function Probe({ isDrawing }) {
    const flow = useSaveFlow({
      isDrawing,
      recoveryError: null,
      cancelDrawing: noop,
      reloadRoutes: noop,
      reloadHotspots: noop,
    });
    seen.isSaving = flow.isSaving;
    seen.setIsSaving = flow.setIsSaving;
    return null;
  }
  const root = createRoot({ ...container });
  await act(async () => root.render(h(Probe, { isDrawing: true })));
  await act(async () => seen.setIsSaving(true));
  assert.equal(seen.isSaving, true, 'Done opens the panel');
  // The toolbar's Cancel, reached behind the panel: the drawing ends.
  await act(async () => root.render(h(Probe, { isDrawing: false })));
  assert.equal(seen.isSaving, false, 'the panel closes with the drawing');
  await act(async () => root.render(h(Probe, { isDrawing: true })));
  assert.equal(seen.isSaving, false, 'a new drawing does not open on the save form');
  await act(async () => root.unmount());
});
