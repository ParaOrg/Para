// The app's native location (src/features/contribute/native/): which fixes the page still has to
// take from the native log, which permissions each Android version has, and whose phone is shown Keep Para recording.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/native-fixes-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fixesAfter } from '../../src/features/contribute/recorder/recording-fixes.ts';
import { parseFixLog } from '../../src/features/contribute/native/native-fix-log.ts';
import {
  watchErrorOf,
  watchErrorOfRideProblem,
} from '../../src/features/contribute/native/watch-error.ts';
import {
  brandOf,
  stopsBackgroundApps,
} from '../../src/features/contribute/native/keep-recording-makers.ts';
import { KEEP_RECORDING_STEPS } from '../../src/features/contribute/native/keep-recording-steps.ts';
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

test('Keep Para recording goes to the makers known to stop background apps, by any casing', () => {
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
    'OnePlus',
    ' iqoo ',
  ]) {
    assert.equal(stopsBackgroundApps(maker), true, maker);
  }
  for (const maker of ['google', 'motorola', 'nokia', '']) {
    assert.equal(stopsBackgroundApps(maker), false, maker);
  }
});

test('one fix in the native log that does not read is left out, not the ride', () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    const log = parseFixLog({
      recordingId: 'r1',
      fixes: [
        { time: 1000, lng: 121, lat: 14, accuracyM: 5 },
        { time: 'soon', lng: 121, lat: 14 },
        { time: 3000, lng: 121, lat: 14 },
      ],
    });
    assert.equal(log.recordingId, 'r1');
    assert.deepEqual(times(log.fixes), [1000, 3000]);
    assert.equal(log.fixes[1].coords.accuracy, 1000);
  } finally {
    console.warn = warn;
  }
  assert.throws(() => parseFixLog({ fixes: [] }));
});

test('the plugin refusing because location is switched off is not a denied permission', () => {
  assert.equal(watchErrorOf({ code: 'NOT_AUTHORIZED', message: 'Permission denied.' }).code, 1);
  assert.equal(
    watchErrorOf({ code: 'NOT_AUTHORIZED', message: 'Location services disabled.' }).code,
    2,
  );
  assert.equal(watchErrorOf({ message: 'Service not running.' }).code, 2);
});

test("the ride's service saying it cannot record reads as the browser's denied, else unavailable", () => {
  assert.deepEqual(
    watchErrorOfRideProblem({ code: 'DENIED', message: 'Location permission is missing.' }),
    { code: 1, message: 'Location permission is missing.' },
  );
  assert.equal(
    watchErrorOfRideProblem({ code: 'UNAVAILABLE', message: 'Location services disabled.' }).code,
    2,
  );
});

test("each maker's phones get their group's steps, its company's whole name too", () => {
  const groups = {
    Xiaomi: 'xiaomi',
    POCO: 'xiaomi',
    Redmi: 'xiaomi',
    OPPO: 'oppo',
    realme: 'oppo',
    OnePlus: 'oppo',
    vivo: 'vivo',
    iQOO: 'vivo',
    'INFINIX MOBILITY LIMITED': 'transsion',
    TECNO: 'transsion',
    samsung: 'samsung',
    HUAWEI: 'huawei',
    HONOR: 'huawei',
  };
  for (const [maker, brand] of Object.entries(groups)) {
    assert.equal(brandOf(maker), brand, maker);
    assert.ok(KEEP_RECORDING_STEPS[brand].steps.length > 0, brand);
  }
  for (const maker of ['Google', 'motorola', 'constructor', '']) {
    assert.equal(brandOf(maker), null, maker);
  }
});
