// The router's queue (src/features/studio/drawing/router-queue.ts): one
// request a second, first come first served, and a request called off while it
// waits leaves the queue at once. Twelve quick clicks queue eleven requests;
// eleven Undos call them off; the next click's gap waits about one second for
// its turn, not twelve. Under Node's mocked clock, so no test waits for real.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/router-queue-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routerQueue } from '../../src/features/studio/drawing/router-queue.ts';

const GAP_MS = 1000;

/** A turn asked for: whether it has come yet, and its controller to call it off. */
function ask(queue) {
  const controller = new AbortController();
  const turn = { started: false, refused: null, controller };
  turn.done = queue.takeTurn(controller.signal).then(
    () => (turn.started = true),
    (err) => (turn.refused = err),
  );
  return turn;
}

/** Lets the promises a timer settled run. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

test('12 quick clicks, 11 Undos and a click: the last gap waits about one second, not twelve', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const queue = routerQueue(GAP_MS);

  // Twelve clicks, one gap each: the first is sent at once, eleven queue behind it.
  const turns = Array.from({ length: 12 }, () => ask(queue));
  await settle();
  assert.equal(turns[0].started, true, 'the first is sent at once');
  assert.equal(turns.filter((x) => x.started).length, 1);

  // Eleven Undos call off the eleven still waiting: each leaves the queue at once.
  for (const x of turns.slice(1)) x.controller.abort();
  await settle();
  assert.ok(
    turns.slice(1).every((x) => x.refused?.name === 'AbortError'),
    'each called-off turn ends as an abort',
  );

  // One more click a moment later: its turn is the next second, not the twelfth.
  t.mock.timers.tick(100);
  const last = ask(queue);
  await settle();
  assert.equal(last.started, false, 'not before a second has passed since the last request');
  t.mock.timers.tick(GAP_MS - 100);
  await settle();
  assert.equal(last.started, true, 'its turn comes one second after the first request');
});

test('turns are a second apart, in the order asked', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const queue = routerQueue(GAP_MS);
  const turns = [ask(queue), ask(queue), ask(queue)];
  await settle();
  assert.deepEqual(
    turns.map((x) => x.started),
    [true, false, false],
  );
  t.mock.timers.tick(GAP_MS - 1);
  await settle();
  assert.deepEqual(
    turns.map((x) => x.started),
    [true, false, false],
    'not a moment early',
  );
  t.mock.timers.tick(1);
  await settle();
  assert.deepEqual(
    turns.map((x) => x.started),
    [true, true, false],
  );
  t.mock.timers.tick(GAP_MS);
  await settle();
  assert.deepEqual(
    turns.map((x) => x.started),
    [true, true, true],
  );
});

test('a request called off in the middle gives its turn to the one behind it', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const queue = routerQueue(GAP_MS);
  const [first, middle, last] = [ask(queue), ask(queue), ask(queue)];
  await settle();
  middle.controller.abort();
  t.mock.timers.tick(GAP_MS);
  await settle();
  assert.equal(first.started, true);
  assert.equal(middle.started, false);
  assert.equal(last.started, true, 'the last goes in the middle one’s turn');
});

test('a request already called off is refused before it queues', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const queue = routerQueue(GAP_MS);
  const controller = new AbortController();
  controller.abort();
  assert.throws(() => queue.takeTurn(controller.signal), { name: 'AbortError' });
});

test('after a quiet spell the next request is sent at once', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const queue = routerQueue(GAP_MS);
  ask(queue);
  await settle();
  t.mock.timers.tick(5 * GAP_MS);
  const later = ask(queue);
  await settle();
  assert.equal(later.started, true);
});
