// The bottom sheet's three heights (Figma 3815:5637): where a tap on the
// handle, and where a drag let go, takes it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LOW_PX,
  follow,
  heightsFor,
  snapAfterTap,
  snapFor,
} from '../../src/shared/ui/sheet-gesture.ts';

test('a tap goes round: Low, Middle, Max, Low; from a free height, on up to Max', () => {
  assert.equal(snapAfterTap('low'), 'middle');
  assert.equal(snapAfterTap('middle'), 'max');
  assert.equal(snapAfterTap('max'), 'low');
  assert.equal(snapAfterTap(0.7), 'max');
});

// A phone's map 800 tall: Low shows 80, Middle 320, Max 800.
const heights = { low: 80, middle: 320, max: 800 };

// The owner, 2026-10-21: one height a swipe, "max, middle, low, then low,
// middle and max"; only a flick skips to the end.
test('a swipe up moves one height: Low to Middle, Middle to Max', () => {
  assert.equal(snapFor(150, 0, heights, 80), 'middle');
  assert.equal(snapFor(300, 0.1, heights, 80), 'middle');
  assert.equal(snapFor(350, 0, heights, 320), 'max');
  assert.equal(snapFor(600, 0.1, heights, 320), 'max');
});

test('from Low, let go above halfway between Middle and Max, it goes on to Max', () => {
  assert.equal(snapFor(540, 0, heights, 80), 'middle');
  assert.equal(snapFor(600, 0, heights, 80), 'max');
});

test('a move shorter than a tap lets go on the height nearest where it was let go', () => {
  assert.equal(snapFor(90, 0, heights, 80), 'low');
  assert.equal(snapFor(335, 0.05, heights, 320), 'middle');
  assert.equal(snapFor(790, 0, heights, 800), 'max');
});

test('a swipe down steps down one height: Max to Middle, Middle to Low', () => {
  assert.equal(snapFor(600, 0, heights, 800), 'middle');
  assert.equal(snapFor(310, 0, heights, 800), 'middle');
  assert.equal(snapFor(250, 0, heights, 320), 'low');
  assert.equal(snapFor(150, 0, heights, 320), 'low');
});

test('from Max, let go below halfway between Middle and Low, it goes on to Low', () => {
  assert.equal(snapFor(210, 0, heights, 800), 'middle');
  assert.equal(snapFor(190, 0, heights, 800), 'low');
});

test('let go slowly below half of Low, it closes; a little under Low it stays', () => {
  assert.equal(snapFor(30, 0, heights, 80), 'close');
  assert.equal(snapFor(60, 0, heights, 80), 'low');
});

// The owner, 2026-09-30: "like google maps and apple maps" — a flick goes to
// the end in its direction, past Middle.
test('a flick up goes all the way to Max, from Low or Middle alike', () => {
  assert.equal(snapFor(340, 3, heights, 320), 'max');
  assert.equal(snapFor(100, 3, heights, 80), 'max');
  assert.equal(snapFor(800, 3, heights, 800), 'max');
});

// 1.25 px/ms since the owner's 4/10 (2026-09-30). A swipe under it is no flick,
// so it goes by how far it travelled, not how fast: one height up or down.
test('a swipe under 1.25 px/ms is no flick: it moves one height by how far it travelled', () => {
  assert.equal(snapFor(340, 1, heights, 80), 'middle');
  assert.equal(snapFor(780, -1, heights, 800), 'max');
  assert.equal(snapFor(500, -1, heights, 800), 'middle');
});

test('a flick down goes all the way to Low, from Max or Middle alike, and from Low it closes', () => {
  assert.equal(snapFor(800, -3, heights, 800), 'low');
  assert.equal(snapFor(780, -3, heights, 800), 'low');
  assert.equal(snapFor(300, -3, heights, 320), 'low');
  assert.equal(snapFor(80, -3, heights, 80), 'close');
  assert.equal(snapFor(70, -3, heights, 80), 'close');
});

test('each height of a map 844 tall: Low 129, Middle 40%, Max all of it but a 24 px strip', () => {
  assert.deepEqual(heightsFor(844), { low: LOW_PX, middle: 338, max: 820 });
});

// A finger taking hold of a sheet at Middle (464 of 844) at y 400.
test('a drag follows the finger, never above Max or below nothing', () => {
  const f = follow(400, 0, 464, 844);
  assert.equal(f.move(300, 16), 564);
  assert.equal(f.move(-500, 32), 820);
  assert.equal(f.move(1400, 48), 0);
});

test('held still before lifting it is a placement: a swipe up from Middle goes to Max, a nudge stays', () => {
  const f = follow(400, 0, 464, 844);
  for (let i = 1; i <= 8; i++) f.move(400 - i * 40, i * 16);
  // 784 shows, moving up fast — but held 150 ms, so it is no flick; it is a swipe up all the same.
  assert.equal(f.release(128 + 150), 'max');
  // 20 over Middle, held: less than a tap's travel, drawn back to it.
  const g = follow(400, 0, heightsFor(844).middle, 844);
  for (let i = 1; i <= 4; i++) g.move(400 - i * 5, i * 16);
  assert.equal(g.release(64 + 150), 'middle');
});

test('lifted while moving fast it is a flick: to the end, down from Low it closes', () => {
  const up = follow(400, 0, 464, 844);
  for (let i = 1; i <= 4; i++) up.move(400 - i * 50, i * 16);
  assert.equal(up.release(64 + 16), 'max');
  const fromMax = follow(100, 0, 820, 844);
  for (let i = 1; i <= 4; i++) fromMax.move(100 + i * 50, i * 16);
  assert.equal(fromMax.release(64 + 16), 'low');
  const down = follow(700, 0, LOW_PX, 844);
  for (let i = 1; i <= 4; i++) down.move(700 + i * 50, i * 16);
  assert.equal(down.release(64 + 16), 'close');
});

// A swipe up from Middle (338 of 844) that starts fast and slows to a crawl
// before the finger lifts: read over its last 100 ms, it is slow — no flick —
// but it is a swipe up from Middle, so it goes to Max.
test('a swipe that slows before lifting is no flick: from Middle, a swipe up goes to Max', () => {
  const f = follow(400, 0, heightsFor(844).middle, 844);
  let y = 400;
  let t = 0;
  for (let i = 0; i < 3; i++) f.move((y -= 50), (t += 16));
  for (let i = 0; i < 10; i++) f.move((y -= 2), (t += 16));
  assert.equal(f.release(t + 16), 'max');
});

// A swipe down from Max that slows before lifting: no flick, one step down.
test('a swipe down from Max that slows before lifting steps down to Middle', () => {
  const f = follow(100, 0, heightsFor(844).max, 844);
  let y = 100;
  let t = 0;
  for (let i = 0; i < 3; i++) f.move((y += 50), (t += 16));
  for (let i = 0; i < 10; i++) f.move((y += 2), (t += 16));
  assert.equal(f.release(t + 16), 'middle');
});
