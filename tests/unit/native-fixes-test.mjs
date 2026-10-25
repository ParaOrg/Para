// The app's native location (src/features/contribute/native/): which fixes the page still has to
// take from the native log, how a batch is cut where the ride came back to its start, which
// permissions each Android version has, and whose battery help applies.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/native-fixes-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { firstCountWhere, fixesAfter } from '../../src/features/contribute/recording-fixes.ts';
import { batteryHelpFor } from '../../src/features/contribute/native/battery-steps.ts';
import {
  canRecordWithout,
  firstMissing,
  neededPermissions,
} from '../../src/features/contribute/native/permission-steps.ts';

const fix = (timestamp) => ({ timestamp, coords: { longitude: 121, latitude: 14, accuracy: 5 } });
const times = (fixes) => fixes.map((f) => f.timestamp);

test('the page takes only the fixes after the last one it holds', () => {
  const log = [fix(1000), fix(2000), fix(3000)];
  assert.deepEqual(times(fixesAfter(log, null)), [1000, 2000, 3000]);
  assert.deepEqual(times(fixesAfter(log, 2000)), [3000]);
  assert.deepEqual(times(fixesAfter(log, 3000)), []);
});

test('a log read twice, or the same fix delivered live and from the log, adds nothing', () => {
  const log = [fix(1000), fix(2000)];
  const held = times(fixesAfter(log, null));
  assert.deepEqual(times(fixesAfter(log, held[held.length - 1])), []);
  assert.deepEqual(times(fixesAfter([fix(2000), fix(2000), fix(2500)], 1000)), [2000, 2500]);
});

test('fixes come out in time order, and the input is not changed', () => {
  const log = [fix(3000), fix(1000), fix(2000)];
  assert.deepEqual(times(fixesAfter(log, null)), [1000, 2000, 3000]);
  assert.deepEqual(times(log), [3000, 1000, 2000]);
});

test('a batch is cut at the first fix where the rule holds, in a few runs of the rule', () => {
  const items = Array.from({ length: 1200 }, (_, index) => index);
  let runs = 0;
  const isDone = (taken) => {
    runs += 1;
    return taken.length >= 700;
  };
  assert.equal(firstCountWhere(items, isDone), 700);
  assert.ok(runs <= 12, `ran the rule ${runs} times`);
  assert.equal(
    firstCountWhere(items, (taken) => taken.length >= 1),
    1,
  );
  assert.equal(
    firstCountWhere(items, () => false),
    null,
  );
  assert.equal(
    firstCountWhere([], () => false),
    null,
  );
});

test('each Android version is asked for the permissions it has, in order', () => {
  assert.deepEqual(neededPermissions(36), ['notifications', 'location', 'backgroundLocation']);
  assert.deepEqual(neededPermissions(33), ['notifications', 'location', 'backgroundLocation']);
  assert.deepEqual(neededPermissions(32), ['location', 'backgroundLocation']);
  assert.deepEqual(neededPermissions(29), ['location', 'backgroundLocation']);
  assert.deepEqual(neededPermissions(28), ['location']);
});

test('the first permission not granted is asked next, and only location is a must', () => {
  const needed = ['notifications', 'location', 'backgroundLocation'];
  const states = { notifications: 'granted', location: 'prompt', backgroundLocation: 'prompt' };
  assert.equal(firstMissing(states, needed), 'location');
  assert.equal(firstMissing({ ...states, location: 'granted' }, needed), 'backgroundLocation');
  assert.equal(
    firstMissing({ ...states, location: 'granted', backgroundLocation: 'granted' }, needed),
    null,
  );
  assert.equal(firstMissing({ ...states, notifications: 'denied' }, needed), 'notifications');
  assert.equal(canRecordWithout('location'), false);
  assert.equal(canRecordWithout('notifications'), true);
  assert.equal(canRecordWithout('backgroundLocation'), true);
});

test('battery help goes to the makers known to stop background apps, by any casing', () => {
  for (const maker of [
    'xiaomi',
    'Xiaomi',
    'redmi',
    'poco',
    'oppo',
    'realme',
    'vivo',
    'samsung',
    'HUAWEI',
    'honor',
  ]) {
    assert.ok(batteryHelpFor(maker)?.steps, maker);
  }
  for (const maker of ['google', 'motorola', 'nokia', '']) {
    assert.equal(batteryHelpFor(maker), null, maker);
  }
});
