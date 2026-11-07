// The bottom sheet's heights (Figma 3815:5637, the owner's free-drag rule): it rests at Low, at
// full height, or anywhere between; only Low keeps a magnet. Where a drag lets go, and where a
// tap on the handle steps it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CARD_SHAPE,
  FRAMED_SHARE,
  LOW_MAGNET_PX,
  LOW_PX,
  fitHeightsFor,
  follow,
  heightsFor,
  shownAt,
  slide,
  slideShowing,
  snapFor,
  snapShowing,
  stepFrom,
} from '../../src/shared/ui/sheet-gesture.ts';

// A phone's map 844 tall: Low shows 133, full all of it but a 24 px strip.
const H = 844;
const heights = heightsFor(H);

test('each end of a map 844 tall: Low 133, full all of it but a 24 px strip', () => {
  assert.deepEqual(heights, { low: LOW_PX, full: 820 });
});

test('let go anywhere between, it stays there', () => {
  assert.equal(snapFor(400, 0, heights, H), 400 / H);
  assert.equal(snapFor(600, 0.1, heights, H), 600 / H);
  assert.equal(
    snapFor(LOW_PX + LOW_MAGNET_PX + 1, 0, heights, H),
    (LOW_PX + LOW_MAGNET_PX + 1) / H,
  );
});

test('let go at the top it is full; within the magnet above Low it is Low', () => {
  assert.equal(snapFor(820, 0, heights, H), 'full');
  assert.equal(snapFor(LOW_PX + LOW_MAGNET_PX, 0, heights, H), 'low');
  assert.equal(snapFor(LOW_PX + 10, 0, heights, H), 'low');
});

test('a flick up is no jump: the sheet stays where the motion ends', () => {
  assert.equal(snapFor(500, 3, heights, H), 500 / H);
});

test('a flick down goes to Low from anywhere, and from Low it closes', () => {
  assert.equal(snapFor(800, -3, heights, H), 'low');
  assert.equal(snapFor(400, -3, heights, H), 'low');
  assert.equal(snapFor(LOW_PX, -3, heights, H), 'close');
});

test('let go slowly below half of Low, it closes; a little under Low it stays at Low', () => {
  assert.equal(snapFor(LOW_PX / 2 - 1, 0, heights, H), 'close');
  assert.equal(snapFor(LOW_PX - 20, 0, heights, H), 'low');
});

// A finger taking hold of a sheet showing 464 of 844 at y 400.
test('a drag follows the finger, never above full or below nothing', () => {
  const f = follow(400, 0, 464, H);
  assert.equal(f.move(300, 16), 564);
  assert.equal(f.move(-500, 32), 820);
  assert.equal(f.move(1400, 48), 0);
});

test('held still before lifting, it rests where it was let go', () => {
  const f = follow(400, 0, 464, H);
  for (let i = 1; i <= 4; i++) f.move(400 - i * 40, i * 16);
  // 624 shows, held 150 ms: no flick, and it stays.
  assert.equal(f.release(64 + 150), 624 / H);
});

test('lifted while moving fast down it is a flick: to Low, and down from Low it closes', () => {
  const fromHigh = follow(100, 0, 820, H);
  for (let i = 1; i <= 4; i++) fromHigh.move(100 + i * 50, i * 16);
  assert.equal(fromHigh.release(64 + 16), 'low');
  const down = follow(700, 0, LOW_PX, H);
  for (let i = 1; i <= 4; i++) down.move(700 + i * 50, i * 16);
  assert.equal(down.release(64 + 16), 'close');
});

test('lifted while moving fast up, it rests where the finger lifted', () => {
  const up = follow(400, 0, 464, H);
  for (let i = 1; i <= 4; i++) up.move(400 - i * 50, i * 16);
  assert.equal(up.release(64 + 16), 664 / H);
});

test('a third a step on the handle: up from Low to full, down from full to Low', () => {
  const third = Math.round(H / 3);
  const once = stepFrom('low', true, H, heights);
  assert.equal(once, (LOW_PX + third) / H);
  const twice = stepFrom(once, true, H, heights);
  assert.equal(twice, (LOW_PX + 2 * third) / H);
  assert.equal(stepFrom(twice, true, H, heights), 'full');
  const down = stepFrom('full', false, H, heights);
  assert.equal(down, (820 - third) / H);
  // Stepping down to within the magnet of Low lands on Low.
  assert.equal(stepFrom((LOW_PX + third) / H, false, H, heights), 'low');
});

