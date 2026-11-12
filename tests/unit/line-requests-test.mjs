// A direction's full line, asked for under one load of the routes
// (src/features/routes/map/line-requests.ts): its answer is kept only while that load is still
// the latest. The studio reloads the routes after a save; a line read for the load before must
// not come back onto the map after it, nor mark the new load's request as failed.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/line-requests-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { requestLine } from '../../src/features/routes/map/line-requests.ts';

const LINE = {
  type: 'LineString',
  coordinates: [
    [121, 14.6],
    [121.01, 14.61],
  ],
};
/** A read that answers when told to. */
const pending = () => {
  let answer;
  let fail;
  const read = new Promise((resolve, reject) => {
    answer = resolve;
    fail = reject;
  });
  return { load: () => read, answer, fail };
};
const books = () => ({ requested: new Set(), failed: new Set() });
const settled = () => new Promise((resolve) => setImmediate(resolve));

test('a line that arrives while its load is the latest is kept', async () => {
  const b = books();
  const kept = [];
  const read = pending();
  requestLine(
    'd1',
    read.load,
    b,
    () => true,
    (line) => kept.push(line),
  );
  assert.deepEqual([...b.requested], ['d1'], 'asked once: marked as asked at once');
  read.answer(LINE);
  await settled();
  assert.deepEqual(kept, [LINE]);
});

test('a line that arrives after a reload is not put back on the map', async () => {
  const b = books();
  const kept = [];
  const read = pending();
  let latest = 1;
  const asked = latest;
  requestLine(
    'd1',
    read.load,
    b,
    () => asked === latest,
    (line) => kept.push(line),
  );
  // The reload: a later load, the books cleared with the lines.
  latest = 2;
  b.requested.clear();
  read.answer(LINE);
  await settled();
  assert.deepEqual(kept, [], "the earlier load's line is dropped");
});

test("a read that fails after a reload leaves the new load's books alone", async () => {
  const b = books();
  const read = pending();
  let latest = 1;
  const asked = latest;
  requestLine(
    'd1',
    read.load,
    b,
    () => asked === latest,
    () => {},
  );
  latest = 2;
  b.requested.clear();
  // The new load asks for the same direction; its read is still out.
  b.requested.add('d1');
  read.fail(new Error('offline'));
  await settled();
  assert.deepEqual([...b.requested], ['d1'], 'still asked under the new load');
  assert.deepEqual([...b.failed], [], 'and not marked as failed');
});

test('a read that fails under the latest load may be asked again, and is marked failed', async () => {
  const b = books();
  b.failed.add('d1');
  const read = pending();
  requestLine(
    'd1',
    read.load,
    b,
    () => true,
    () => {},
  );
  assert.deepEqual([...b.failed], [], 'asking again clears the mark');
  read.fail(new Error('offline'));
  await settled();
  assert.deepEqual([...b.requested], []);
  assert.deepEqual([...b.failed], ['d1']);
});

test('a direction with no line file is kept as nothing', async () => {
  const kept = [];
  const read = pending();
  requestLine(
    'slot',
    read.load,
    books(),
    () => true,
    (line) => kept.push(line),
  );
  read.answer(null);
  await settled();
  assert.deepEqual(kept, []);
});
