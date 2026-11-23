// A curve's handle held is drawn as a diamond (src/features/studio/drawing/handle-diamond.ts):
// the image the map draws for it.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/handle-diamond-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { diamondImage } from '../../src/features/studio/drawing/handle-diamond.ts';

const FILL = '#e7000b';
const RIM = '#ffffff';
const at = (img, x, y) =>
  Array.from(img.data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 4));

test('a square image, twice as many pixels on a dense screen', () => {
  const one = diamondImage(FILL, RIM, 1);
  const two = diamondImage(FILL, RIM, 2);
  assert.equal(one.width, one.height);
  assert.equal(two.width, one.width * 2);
  assert.equal(two.data.length, two.width * two.height * 4);
});

test('its middle is the fill, solid', () => {
  const img = diamondImage(FILL, RIM, 2);
  const c = img.width / 2;
  assert.deepEqual(at(img, c, c), [0xe7, 0x00, 0x0b, 255]);
});

test('a diamond, not a square: its corners are empty, its points on the middle lines', () => {
  const img = diamondImage(FILL, RIM, 2);
  const last = img.width - 1;
  for (const [x, y] of [
    [0, 0],
    [last, 0],
    [0, last],
    [last, last],
  ])
    assert.equal(at(img, x, y)[3], 0);
  const c = img.width / 2;
  assert.ok(at(img, c, 1)[3] > 0, 'its top point');
  assert.ok(at(img, 1, c)[3] > 0, 'its left point');
});

test('the rim at its edge is white', () => {
  const img = diamondImage(FILL, RIM, 2);
  const c = img.width / 2;
  const [r, g, b, a] = at(img, c, 1);
  assert.ok(r > 240 && g > 200 && b > 200 && a > 0, JSON.stringify([r, g, b, a]));
});
