// The router's answer (src/features/studio/drawing/snap.ts, snapSegments),
// read through its schema: a good answer gives routed segments with their
// streets, a refusal straightens the gaps it names, and an answer of any other
// shape is one the router could not give, so every gap is drawn straight
// rather than the drawing breaking. Requests are a second apart, as the
// public router asks.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/snap-reply-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { snapSegments } from '../../src/features/studio/drawing/snap.ts';

const A = [121.05, 14.7];
const B = [121.05, 14.71];
const C = [121.06, 14.71];

/** fetch answering every request with `body` on `status`. */
const answer = (status, body) => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
};

const step = (name, distance, coordinates) => ({ name, distance, geometry: { coordinates } });

test('a good answer: one routed segment per gap, with its streets', async () => {
  answer(200, {
    code: 'Ok',
    routes: [{ legs: [{ steps: [step('Tandang Sora', 1100, [A, [121.05, 14.705], B])] }] }],
  });
  const [s] = await snapSegments([A, B]);
  assert.equal(s.snap, 'snapped');
  assert.deepEqual(s.coordinates, [A, [121.05, 14.705], B]);
  assert.deepEqual(s.streets, [{ name: 'Tandang Sora', metres: 1100 }]);
});

test('a refusal straightens the gaps that touch the point it names', async () => {
  answer(400, { code: 'NoSegment', message: 'Could not find a matching segment for coordinate 1' });
  const segments = await snapSegments([A, B, C]);
  assert.deepEqual(
    segments.map((s) => s.snap),
    ['freehand', 'freehand'],
  );
});

test('an answer of another shape draws every gap straight, and does not throw', async () => {
  answer(200, { code: 'Ok', routes: [{ legs: [{ steps: 'not steps' }] }] });
  const segments = await snapSegments([A, B, C]);
  assert.deepEqual(
    segments.map((s) => [s.snap, s.coordinates]),
    [
      ['freehand', [A, B]],
      ['freehand', [B, C]],
    ],
  );
});
