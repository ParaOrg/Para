// History's card picture: the whole trail framed in a 3:4 box of the map
// (src/features/contribute/map/trail-picture-frame.ts).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/trail-picture-frame-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TRAIL_PICTURE, trailFit } from '../../src/features/contribute/map/trail-picture-frame.ts';

const trail = (...paths) => ({
  lines: paths.map((path, i) => ({ mode: i % 2 ? 'walk' : 'ride', path })),
  markers: [],
  marks: [],
});

test('every run of the trail is inside the bounds, walked and ridden alike', () => {
  const fit = trailFit(
    trail(
      [
        [121.0, 14.6],
        [121.02, 14.61],
      ],
      [
        [121.02, 14.61],
        [121.05, 14.58],
      ],
    ),
    393,
    852,
  );
  assert.deepEqual(fit.bounds, [
    [121.0, 14.58],
    [121.05, 14.61],
  ]);
});

test('the box is the largest 3:4 portrait centred on the canvas, the padding leaving a margin', () => {
  const fit = trailFit(
    trail([
      [121, 14.6],
      [121.01, 14.6],
    ]),
    393,
    852,
  );
  assert.equal(fit.box.width, 393);
  assert.equal(fit.box.height, 524);
  assert.equal(fit.box.x, 0);
  assert.equal(fit.box.y, (852 - 524) / 2);
  assert.equal(fit.padding.top, fit.box.y + 16);
  assert.equal(fit.padding.left, 16);
  assert.equal(TRAIL_PICTURE.width / TRAIL_PICTURE.height, fit.box.width / fit.box.height);
  const wide = trailFit(
    trail([
      [121, 14.6],
      [121.01, 14.6],
    ]),
    1200,
    600,
  );
  assert.equal(wide.box.height, 600);
  assert.equal(wide.box.width, 450);
  assert.equal(wide.box.x, 375);
});

test('no picture for a trail of fewer than two points', () => {
  assert.equal(trailFit(trail(), 393, 852), null);
  assert.equal(trailFit(trail([[121, 14.6]]), 393, 852), null);
});
