// A sheet with two rests (twoRestFor, the explore cards): let go, it settles at Low or full, never
// between; a flick goes its own way, slower the nearer of the two wins.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLICK, twoRestFor } from '../../src/shared/ui/sheet-gesture.ts';

// Low 80, the cards 279 tall open (Figma 4885:40725, 4885:41191).
const heights = { low: 80, full: 279 };

test('let go slowly, it settles at the nearer rest', () => {
  assert.equal(twoRestFor(100, 0, heights), 'low');
  assert.equal(twoRestFor(170, 0.2, heights), 'low');
  assert.equal(twoRestFor(190, -0.2, heights), 'full');
  assert.equal(twoRestFor(260, 0, heights), 'full');
});

test('a flick goes its way, wherever it is let go', () => {
  assert.equal(twoRestFor(90, FLICK, heights), 'full');
  assert.equal(twoRestFor(270, -FLICK, heights), 'low');
});

test('pulled past either end, it comes back to that end', () => {
  assert.equal(twoRestFor(20, 0, heights), 'low');
  assert.equal(twoRestFor(279, 0, heights), 'full');
});

test('never between: every let-go is one of the two', () => {
  for (let shown = 0; shown <= 300; shown += 7)
    for (const v of [-2, -0.5, 0, 0.5, 2])
      assert.ok(['low', 'full'].includes(twoRestFor(shown, v, heights)));
});
