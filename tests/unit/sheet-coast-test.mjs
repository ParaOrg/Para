// A let-go sheet's momentum (sheet-coast.ts): it coasts on at the finger's speed, as far as
// COAST_REACH_MS takes it, linear in the speed, slowing on 1 − (1 − t)³, and rests where it stops,
// between Low and full; thrown past full, the list carries the rest of the coast. A flick down
// begun at Low closes, and under reduced motion it does not coast.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COAST_EASE,
  COAST_REACH_MS,
  FREE_GLIDE_MS,
  coast,
  glideTo,
  listCoast,
} from '../../src/shared/ui/sheet-coast.ts';
import {
  LOW_MAGNET_PX,
  LOW_PX,
  follow,
  heightsFor,
  snapFor,
} from '../../src/shared/ui/sheet-gesture.ts';

// A phone's map 844 tall: Low shows 133, full 820.
const H = 844;
const heights = heightsFor(H);
const near = (a, b, within = 1e-6) => assert.ok(Math.abs(a - b) <= within, `${a} is not ${b}`);
/** The coast's own curve at share t of its time. */
const ease = (t) => 1 - (1 - t) ** 3;
/** A CSS cubic-bezier's four numbers. */
const bezier = (css) => css.match(/[\d.]+/g).map(Number);

test('the coast is linear in the speed, up positive and down negative; a placement does not coast', () => {
  assert.equal(coast(1), COAST_REACH_MS);
  assert.equal(coast(-1), -COAST_REACH_MS);
  assert.equal(coast(2), 2 * coast(1));
  assert.equal(coast(0.05), 0);
});

test('thrown up, it rests further the faster, every free coast in the same time, from the finger’s speed', () => {
  const slow = glideTo(300, 0.6, heights, H);
  const fast = glideTo(300, 1.2, heights, H);
  near(slow.to, (300 + coast(0.6)) / H);
  near(fast.to, (300 + coast(1.2)) / H);
  assert.ok(fast.to > slow.to);
  for (const landing of [slow, fast]) {
    assert.equal(landing.glide.ease, COAST_EASE);
    near(landing.glide.ms, FREE_GLIDE_MS, 1e-6);
    assert.equal(landing.list, null);
  }
});

test('the coast’s curve is 1 − (1 − t)³ exactly: it leaves at three times its average speed', () => {
  const [x1, y1, x2, y2] = bezier(COAST_EASE);
  near(x1, 1 / 3, 1e-3);
  near(x2, 2 / 3, 1e-3);
  assert.equal(y1, 1);
  assert.equal(y2, 1);
  // Travel d in 3d/v: its start, 3 × d / (3d / v), is the finger's v.
  const landing = glideTo(300, 0.8, heights, H);
  near((3 * coast(0.8)) / landing.glide.ms, 0.8);
});

test('the same flick down goes as far as up: no speed at which it jumps to Low', () => {
  for (const v of [1.2, 1.24, 1.26, 1.5]) {
    near(glideTo(700, -v, heights, H).to, (700 - coast(v)) / H);
  }
  // A strong flick from high up coasts all the way to Low, and stops there softly.
  const strong = glideTo(800, -4, heights, H);
  assert.equal(strong.to, 'low');
  near(strong.glide.ms, (3 * (800 - LOW_PX)) / 4);
});

test('thrown up past full with no list below, it stops softly at full, sooner than a free coast', () => {
  const landing = glideTo(700, 2, heights, H);
  assert.equal(landing.to, 'full');
  near(landing.glide.ms, (3 * (heights.full - 700)) / 2);
  assert.ok(landing.glide.ms < FREE_GLIDE_MS);
  assert.equal(landing.list, null);
});

test('thrown up past full over a list, it arrives at full still moving and the list coasts on', () => {
  const landing = glideTo(700, 2, heights, H, false, 700, 5000);
  assert.equal(landing.to, 'full');
  // The coast's first share, cut where it reaches full: 120 of its 500 px.
  const share = 1 - (1 - 120 / coast(2)) ** (1 / 3);
  near(landing.glide.ms, share * FREE_GLIDE_MS);
  near(ease(share) * coast(2), 120);
  // Its curve is that first share of the coast's own, scaled to fill the glide.
  const [, y1, , y2] = bezier(landing.glide.ease);
  near(y1, share / ease(share), 1e-4);
  near(y2, (2 * share - share * share) / ease(share), 1e-4);
  // The list takes the rest of the coast as the sheet arrives, leaving at the sheet's speed then.
  assert.equal(landing.list.afterMs, landing.glide.ms);
  near(landing.list.px, coast(2) - 120);
  near((3 * landing.list.px) / landing.list.ms, 2 * (1 - share) ** 2);
  // Together they take a free coast's time, as one throw.
  near(landing.glide.ms + landing.list.ms, FREE_GLIDE_MS);
});

