// How the app's live fixes and its native fix log reach the recorder
// (src/features/contribute/native/fix-catch-up.ts): the log is read for the fixes after the last one
// handed on, so a wake or a silence late in a long ride sends only the missing stretch; and what
// the plugin is asked for (native-fix-log.ts fixLogReadOptions).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/fix-catch-up-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createFixCatchUp, GAP_MS } from '../../src/features/contribute/native/fix-catch-up.ts';
import { fixLogReadOptions } from '../../src/features/contribute/native/native-fix-log.ts';

const fix = (timestamp) => ({ timestamp, coords: { longitude: 121, latitude: 14, accuracy: 5 } });
const times = (fixes) => fixes.map((f) => f.timestamp);
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A stand-in for the native log: records each read's `after`, and answers when told to. */
function fakeLog(logged) {
  const reads = [];
  let answer = null;
  const readAfter = (after) =>
    new Promise((resolve) => {
      reads.push(after);
      answer = () => resolve(logged.filter((f) => after === null || f.timestamp > after));
    });
  return { reads, readAfter, answer: () => answer?.() };
}

function recorder() {
  const batches = [];
  return { batches, onFixes: (fixes) => batches.push(times(fixes)) };
}

test('the first read asks for the whole log', async () => {
  const log = fakeLog([fix(1000), fix(2000)]);
  const { batches, onFixes } = recorder();
  const { readLog } = createFixCatchUp(log.readAfter, onFixes);
  readLog();
  log.answer();
  await settle();
  assert.deepEqual(log.reads, [null]);
  assert.deepEqual(batches, [[1000, 2000]]);
});

test('a live fix after a silence reads only the fixes after the last one handed on', async () => {
  const slept = [fix(10_000), fix(11_000), fix(12_000), fix(13_000)];
  const log = fakeLog([fix(1000), fix(2000), ...slept]);
  const { batches, onFixes } = recorder();
  const { handleLive } = createFixCatchUp(log.readAfter, onFixes);
  handleLive(fix(1000));
  handleLive(fix(2000));
  // The page slept: the next live fix is far past the last, so the log fills the gap first.
  handleLive(fix(2000 + GAP_MS + 12_000));
  log.answer();
  await settle();
  assert.deepEqual(log.reads, [2000]);
  assert.deepEqual(batches, [[1000], [2000], [10_000, 11_000, 12_000, 13_000, 19_000]]);
});

test('live fixes during a read wait and go out after the log, and a read is not doubled', async () => {
  const log = fakeLog([fix(1000), fix(2000), fix(3000)]);
  const { batches, onFixes } = recorder();
  const { readLog, handleLive } = createFixCatchUp(log.readAfter, onFixes);
  handleLive(fix(1000));
  readLog();
  handleLive(fix(4000));
  readLog();
  log.answer();
  await settle();
  assert.deepEqual(log.reads, [1000]);
  assert.deepEqual(batches, [[1000], [2000, 3000, 4000]]);
});

test('a wake reads after the latest fix handed on, live or from the log', async () => {
  const log = fakeLog([fix(1000), fix(2000), fix(3000)]);
  const { onFixes } = recorder();
  const { readLog, handleLive } = createFixCatchUp(log.readAfter, onFixes);
  readLog();
  log.answer();
  await settle();
  handleLive(fix(4000));
  readLog();
  assert.deepEqual(log.reads, [null, 4000]);
});

test('a log that cannot be read still lets the waiting live fixes through', async () => {
  const { batches, onFixes } = recorder();
  const failing = () => Promise.reject(new Error('no log'));
  const { handleLive } = createFixCatchUp(failing, onFixes);
  const originalError = console.error;
  console.error = () => undefined;
  try {
    handleLive(fix(1000));
    handleLive(fix(1000 + GAP_MS + 1000));
    await settle();
  } finally {
    console.error = originalError;
  }
  assert.deepEqual(batches, [[1000], [7000]]);
});

test('the plugin is asked for the whole log, or for whole milliseconds after a time', () => {
  assert.deepEqual(fixLogReadOptions(null), {});
  assert.deepEqual(fixLogReadOptions(1_761_500_000_000), { after: 1_761_500_000_000 });
  assert.deepEqual(fixLogReadOptions(1_761_500_000_000.7), { after: 1_761_500_000_000 });
});
