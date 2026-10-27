// The publish's probe of private tables (scripts/publish/privacyProbe.mjs).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/privacy-probe-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRIVATE_TABLES, privacyLeaks } from '../../scripts/publish/privacyProbe.mjs';

test('refused, missing or empty passes', async () => {
  const answers = { contributor: 401, contribution: 403, hinto: 404 };
  const leaks = await privacyLeaks(async (t) => ({ status: answers[t] ?? 200, body: [] }));
  assert.deepEqual(leaks, []);
});

test('a row back fails, naming the table', async () => {
  const leaks = await privacyLeaks(async (t) =>
    t === 'draft' ? { status: 200, body: [{ id: 'x' }] } : { status: 401, body: {} },
  );
  assert.deepEqual(leaks, ['draft: the publishable key reads its rows. Not publishing.']);
});

test('an answer that proves nothing fails', async () => {
  const leaks = await privacyLeaks(async (t) => {
    if (t === 'hinto') throw new Error('timeout');
    return t === 'editor_name' ? { status: 500, body: null } : { status: 404, body: {} };
  });
  assert.equal(leaks.length, 2);
  assert.match(leaks[0], /^editor_name: answered HTTP 500/);
  assert.match(leaks[1], /^hinto: could not ask \(timeout\)/);
});

test('every private table is asked about', async () => {
  const asked = [];
  await privacyLeaks(async (t) => (asked.push(t), { status: 404, body: {} }));
  assert.deepEqual(asked.sort(), [...PRIVATE_TABLES].sort());
  for (const t of [
    'contributor',
    'contribution',
    'point_batch',
    'hinto',
    'contribution_use',
    'draft',
    'editor_name',
  ])
    assert.ok(PRIVATE_TABLES.includes(t), t);
});
