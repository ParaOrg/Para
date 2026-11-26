import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cardOpening } from '../../src/features/routes/map/map-style-opening.ts';

const map = { top: 0, bottom: 800 };

test('a fixed way is kept, wherever the button is', () => {
  assert.equal(cardOpening('up', { top: 24, bottom: 72 }, map).direction, 'up');
  assert.equal(cardOpening('down', { top: 700, bottom: 748 }, map).direction, 'down');
});

test('auto opens down from the top half and up from the foot', () => {
  assert.equal(cardOpening('auto', { top: 24, bottom: 72 }, map).direction, 'down');
  assert.equal(cardOpening('auto', { top: 680, bottom: 728 }, map).direction, 'up');
});

test('the room is the way it opens, less the gap and the edge', () => {
  assert.equal(cardOpening('auto', { top: 24, bottom: 72 }, map).room, 800 - 72 - 18);
  assert.equal(cardOpening('auto', { top: 680, bottom: 728 }, map).room, 680 - 18);
});

test('with no boxes, auto opens down and the room is unknown', () => {
  assert.deepEqual(cardOpening('auto', undefined, undefined), {
    direction: 'down',
    room: undefined,
  });
});
