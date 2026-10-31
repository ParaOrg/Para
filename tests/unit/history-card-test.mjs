// History's cards: the one status line each upload state gets
// (src/features/contribute/history/card-status.ts), the trail drawn when there is no picture
// (trail-sketch-paths.ts), and the day, time and distance on the card (common/format.ts).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/history-card-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  canUploadFromMenu,
  cardStatusOf,
} from '../../src/features/contribute/history/card-status.ts';
import { sketchLines } from '../../src/features/contribute/history/trail-sketch-paths.ts';
import { cardDistanceText, hoursMinutesText } from '../../src/features/contribute/common/format.ts';
import { FAILED } from '../../src/features/contribute/uploads/upload-failures.ts';

const failed = (reason) => ({ state: 'failed', ...FAILED[reason] });

test('uploaded is green; a removal that failed says why, in red', () => {
  assert.deepEqual(cardStatusOf({ state: 'uploaded', at: 1, by: 'p' }, true), {
    tone: 'uploaded',
    words: 'Uploaded',
  });
  // Sent under an identity this phone no longer has: it cannot be deleted from here, and says why.
  assert.deepEqual(cardStatusOf({ state: 'uploaded', at: 1, by: 'p' }, false), {
    tone: 'uploaded',
    words: 'Uploaded from an earlier sign-in',
  });
  assert.deepEqual(cardStatusOf({ state: 'uploaded', at: 1, by: 'p', problem: 'Not removed' }), {
    tone: 'problem',
    words: 'Not removed',
  });
});

test('only a failure the page will not retry by itself offers Tap retry upload', () => {
  for (const reason of ['refused', 'check-failed', 'blocked']) {
    assert.equal(cardStatusOf(failed(reason)).tone, 'retry', reason);
  }
  assert.deepEqual(cardStatusOf(failed('offline')), { tone: 'quiet', words: 'Waiting for signal' });
  assert.deepEqual(cardStatusOf({ state: 'waiting' }), {
    tone: 'quiet',
    words: 'Waiting for signal',
  });
  // Retried by itself later, for a reason of its own: grey, with that reason.
  assert.deepEqual(cardStatusOf(failed('day-cap')), {
    tone: 'quiet',
    words: FAILED['day-cap'].brief,
  });
});

test('a recording too long or too large is never offered a retry that cannot work', () => {
  for (const reason of ['too-long', 'line-too-large']) {
    assert.deepEqual(cardStatusOf(failed(reason)), {
      tone: 'problem',
      words: FAILED[reason].brief,
    });
  }
});

test('in flight reads Sending…; held, removed and unavailable are only on this phone', () => {
  assert.equal(cardStatusOf({ state: 'uploading' }).words, 'Sending…');
  assert.equal(cardStatusOf({ state: 'checking' }).words, 'Sending…');
  for (const state of ['held', 'removed', 'unavailable']) {
    assert.deepEqual(cardStatusOf({ state }), { tone: 'quiet', words: 'Only on this phone' });
  }
  assert.equal(cardStatusOf({ state: 'removed', byEditor: true }).words, 'Removed by an editor');
});

test('Upload to Para is offered for a recording kept back or taken off Para, and nothing else', () => {
  assert.equal(canUploadFromMenu({ state: 'held' }), true);
  assert.equal(canUploadFromMenu({ state: 'removed' }), true);
  assert.equal(canUploadFromMenu({ state: 'waiting' }), false);
  assert.equal(canUploadFromMenu({ state: 'uploaded', at: 1, by: 'p' }), false);
});

const trail = (...lines) => ({ lines, markers: [], marks: [] });
const numbersOf = (d) => d.match(/-?\d+(\.\d+)?/g).map(Number);

test('the sketch fits every run inside the box with room around it, one path a run', () => {
  const lines = sketchLines(
    trail(
      {
        mode: 'walk',
        path: [
          [121.0, 14.6],
          [121.01, 14.61],
        ],
      },
      {
        mode: 'ride',
        path: [
          [121.01, 14.61],
          [121.05, 14.7],
          [121.08, 14.72],
        ],
      },
    ),
    91,
    120,
  );
  assert.deepEqual(
    lines.map((line) => line.mode),
    ['walk', 'ride'],
  );
  const coords = lines.flatMap((line) => numbersOf(line.d));
  const xs = coords.filter((_, i) => i % 2 === 0);
  const ys = coords.filter((_, i) => i % 2 === 1);
  assert.ok(Math.min(...xs) >= 12 - 0.1 && Math.max(...xs) <= 91 - 12 + 0.1, String(xs));
  assert.ok(Math.min(...ys) >= 12 - 0.1 && Math.max(...ys) <= 120 - 12 + 0.1, String(ys));
  // North up: the trail's start, furthest south, is lowest in the box.
  assert.equal(Math.max(...ys), numbersOf(lines[0].d)[1]);
});

test('the sketch keeps the trail’s shape: a trail running east fills the width, not the height', () => {
  const [line] = sketchLines(
    trail({
      mode: 'ride',
      path: [
        [121.0, 14.6],
        [121.1, 14.6],
      ],
    }),
    91,
    120,
  );
  const [x1, y1, x2, y2] = numbersOf(line.d);
  assert.equal(y1, y2);
  assert.equal(y1, 60);
  assert.ok(Math.abs(x2 - x1 - (91 - 24)) < 0.2, `${x1} → ${x2}`);
});

test('a trail with fewer than two points draws nothing; one that never moved draws a dot', () => {
  assert.deepEqual(sketchLines(trail({ mode: 'ride', path: [[121, 14]] }), 91, 120), []);
  const [still] = sketchLines(
    trail({
      mode: 'ride',
      path: [
        [121, 14],
        [121, 14],
      ],
    }),
    91,
    120,
  );
  assert.equal(still.d, 'M45.5 60L45.5 60');
});

test('the card’s time and distance read as Figma writes them', () => {
  assert.equal(hoursMinutesText(12 * 60 + 59), '0h 12m');
  assert.equal(hoursMinutesText(2 * 3600 + 5 * 60), '2h 5m');
  assert.equal(cardDistanceText(850), '850 m');
  assert.equal(cardDistanceText(4_249), '4.2 km');
  assert.equal(cardDistanceText(34_200), '34 km');
});
