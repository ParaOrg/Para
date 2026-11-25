// The map's 2D/3D view (src/features/routes/map/view-mode.ts): the first visit is 2D, the
// device keeps a choice, and an unreadable value or blocked storage reads as 2D.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/view-mode-test.mjs
import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  VIEW_MODE_KEY,
  VIEW_PITCH,
  otherViewMode,
  readViewMode,
  rememberViewMode,
  restingPitch,
} from '../../src/features/routes/map/view-mode.ts';

/** A device's storage, as the browser's: strings by key. */
const storage = () => {
  const kept = new Map();
  return {
    getItem: (key) => kept.get(key) ?? null,
    setItem: (key, value) => kept.set(key, String(value)),
    removeItem: (key) => kept.delete(key),
  };
};

beforeEach(() => {
  globalThis.localStorage = storage();
});

test('a first visit is 2D, flat', () => {
  assert.equal(readViewMode(), '2d');
  assert.equal(restingPitch(), 0);
});

test('a choice is kept: 3D after a reload, tilted', () => {
  rememberViewMode('3d');
  assert.equal(globalThis.localStorage.getItem(VIEW_MODE_KEY), '3d');
  assert.equal(readViewMode(), '3d');
  assert.equal(restingPitch(), VIEW_PITCH['3d']);
  rememberViewMode('2d');
  assert.equal(readViewMode(), '2d');
});

test('a value the app never wrote reads as 2D', () => {
  globalThis.localStorage.setItem(VIEW_MODE_KEY, 'globe');
  assert.equal(readViewMode(), '2d');
});

test('blocked storage reads as 2D and keeps nothing, without throwing', () => {
  globalThis.localStorage = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
  assert.equal(readViewMode(), '2d');
  assert.doesNotThrow(() => rememberViewMode('3d'));
});

test('a tap switches to the other view', () => {
  assert.equal(otherViewMode('2d'), '3d');
  assert.equal(otherViewMode('3d'), '2d');
});

test('3D tilts between 50 and 60 degrees; 2D is flat', () => {
  assert.equal(VIEW_PITCH['2d'], 0);
  assert.ok(VIEW_PITCH['3d'] >= 50 && VIEW_PITCH['3d'] <= 60);
});
