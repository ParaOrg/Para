// The save panel's refusals (src/features/studio/panels/save-checks.ts): why a
// save is refused before it writes anything, in the panel's words and order.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/save-checks-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveRefusal } from '../../src/features/studio/panels/save-checks.ts';
import { ENDS_TAKEN } from '../../src/features/studio/data/routes-write.ts';

const tala = { key: 'tala', label: 'Tala', boxes: [], terminal: null };
const fairview = { key: 'sm fairview', label: 'SM Fairview', boxes: [], terminal: null };

/** A form that may be saved: two ends at two places, nothing taken or turned. */
const ok = {
  headId: 's-tala',
  tailId: 's-fairview',
  headPlace: tala,
  tailPlace: fairview,
  endsTaken: false,
  turnedRound: false,
};

const NO_END = 'Pick the place at each end. The route is named after them.';
const SAME_PLACE = 'The two ends have to be different places.';
const TURNED =
  'Head and tail swapped would turn the route round, which Edit route cannot do: its directions keep their way round. Change one end at a time.';

test('a form with two different ends goes ahead', () => {
  assert.equal(saveRefusal(ok), null);
});

test('each refusal on its own, in the words the panel shows', () => {
  assert.equal(saveRefusal({ ...ok, headId: '' }), NO_END);
  assert.equal(saveRefusal({ ...ok, tailId: '' }), NO_END);
  assert.equal(saveRefusal({ ...ok, tailPlace: tala }), SAME_PLACE);
  assert.equal(saveRefusal({ ...ok, endsTaken: true }), ENDS_TAKEN);
  assert.equal(saveRefusal({ ...ok, turnedRound: true }), TURNED);
});

test('two boxes with no known place are not the same place', () => {
  assert.equal(saveRefusal({ ...ok, headPlace: undefined, tailPlace: undefined }), null);
});

test('the order: no end, then the same place, then ends taken, then turned round', () => {
  const all = { ...ok, tailPlace: tala, endsTaken: true, turnedRound: true };
  assert.equal(saveRefusal({ ...all, headId: '' }), NO_END);
  assert.equal(saveRefusal(all), SAME_PLACE);
  assert.equal(saveRefusal({ ...all, tailPlace: fairview }), ENDS_TAKEN);
  assert.equal(saveRefusal({ ...all, tailPlace: fairview, endsTaken: false }), TURNED);
});
