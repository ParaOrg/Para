// The Selected box's stripes (hotspot-hatch.ts): a 32 x 32 RGBA bitmap from a hex colour, drawn
// at twice the size for a sharp screen. No suite reads its pixels.
import assert from 'node:assert/strict';
import test from 'node:test';
import { hatch, hatchOf } from '../../src/features/routes/map/hotspot-hatch.ts';

const SIZE = 32;
const alphaAt = (bitmap, x, y) => bitmap.data[(y * SIZE + x) * 4 + 3];

test('the bitmap is 32 x 32 RGBA, as MapLibre takes an image', () => {
  const bitmap = hatch('#12ab34');
  assert.equal(bitmap.width, SIZE);
  assert.equal(bitmap.height, SIZE);
  assert.equal(bitmap.data.length, SIZE * SIZE * 4);
});

test('every pixel has the colour the hex gives', () => {
  const { data } = hatch('#12ab34');
  for (let i = 0; i < data.length; i += 4) {
    assert.deepEqual([data[i], data[i + 1], data[i + 2]], [0x12, 0xab, 0x34]);
  }
});

test('the stripe runs along x + y + 1 = 0 (mod 32): opaque on it, clear a few pixels away', () => {
  const bitmap = hatch('#000000');
  for (let y = 0; y < SIZE; y++) {
    const x = (SIZE - 1 - y + SIZE) % SIZE;
    assert.equal(alphaAt(bitmap, x, y), 255, `on the diagonal at ${x},${y}`);
    assert.equal(alphaAt(bitmap, (x + 4) % SIZE, y), 0, `4 pixels along at ${x},${y}`);
    assert.equal(alphaAt(bitmap, (x + SIZE - 4) % SIZE, y), 0, `4 pixels back at ${x},${y}`);
  }
});

test('the edge of the stripe is soft: one pixel off is partly drawn', () => {
  const a = alphaAt(hatch('#000000'), SIZE - 1 - 5 + 1, 5);
  assert.ok(a > 0 && a < 255, `alpha ${a}`);
});

test('the pattern tiles: the row below is the row above, shifted one pixel', () => {
  const bitmap = hatch('#000000');
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      assert.equal(alphaAt(bitmap, x, y), alphaAt(bitmap, (x + 1) % SIZE, (y + SIZE - 1) % SIZE));
    }
  }
});

test('each kind has an image id of its own', () => {
  assert.equal(hatchOf('terminal'), 'hotspot-hatch-terminal');
  assert.equal(hatchOf('hintuan'), 'hotspot-hatch-hintuan');
});
