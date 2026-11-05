// What the studio's drawing toolbar says (src/features/studio/drawing/toolbar-text.ts):
// the length, Extend's keep buttons in the jeep's order, why Done waits, the
// straight count, keys typed into a field, and how a shortcut is named.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/toolbar-text-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatDistance,
  isTyping,
  straightCount,
  withCommand,
  keepOptions,
  whyCannotSave,
  whyNotDone,
} from '../../src/features/studio/drawing/toolbar-text.ts';

test('the length: whole metres under a kilometre, km to two places from there', () => {
  assert.equal(formatDistance(0), '0 m');
  assert.equal(formatDistance(999.4), '999 m');
  assert.equal(formatDistance(1000), '1.00 km');
  assert.equal(formatDistance(12345), '12.35 km');
});

test("Extend's keep buttons speak in travel order; a backwards line swaps the parts they keep", () => {
  const ends = { from: 'Tala', to: 'SM Fairview', backwards: false };
  assert.deepEqual(keepOptions(ends), [
    { part: 'start', label: 'Keep Tala → here', hint: 'the new route carries on from here' },
    { part: 'end', label: 'Keep here → SM Fairview', hint: 'the new route joins here' },
  ]);
  assert.deepEqual(
    keepOptions({ ...ends, backwards: true }).map((o) => [o.label, o.part]),
    [
      ['Keep Tala → here', 'end'],
      ['Keep here → SM Fairview', 'start'],
    ],
  );
  assert.deepEqual(
    keepOptions(null).map((o) => o.label),
    ['Keep the start → here', 'Keep here → the end'],
  );
});

test('Done waits for enough points, then for the router', () => {
  assert.equal(whyNotDone(1, 2, 'point', false), 'Add at least 2 points');
  assert.equal(whyNotDone(2, 3, 'corner', true), 'Add at least 3 corners');
  assert.equal(whyNotDone(2, 2, 'point', true), 'Waiting for the router');
  assert.equal(whyNotDone(2, 2, 'point', false), null);
});

test('a key typed into a field is the field’s', () => {
  assert.equal(isTyping(null), false);
  assert.equal(isTyping({ tagName: 'INPUT', isContentEditable: false }), true);
  assert.equal(isTyping({ tagName: 'TEXTAREA', isContentEditable: false }), true);
  assert.equal(isTyping({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isTyping({ tagName: 'BUTTON', isContentEditable: false }), false);
});

test("whyCannotSave: Done's and the beside form's Save's one rule, a route's or a hotspot's", () => {
  const route = (points, extra = {}) => ({
    controlPoints: Array.from({ length: points }),
    area: null,
    snapping: 0,
    unresolved: false,
    ...extra,
  });
  assert.equal(whyCannotSave(route(1)), 'Add at least 2 points');
  assert.equal(whyCannotSave(route(2)), null);
  assert.equal(whyCannotSave(route(2, { snapping: 1 })), 'Waiting for the router');
  assert.equal(whyCannotSave(route(2, { unresolved: true })), 'Waiting for the router');
  const hotspot = { kind: 'hintuan', hotspotId: null };
  assert.equal(whyCannotSave(route(2, { area: hotspot })), 'Add at least 3 corners');
  assert.equal(whyCannotSave(route(3, { area: hotspot })), null);
});

test('a shortcut names the command key as the computer does: Ctrl, or ⌘ on a Mac', () => {
  assert.equal(withCommand('Z', false), 'Ctrl+Z');
  assert.equal(withCommand('Shift+Z', false), 'Ctrl+Shift+Z');
  assert.equal(withCommand('Enter', false), 'Ctrl+Enter');
  assert.equal(withCommand('Z', true), '⌘Z');
  assert.equal(withCommand('Shift+Z', true), '⇧⌘Z');
  assert.equal(withCommand('Enter', true), '⌘Enter');
});

test("straight stretches are counted: Draw's and refused ones, never routed or missing ones", () => {
  const at = [121, 14.7];
  const seg = (snap) => ({ snap, coordinates: [at, at] });
  assert.equal(straightCount([]), 0);
  assert.equal(straightCount([seg('snapped'), seg('freehand'), undefined, seg('freehand')]), 2);
});
