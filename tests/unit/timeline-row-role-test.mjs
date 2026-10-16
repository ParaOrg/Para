// What a trip card's rows wear for the picks (src/features/routes/cards/timeline-row-role.ts):
// a hintuan row's S or E, its pill and the button under it (rowRole), the
// origin's mark (originMark), an end row's pill (endRowPill) and a row's
// piece of the rail (railPiece). The card's markup is
// timeline-route-detail-test's; these are the rules it draws from.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/timeline-row-role-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  endRowPill,
  originMark,
  railPiece,
  rowRole,
} from '../../src/features/routes/cards/timeline-row-role.ts';

const setStart = () => {};
const removeStart = () => {};
const row = (over = {}) => ({
  isStart: false,
  isEnd: false,
  hasStart: false,
  startCode: null,
  pickedCode: null,
  pickedPesos: undefined,
  onSetStart: setStart,
  onRemoveStart: removeStart,
  ...over,
});

test('a row outside the picks wears nothing', () => {
  assert.deepEqual(rowRole(row({ pickedPesos: '₱13' })), { mark: null, pill: null, action: null });
});

test('the start: its S, its code alone in its pill, × Remove as start under it', () => {
  const role = rowRole(
    row({ isStart: true, hasStart: true, startCode: 'YL03', pickedPesos: '₱20' }),
  );
  assert.equal(role.mark, 'start');
  assert.deepEqual(role.pill, { code: 'YL03' });
  assert.equal(role.action?.label, 'Remove as start');
  assert.equal(role.action?.isRemove, true);
  assert.equal(role.action?.onTap, removeStart);
});

test('a jeep’s start, with no code, has no pill; no handler, no button', () => {
  const role = rowRole(row({ isStart: true, hasStart: true, onRemoveStart: undefined }));
  assert.equal(role.pill, null);
  assert.equal(role.action, null);
});

test('the end: its E, its code and the ride’s pesos; Set as start only while no start is picked', () => {
  const alone = rowRole(row({ isEnd: true, pickedCode: 'YL06', pickedPesos: '₱20' }));
  assert.equal(alone.mark, 'end');
  assert.deepEqual(alone.pill, { code: 'YL06', pesos: '₱20' });
  assert.equal(alone.action?.label, 'Set as start');
  assert.equal(alone.action?.isRemove, false);
  assert.equal(alone.action?.onTap, setStart);

  const withStart = rowRole(row({ isEnd: true, hasStart: true, pickedPesos: '₱13' }));
  assert.deepEqual(withStart.pill, { code: null, pesos: '₱13' });
  assert.equal(withStart.action, null);
});

test('an end with no fare has no pill', () => {
  assert.equal(rowRole(row({ isEnd: true, pickedCode: 'YL06' })).pill, null);
});

test('the origin wears the S with no start, the E as the ride’s end with one, else nothing', () => {
  assert.equal(originMark(null, null), 'start');
  assert.equal(originMark(null, 'from'), 'start');
  assert.equal(originMark('h2', 'from'), 'end');
  assert.equal(originMark('h2', 'to'), null);
  assert.equal(originMark('h2', null), null);
});

test('an end row’s pill: code and pesos with a start and a fare, else none', () => {
  assert.deepEqual(endRowPill('h2', 'YL06', '₱20'), { code: 'YL06', pesos: '₱20' });
  assert.deepEqual(endRowPill('h2', null, '₱13'), { code: null, pesos: '₱13' });
  assert.equal(endRowPill(null, 'YL06', '₱20'), null);
  assert.equal(endRowPill('h2', 'YL06', undefined), null);
  assert.equal(endRowPill('h2', 'YL06', ''), null);
});

test('a row’s piece of the rail, from where the rail reaches it', () => {
  assert.deepEqual(railPiece({ hasAbove: true, hasBelow: true }), {
    connection: 'connected',
    piece: 'middle',
  });
  assert.deepEqual(railPiece({ hasAbove: false, hasBelow: true }), {
    connection: 'connected',
    piece: 'middleTop',
  });
  assert.deepEqual(railPiece({ hasAbove: true, hasBelow: false }), {
    connection: 'connected',
    piece: 'middleBottom',
  });
  assert.deepEqual(railPiece({ hasAbove: false, hasBelow: false }), {
    connection: 'disconnected',
    piece: 'middle',
  });
});
