// The studio map's wheel, as Figma's canvas reads it (src/features/studio/maps/wheel-navigation.ts):
// Ctrl/⌘ zooms, a pinch too; the wheel pans up and down; Shift, left and right.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/wheel-navigation-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { wheelMove } from '../../src/features/studio/maps/wheel-navigation.ts';

const wheel = (over = {}) => ({
  deltaX: 0,
  deltaY: 0,
  deltaMode: 0,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...over,
});

test('the wheel alone pans up and down, by the pixels it turned', () => {
  assert.deepEqual(wheelMove(wheel({ deltaY: 100 }), 800), { kind: 'pan', x: 0, y: 100 });
  assert.deepEqual(wheelMove(wheel({ deltaY: -40 }), 800), { kind: 'pan', x: 0, y: -40 });
});

test("a trackpad's sideways scroll pans sideways", () => {
  assert.deepEqual(wheelMove(wheel({ deltaX: 30, deltaY: 5 }), 800), { kind: 'pan', x: 30, y: 5 });
});

test('Shift turns the wheel sideways, or keeps the sideways a browser already made', () => {
  assert.deepEqual(wheelMove(wheel({ deltaY: 100, shiftKey: true }), 800), {
    kind: 'pan',
    x: 100,
    y: 0,
  });
  assert.deepEqual(wheelMove(wheel({ deltaX: 60, shiftKey: true }), 800), {
    kind: 'pan',
    x: 60,
    y: 0,
  });
});

test('Ctrl or ⌘ zooms: a wheel turned away zooms in, toward zooms out', () => {
  assert.deepEqual(wheelMove(wheel({ deltaY: -100, ctrlKey: true }), 800), {
    kind: 'zoom',
    by: 0.5,
  });
  assert.deepEqual(wheelMove(wheel({ deltaY: 100, metaKey: true }), 800), {
    kind: 'zoom',
    by: -0.5,
  });
});

test("a pinch's small steps zoom a little each, and a fast spin no more than a level", () => {
  assert.deepEqual(wheelMove(wheel({ deltaY: -4, ctrlKey: true }), 800), {
    kind: 'zoom',
    by: 0.02,
  });
  assert.deepEqual(wheelMove(wheel({ deltaY: -5000, ctrlKey: true }), 800), {
    kind: 'zoom',
    by: 1,
  });
});

test('lines and pages are counted in pixels', () => {
  assert.deepEqual(wheelMove(wheel({ deltaY: 3, deltaMode: 1 }), 800), {
    kind: 'pan',
    x: 0,
    y: 48,
  });
  assert.deepEqual(wheelMove(wheel({ deltaY: 1, deltaMode: 2 }), 800), {
    kind: 'pan',
    x: 0,
    y: 800,
  });
});