test('the list stops softly at its end, short of the rest of the coast', () => {
  const landing = glideTo(700, 2, heights, H, false, 700, 100);
  assert.equal(landing.list.px, 100);
  const v = 2 * (1 - (1 - (1 - 120 / coast(2)) ** (1 / 3))) ** 2;
  near(landing.list.ms, (3 * 100) / v);
});

test('the list’s own coast: as far as the reach, never past its top or its end', () => {
  assert.deepEqual(listCoast(1, 0, 1000), { px: COAST_REACH_MS, ms: 3 * COAST_REACH_MS });
  assert.equal(listCoast(-1, 40, 1000).px, -40);
  assert.equal(listCoast(2, 0, 30).px, 30);
  assert.equal(listCoast(1, 0, 0), null);
});

test('a flick down begun at Low closes, in the usual glide', () => {
  assert.deepEqual(glideTo(LOW_PX, -2, heights, H), { to: 'close', glide: null, list: null });
  assert.deepEqual(glideTo(LOW_PX - 100, -2, heights, H, false, LOW_PX), {
    to: 'close',
    glide: null,
    list: null,
  });
});

test('a flick down begun above Low rests at Low, however far past Low it lifts', () => {
  assert.equal(glideTo(LOW_PX - 50, -2, heights, H, false, LOW_PX + 17).to, 'low');
  assert.equal(glideTo(LOW_PX - 100, -2, heights, H, false, LOW_PX + 17).to, 'low');
  assert.equal(glideTo(400, -3, heights, H).to, 'low');
});

test('coming to rest within Low’s magnet, it rests at Low: never closed by a coast', () => {
  const landing = glideTo(LOW_PX + 200, -0.6, heights, H);
  assert.ok(LOW_PX + 200 - coast(0.6) <= LOW_PX + LOW_MAGNET_PX);
  assert.equal(landing.to, 'low');
  // Pulled on past its coast by the magnet, it still arrives within a free coast's time.
  near(landing.glide.ms, FREE_GLIDE_MS);
  const slow = glideTo(LOW_PX + 107, -0.11, heights, H);
  assert.equal(slow.to, 'low');
  assert.ok(slow.glide.ms <= FREE_GLIDE_MS);
});

test('let go below half of Low it closes, however it was moving', () => {
  assert.equal(glideTo(LOW_PX / 2 - 1, 0.5, heights, H).to, 'close');
});

test('a placement, held still, rests where it was let go, in the usual glide', () => {
  assert.deepEqual(glideTo(400, 0, heights, H), { to: 400 / H, glide: null, list: null });
});

test('a slow throw that the magnet turns round glides the usual way, not against the finger', () => {
  // Up a little from just above Low: the magnet takes it down to Low.
  assert.deepEqual(glideTo(LOW_PX + 20, 0.2, heights, H), { to: 'low', glide: null, list: null });
});

test('a flick up from Low that clears the magnet stays up: no snapping back', () => {
  const landing = glideTo(LOW_PX, 0.8, heights, H);
  near(landing.to, (LOW_PX + coast(0.8)) / H);
});

test('reduced motion: no coast, no list coast, it rests where the finger lifts', () => {
  for (const [shown, v] of [
    [300, 1.2],
    [500, -0.4],
    [600, -2],
    [700, 2],
  ]) {
    assert.deepEqual(glideTo(shown, v, heights, H, true, shown, 5000), {
      to: snapFor(shown, 0, heights, H),
      glide: null,
      list: null,
    });
  }
  // Its magnet still holds, and a flick down begun at Low still closes.
  assert.equal(glideTo(LOW_PX + 40, -2, heights, H, true).to, 'low');
  assert.equal(glideTo(LOW_PX, -2, heights, H, true).to, 'close');
});

test('the finger’s tracker hands the lift over: how much shows, and its speed upwards', () => {
  const f = follow(400, 0, 464, H);
  for (let i = 1; i <= 4; i++) f.move(400 - i * 16, i * 16);
  const lift = f.lift(64 + 16);
  assert.equal(lift.shown, 528);
  near(lift.velocity, 1);
});

test('a flick still speeding up is read near its speed as it lifts, not its average', () => {
  // 0 to 3 px/ms over 120 ms, a move each 8 ms (a 120 Hz screen).
  const f = follow(600, 0, LOW_PX, H);
  let y = 600;
  for (let t = 8; t <= 120; t += 8) {
    y -= ((3 * t) / 120) * 8;
    f.move(y, t);
  }
  assert.ok(f.lift(124).velocity > 2.4, `read as ${f.lift(124).velocity}`);
});
