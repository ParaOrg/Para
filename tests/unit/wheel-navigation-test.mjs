// The studio map's wheel, as Figma's canvas reads it (src/features/studio/maps/wheel-navigation.ts):
// the wheel pans up and down, Shift left and right, gliding; Ctrl/⌘ or a pinch
// is a zoom, left to MapLibre.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/wheel-navigation-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isZoomWheel, panStep, wheelPan } from '../../src/features/studio/maps/wheel-navigation.ts';

const wheel = (over = {}) => ({
  deltaX: 0,
  deltaY: 0,
  deltaMode: 0,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...over,
});

test('Ctrl or ⌘ (and a pinch, which arrives with Ctrl) is a zoom: MapLibre’s', () => {
  assert.equal(isZoomWheel(wheel({ deltaY: -100, ctrlKey: true })), true);
  assert.equal(isZoomWheel(wheel({ deltaY: 100, metaKey: true })), true);
  assert.equal(isZoomWheel(wheel({ deltaY: 100 })), false);
  assert.equal(isZoomWheel(wheel({ deltaY: 100, shiftKey: true })), false);
});

test('the wheel alone pans up and down, by the pixels it turned', () => {
  assert.deepEqual(wheelPan(wheel({ deltaY: 100 }), 800), { x: 0, y: 100 });
  assert.deepEqual(wheelPan(wheel({ deltaY: -40 }), 800), { x: 0, y: -40 });
});

test("a trackpad's sideways scroll pans sideways", () => {
  assert.deepEqual(wheelPan(wheel({ deltaX: 30, deltaY: 5 }), 800), { x: 30, y: 5 });
});

test('Shift turns the wheel sideways, or keeps the sideways a browser already made', () => {
  assert.deepEqual(wheelPan(wheel({ deltaY: 100, shiftKey: true }), 800), { x: 100, y: 0 });
  assert.deepEqual(wheelPan(wheel({ deltaX: 60, shiftKey: true }), 800), { x: 60, y: 0 });
});

test('lines and pages are counted in pixels', () => {
  assert.deepEqual(wheelPan(wheel({ deltaY: 3, deltaMode: 1 }), 800), { x: 0, y: 48 });
  assert.deepEqual(wheelPan(wheel({ deltaY: 1, deltaMode: 2 }), 800), { x: 0, y: 800 });
});

test('a glide covers a share each frame, eases out, and ends exactly where it was going', () => {
  let remaining = { x: 0, y: 100 };
  let moved = 0;
  const steps = [];
  for (let frame = 0; frame < 60 && (remaining.x !== 0 || remaining.y !== 0); frame++) {
    const { step, rest } = panStep(remaining);
    steps.push(step.y);
    moved += step.y;
    remaining = rest;
  }
  assert.deepEqual(remaining, { x: 0, y: 0 }, 'it settles');
  assert.ok(Math.abs(moved - 100) < 1e-9, `all of it, ${moved}`);
  assert.ok(steps.length > 3 && steps.length < 30, `over a few frames: ${steps.length}`);
  assert.ok(steps[0] > steps[1] && steps[1] > steps[2], 'fastest first');
});
