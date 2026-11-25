// What the phone's Back closes (src/shared/hooks/use-back-layer.ts): the layer opened last first,
// each with its own close; none left, nothing closed, which is where Back leaves the app.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  closeTopLayer,
  openLayerCount,
  pushBackLayer,
} from '../../src/shared/hooks/use-back-layer.ts';

test('Back closes the layer opened last, then the one under it, then none', () => {
  const closed = [];
  const removals = [];
  for (const name of ['History', 'a ride', 'its delete question']) {
    let remove;
    remove = pushBackLayer(() => {
      closed.push(name);
      remove();
    });
    removals.push(remove);
  }
  assert.equal(openLayerCount(), 3);
  assert.equal(closeTopLayer(), true);
  assert.equal(closeTopLayer(), true);
  assert.equal(closeTopLayer(), true);
  assert.deepEqual(closed, ['its delete question', 'a ride', 'History']);
  assert.equal(closeTopLayer(), false, 'nothing open: Back leaves the app');
  assert.equal(openLayerCount(), 0);
});

test('a layer that closes by its own control leaves the stack, and Back skips it', () => {
  const closed = [];
  const removeSheet = pushBackLayer(() => closed.push('sheet'));
  const removeCard = pushBackLayer(() => closed.push('card'));
  removeCard();
  assert.equal(closeTopLayer(), true);
  assert.deepEqual(closed, ['sheet']);
  removeSheet();
  removeSheet();
  assert.equal(openLayerCount(), 0, 'a second removal changes nothing');
});

test('a layer kept open by its close (a typed note, an answer under way) stays on top', () => {
  let presses = 0;
  const remove = pushBackLayer(() => {
    presses += 1;
  });
  assert.equal(closeTopLayer(), true);
  assert.equal(closeTopLayer(), true);
  assert.equal(presses, 2);
  assert.equal(openLayerCount(), 1, 'Back never takes it away behind its back');
  remove();
});
