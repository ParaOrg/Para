// The room a sheet leaves the camera (sheet-room.ts): where a point it
// glides to sits, and the padding a whole route is fitted with, beside the
// sheet in the corner or above it along the bottom.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FIT_MARGIN_PX,
  FIT_ROOM_MIN_PX,
  clearOfRects,
  framedAt,
  roomFromRects,
} from '../../src/shared/ui/sheet-room.ts';

// A phone's map, 400 wide and 800 tall, and a desktop's, 1200 by 800.
const phone = { top: 0, bottom: 800, left: 0, right: 400, height: 800 };
const desktop = { top: 0, bottom: 800, left: 0, right: 1200, height: 800 };
// The sheet docked along a phone's bottom (the whole map tall, slid down),
// and floating in a desktop's top-left corner, 384 wide.
const docked = { top: 440, bottom: 1240, left: 0, right: 400, height: 800 };
const corner = { top: 0, bottom: 800, left: 0, right: 384, height: 800 };

test('no dock, or a hidden one: the point sits in the middle of the map', () => {
  assert.deepEqual(clearOfRects(phone, null, 300), [0, 0]);
});

test('a dock in the corner: the point sits half its width to the right', () => {
  assert.deepEqual(clearOfRects(desktop, corner, 300), [192, 0]);
  assert.deepEqual(clearOfRects(desktop, corner), [192, 0]);
});

test('a dock along the bottom: the point sits half of what shows higher', () => {
  assert.deepEqual(clearOfRects(phone, docked, 360), [0, -180]);
  // Without a snap, what stands above the dock's top now.
  assert.deepEqual(clearOfRects(phone, docked), [0, -180]);
});

test('framedAt: Middle when the sheet is higher, its own height otherwise', () => {
  assert.equal(framedAt('low'), 'low');
  assert.equal(framedAt('middle'), 'middle');
  assert.equal(framedAt('max'), 'middle');
  assert.equal(framedAt(0.8), 'middle');
});

const margins = {
  top: FIT_MARGIN_PX,
  bottom: FIT_MARGIN_PX,
  left: FIT_MARGIN_PX,
  right: FIT_MARGIN_PX,
};

test('no dock: a route is fitted with the margins all round', () => {
  assert.deepEqual(roomFromRects(phone, null, 0, 0, 'middle'), margins);
});

test('a dock in the corner: the left margin grows by its width', () => {
  assert.deepEqual(roomFromRects(desktop, corner, 360, 360, 'middle'), {
    ...margins,
    left: FIT_MARGIN_PX + 384,
  });
});

test('a dock along the bottom at Low: the bottom is what shows, and the margin', () => {
  assert.deepEqual(roomFromRects(phone, docked, 129, 129, 'low'), {
    ...margins,
    bottom: 129 + FIT_MARGIN_PX,
  });
});

test('at Max, framed as at Middle', () => {
  assert.deepEqual(roomFromRects(phone, docked, 752, 360, 'max'), {
    ...margins,
    bottom: 360 + FIT_MARGIN_PX,
  });
});

test('a strip under the least room: the margins give way, never below 0', () => {
  // 800 − 690 − 48 = 62 left over: 31 a side.
  assert.deepEqual(roomFromRects(phone, docked, 690, 690, 'middle'), {
    ...margins,
    top: 31,
    bottom: 690 + 31,
  });
  // Less than FIT_ROOM_MIN_PX showing, at a height framed as itself.
  const shows = 800 - FIT_ROOM_MIN_PX + 10;
  assert.deepEqual(roomFromRects(phone, docked, shows, shows, 'middle'), {
    ...margins,
    top: 0,
    bottom: shows,
  });
});
