// The permissions screen's rules (src/features/contribute/native/permission-rows.ts): which rows a
// phone shows, what each switch says, and when Continue shows.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  askRow,
  canContinue,
  needsPermissionsScreen,
  permissionRows,
  permissionsOfRow,
  rowState,
} from '../../src/features/contribute/native/permission-rows.ts';
import { neededPermissions } from '../../src/features/contribute/native/permission-steps.ts';

const ANDROID_14 = neededPermissions(34);
const ANDROID_11 = neededPermissions(30);
const ANDROID_9 = neededPermissions(28);
const NONE = new Set();
const ASKED = { notifications: 'prompt', location: 'prompt', backgroundLocation: 'prompt' };
const ALL = { notifications: 'granted', location: 'granted', backgroundLocation: 'granted' };

test('Notification shows only where Android has the permission; Location always', () => {
  assert.deepEqual(permissionRows(ANDROID_14), ['notification', 'location']);
  assert.deepEqual(permissionRows(ANDROID_11), ['location']);
  assert.deepEqual(permissionRows(ANDROID_9), ['location']);
});

test('the Location switch carries "all the time" from Android 10, after location itself', () => {
  assert.deepEqual(permissionsOfRow('location', ANDROID_14), ['location', 'backgroundLocation']);
  assert.deepEqual(permissionsOfRow('location', ANDROID_9), ['location']);
});

test('a switch is on once all its permissions are granted, and not before', () => {
  assert.equal(rowState('notification', ALL, ANDROID_14, NONE), 'on');
  assert.equal(rowState('location', ALL, ANDROID_14, NONE), 'on');
  const foregroundOnly = { ...ASKED, location: 'granted' };
  assert.equal(rowState('location', foregroundOnly, ANDROID_14, NONE), 'rest');
  assert.equal(rowState('location', foregroundOnly, ANDROID_9, NONE), 'on');
});

test('a switch is refused once said no to here, or when Android will not ask again', () => {
  assert.equal(rowState('notification', ASKED, ANDROID_14, new Set(['notification'])), 'error');
  assert.equal(rowState('location', ASKED, ANDROID_14, new Set(['notification'])), 'rest');
  const denied = { ...ASKED, notifications: 'denied' };
  assert.equal(rowState('notification', denied, ANDROID_14, NONE), 'error');
  const rationale = { ...ASKED, notifications: 'prompt-with-rationale' };
  assert.equal(rowState('notification', rationale, ANDROID_14, NONE), 'rest');
});

test('a refused switch fixed in Settings shows as on', () => {
  assert.equal(rowState('notification', ALL, ANDROID_14, new Set(['notification'])), 'on');
});

test('Continue waits for an answer on every row and for location itself', () => {
  assert.equal(canContinue(ASKED, ANDROID_14, NONE), false);
  assert.equal(canContinue({ ...ALL, notifications: 'prompt' }, ANDROID_14, NONE), false);
  assert.equal(canContinue(ALL, ANDROID_14, NONE), true);
});

test('a refused notification or "all the time" does not trap anyone; refused location does', () => {
  const noNotice = { ...ALL, notifications: 'prompt-with-rationale' };
  assert.equal(canContinue(noNotice, ANDROID_14, new Set(['notification'])), true);
  const noAllTheTime = { ...ALL, backgroundLocation: 'denied' };
  assert.equal(rowState('location', noAllTheTime, ANDROID_14, NONE), 'error');
  assert.equal(canContinue(noAllTheTime, ANDROID_14, NONE), true);
  const noLocation = { ...ALL, location: 'denied', backgroundLocation: 'prompt' };
  assert.equal(canContinue(noLocation, ANDROID_14, new Set(['location'])), false);
});

test('the screen shows only when a needed permission is not granted yet', () => {
  assert.equal(needsPermissionsScreen(ALL, ANDROID_14), false);
  assert.equal(needsPermissionsScreen({ ...ALL, notifications: 'denied' }, ANDROID_11), false);
  assert.equal(needsPermissionsScreen({ ...ALL, backgroundLocation: 'prompt' }, ANDROID_14), true);
});

/** A stand-in for Android: grants what `answers` says, and records what it was asked. */
const androidAnswering = (answers) => {
  const asked = [];
  let states = { ...ASKED };
  const request = async (permission) => {
    asked.push(permission);
    states = { ...states, [permission]: answers[permission] };
    return states;
  };
  return { asked, request };
};

test('Location asks for location first, then "all the time"', async () => {
  const android = androidAnswering({ location: 'granted', backgroundLocation: 'granted' });
  const result = await askRow('location', ANDROID_14, ASKED, android.request);
  assert.deepEqual(android.asked, ['location', 'backgroundLocation']);
  assert.equal(result.isRefused, false);
  assert.equal(rowState('location', result.states, ANDROID_14, NONE), 'on');
});

test('a refusal stops the asking: "all the time" is never asked without location', async () => {
  const android = androidAnswering({ location: 'prompt-with-rationale' });
  const result = await askRow('location', ANDROID_14, ASKED, android.request);
  assert.deepEqual(android.asked, ['location']);
  assert.equal(result.isRefused, true);
});

test('a permission already granted is not asked again', async () => {
  const android = androidAnswering({ backgroundLocation: 'denied' });
  const before = { ...ASKED, location: 'granted' };
  const result = await askRow('location', ANDROID_14, before, android.request);
  assert.deepEqual(android.asked, ['backgroundLocation']);
  assert.equal(result.isRefused, true);
});

test('Android 9 asks for location alone', async () => {
  const android = androidAnswering({ location: 'granted' });
  const result = await askRow('location', ANDROID_9, ASKED, android.request);
  assert.deepEqual(android.asked, ['location']);
  assert.equal(result.isRefused, false);
});
