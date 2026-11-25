// A let-go sheet's momentum (sheet-coast.ts): it coasts on at the finger's speed, slowing evenly
// (SHEET_DECEL), and rests where it stops, between Low and full; a fast flick down still goes to
// Low, and under reduced motion it does not coast.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GLIDE_EASE,
  MAX_GLIDE_MS,
  SHEET_DECEL,
  coast,
  glideTo,
} from '../../src/shared/ui/sheet-coast.ts';
import { LOW_PX, follow, heightsFor, snapFor } from '../../src/shared/ui/sheet-gesture.ts';

// A phone's map 844 tall: Low shows 133, full 820.
const H = 844;
const heights = heightsFor(H);

test('the coast is v²/2a, up positive and down negative; a placement does not coast', () => {
  assert.equal(coast(1), 1 / (2 * SHEET_DECEL));
  assert.equal(coast(-1), -1 / (2 * SHEET_DECEL));
  assert.equal(coast(2), 4 * coast(1));
  assert.equal(coast(0.05), 0);
});

test('thrown up, it rests further the faster, and glides there from the finger’s speed', () => {
  const slow = glideTo(300, 0.6, heights, H);
  const fast = glideTo(300, 1.2, heights, H);
  assert.equal(slow.to, (300 + coast(0.6)) / H);
  assert.equal(fast.to, (300 + coast(1.2)) / H);
  assert.ok(fast.to > slow.to);
  // Even deceleration: the glide takes v/a, and starts at the finger's speed (2d/t = v).
  assert.ok(Math.abs((slow.glideMs ?? 0) - 0.6 / SHEET_DECEL) < 1e-9);
});

test('thrown up past full, it stops softly at full, sooner than its whole coast', () => {
  const landing = glideTo(700, 2, heights, H);
  assert.equal(landing.to, 'full');
  assert.ok((landing.glideMs ?? Infinity) < 2 / SHEET_DECEL);
  assert.equal(landing.glideMs, (2 * (heights.full - 700)) / 2);
});

test('a fast flick down still goes to Low, or closes from Low, in the usual glide', () => {
  assert.deepEqual(glideTo(600, -2, heights, H), { to: 'low', glideMs: null });
  assert.deepEqual(glideTo(LOW_PX, -2, heights, H), { to: 'close', glideMs: null });
  // Begun above Low, as a short list's highest, it goes to Low however far past Low it lifts.
  assert.deepEqual(glideTo(LOW_PX - 100, -2, heights, H, false, LOW_PX + 17), {
    to: 'low',
    glideMs: null,
  });
  assert.deepEqual(glideTo(LOW_PX - 100, -2, heights, H, false, LOW_PX), {
    to: 'close',
    glideMs: null,
  });
});

test('a slower release down glides a little, and Low’s magnet catches it where it stops', () => {
  const short = glideTo(500, -0.4, heights, H);
  assert.equal(short.to, (500 + coast(-0.4)) / H);
  assert.ok((short.glideMs ?? 0) > 0);
  // Stopping within Low's magnet, or below Low, it rests at Low: never closed by a coast.
  assert.equal(glideTo(LOW_PX + 100, -0.9, heights, H).to, 'low');
});

test('let go below half of Low it closes, however it was moving', () => {
  assert.equal(glideTo(LOW_PX / 2 - 1, 0.5, heights, H).to, 'close');
});

test('a placement, held still, rests where it was let go, in the usual glide', () => {
  assert.deepEqual(glideTo(400, 0, heights, H), { to: 400 / H, glideMs: null });
});

test('a slow throw that the magnet turns round glides the usual way, not against the finger', () => {
  // Up a little from just above Low: the magnet takes it down to Low.
  assert.deepEqual(glideTo(LOW_PX + 20, 0.2, heights, H), { to: 'low', glideMs: null });
});

test('let go barely moving, the magnet takes it to Low in the usual glide, not a slow crawl', () => {
  assert.deepEqual(glideTo(LOW_PX + 60, -0.05, heights, H), { to: 'low', glideMs: null });
});

test('no glide is longer than MAX_GLIDE_MS', () => {
  assert.ok((glideTo(LOW_PX + 200, -0.11, heights, H).glideMs ?? 0) <= MAX_GLIDE_MS);
});

test('reduced motion: no coast, snapFor rules where it rests', () => {
  for (const [shown, v] of [
    [300, 1.2],
    [500, -0.4],
    [600, -2],
  ]) {
    assert.deepEqual(glideTo(shown, v, heights, H, true), {
      to: snapFor(shown, v, heights, H),
      glideMs: null,
    });
  }
});

test('the glide curve is even deceleration: x(t) = 2t − t²', () => {
  assert.equal(GLIDE_EASE, 'cubic-bezier(0.333, 0.667, 0.667, 1)');
});

test('the finger’s tracker hands the lift over: how much shows, and its speed upwards', () => {
  const f = follow(400, 0, 464, H);
  for (let i = 1; i <= 4; i++) f.move(400 - i * 16, i * 16);
  const lift = f.lift(64 + 16);
  assert.equal(lift.shown, 528);
  assert.ok(Math.abs(lift.velocity - 1) < 1e-9);
});
