// The save panel's refusals (src/features/studio/panels/save-checks.ts): why a
// save is refused before it writes anything, in the panel's words and order.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/save-checks-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loopSaveRefusal, saveRefusal } from '../../src/features/studio/panels/save-checks.ts';
import { ENDS_TAKEN, LOOP_TAKEN } from '../../src/features/studio/data/routes-write.ts';

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

// ---------------------------------------------------------------- an ikot (0021)

/** An ikot that may be saved: a signboard, a closed line, two places on it, nothing taken. */
const okIkot = { signboard: 'UP – Ikot', gapM: 0, placesCount: 3, signboardTaken: false };

test('an ikot with a signboard, a closed line and places goes ahead', () => {
  assert.equal(loopSaveRefusal(okIkot), null);
  // At the tolerance still closed; one metre past is not.
  assert.equal(loopSaveRefusal({ ...okIkot, gapM: 15 }), null);
});

test('each ikot refusal in the words the panel shows', () => {
  assert.equal(
    loopSaveRefusal({ ...okIkot, signboard: '  ' }),
    'An ikot is called by its signboard: write what the jeep says, like UP – Ikot.',
  );
  assert.equal(
    loopSaveRefusal({ ...okIkot, gapM: 120.4 }),
    'An ikot ends where it began. This line ends 120 m from its start: go back to the map and press ⟲ Close the loop.',
  );
  assert.equal(
    loopSaveRefusal({ ...okIkot, placesCount: 1 }),
    'An ikot needs at least two places on it, so its trip has somewhere to start and somewhere to go.',
  );
  assert.equal(loopSaveRefusal({ ...okIkot, signboardTaken: true }), LOOP_TAKEN);
});

test('the ikot refusals come in this order: signboard, closed, places, taken', () => {
  const all = { signboard: '', gapM: 99, placesCount: 0, signboardTaken: true };
  assert.match(loopSaveRefusal(all), /called by its signboard/);
  assert.match(loopSaveRefusal({ ...all, signboard: 'x' }), /ends where it began/);
  assert.match(loopSaveRefusal({ ...all, signboard: 'x', gapM: 0 }), /at least two places/);
  assert.equal(loopSaveRefusal({ ...all, signboard: 'x', gapM: 0, placesCount: 2 }), LOOP_TAKEN);
});