test('what a snap shows, and the snap a height rests at', () => {
  assert.equal(shownAt('low', H, heights), LOW_PX);
  assert.equal(shownAt('full', H, heights), 820);
  assert.equal(shownAt(0.5, H, heights), 422);
  assert.equal(snapShowing(LOW_PX, H, heights), 'low');
  assert.equal(snapShowing(820, H, heights), 'full');
  assert.equal(snapShowing(422, H, heights), 0.5);
});

// A fitted sheet (BottomSheet's `fits`, Figma 4560:12422): its highest is its content's height.
test("a fitted sheet's full height is its content's, never below Low nor above full", () => {
  assert.deepEqual(fitHeightsFor(800, 520), { low: LOW_PX, full: 520 });
  assert.equal(fitHeightsFor(800, 40).full, LOW_PX);
  assert.equal(fitHeightsFor(800, 5000).full, heightsFor(800).full);
});

test('a fitted sheet moves freely between Low and its content, and a drag never shows more', () => {
  const fitted = fitHeightsFor(800, 520);
  assert.equal(snapFor(400, 0, fitted, 800), 0.5);
  assert.equal(snapFor(520, 0, fitted, 800), 'full');
  // A third up from Low shows 400 of its 520; the next step reaches its content.
  assert.equal(stepFrom('low', true, 800, fitted), 0.5);
  assert.equal(stepFrom(0.5, true, 800, fitted), 'full');
  const track = follow(700, 0, LOW_PX, 800, fitted);
  assert.equal(track.move(0, 16), 520);
});

// A sheet with a shape of its own (BottomSheet's `shape`): the route list's Low 240 and a full
// height that fills the screen.
const LIST_SHAPE = { lowPx: 240, isMaxFull: true };

test('a shape of its own: its Low, and a full height of the whole map', () => {
  assert.deepEqual(heightsFor(H, LIST_SHAPE), { low: 240, full: H });
});

test('a tall Low on a short map, a phone on its side, never stands above the framed height', () => {
  assert.deepEqual(heightsFor(393, LIST_SHAPE), { low: Math.round(393 * FRAMED_SHARE), full: 393 });
});

test('a full height that fills the screen slides to the top, and a drag never past it', () => {
  assert.equal(slide('full', LIST_SHAPE), '0px');
  assert.equal(
    slide(0.5, LIST_SHAPE),
    'max(0px, min(calc(50% - env(safe-area-inset-bottom)), calc(100% - min(240px, 55%) - env(safe-area-inset-bottom))))',
  );
  assert.equal(
    slideShowing(300, LIST_SHAPE),
    'max(0px, calc(100% - 300px - env(safe-area-inset-bottom)))',
  );
  assert.equal(
    slide('low', LIST_SHAPE),
    'calc(100% - min(240px, 55%) - env(safe-area-inset-bottom))',
  );
});

test('every other card keeps its shape: CARD_SHAPE is the default', () => {
  assert.deepEqual(heightsFor(H, CARD_SHAPE), heightsFor(H));
  assert.equal(slide('full', CARD_SHAPE), slide('full'));
  assert.equal(CARD_SHAPE.lowPx, LOW_PX);
});

test("a shared height below a sheet's own Low still shows its Low: the route list never sinks under 240", () => {
  // 0.2 of an 844 map is 169 px, under the list's 240: it slides no lower than its Low.
  assert.match(
    slide(0.2, LIST_SHAPE),
    /min\(calc\(80% - env\(safe-area-inset-bottom\)\), calc\(100% - min\(240px, 55%\)/,
  );
  assert.equal(shownAt(0.2, H, heightsFor(H, LIST_SHAPE)), 240);
});

test("a short fitted sheet, wholly within Low's magnet, still opens to its top by a drag", () => {
  const short = fitHeightsFor(800, LOW_PX + 50);
  assert.equal(snapFor(LOW_PX + 50, 0, short, 800), 'full');
  assert.equal(snapFor(LOW_PX + 20, 0, short, 800), 'low');
});

test('a map not yet measured (0 tall) rests at Low', () => {
  const none = heightsFor(0);
  assert.equal(stepFrom('low', true, 0, none), 'low');
  assert.equal(snapShowing(0, 0, none), 'low');
});
