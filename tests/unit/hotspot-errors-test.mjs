// What the studio's hotspot save says when the database answers badly
// (src/features/studio/data/hotspots-write.ts, saveHotspot): the terminal that
// is already there under either index name, any other refusal, and a saved row
// that cannot be read back.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/hotspot-errors-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase } from './fixtures/fake-supabase.mjs';
import { setSupabase } from '../../src/features/studio/data/supabase.ts';
import { saveHotspot } from '../../src/features/studio/data/hotspots-write.ts';

const ring = [
  [121.04, 14.7],
  [121.0401, 14.7],
  [121.0401, 14.7001],
  [121.04, 14.7001],
];
const input = {
  hotspotId: null,
  kind: 'terminal',
  name: 'Tala Terminal',
  informal: 'Tala',
  aliases: [],
  note: '',
  ring,
  directions: [],
};
const refusing = (error) =>
  fakeSupabase((q) => {
    if (q.table === 'stop' && q.op === 'insert') return { error };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
const unique = (name) => ({ code: '23505', message: `duplicate key value violates "${name}"` });

test('a second terminal at a place is refused under the older index name too, with the same words', async () => {
  for (const index of ['stop_terminal_place_unique', 'stop_terminal_informal_unique']) {
    setSupabase(refusing(unique(index)).client);
    await assert.rejects(
      saveHotspot(input),
      /There is already a terminal at "Tala"\. A place has one terminal; draw the others as hintuans under the same name\./,
      index,
    );
  }
});

test('the refusal names the ground name when the terminal has no informal one', async () => {
  setSupabase(refusing(unique('stop_terminal_place_unique')).client);
  await assert.rejects(
    saveHotspot({ ...input, informal: '' }),
    /There is already a terminal at "Tala Terminal"\./,
  );
});

test("any other refusal is thrown with the database's own words", async () => {
  setSupabase(
    refusing({ code: '42501', message: 'new row violates row-level security policy' }).client,
  );
  await assert.rejects(saveHotspot(input), /new row violates row-level security policy/);
  // A unique violation on another index is not the terminal's.
  setSupabase(refusing(unique('stop_pkey')).client);
  await assert.rejects(saveHotspot(input), /duplicate key value violates "stop_pkey"/);
});

test('a saved row that cannot be read back says so, names the field, and writes no links', async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'stop' && q.op === 'insert') return { data: { id: 's1', name: 5 } };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  let heard = null;
  await assert.rejects(
    saveHotspot(input, (id) => (heard = id)),
    /The hotspot was saved but could not be read back: name /,
  );
  assert.equal(heard, null);
  assert.equal(log.filter((q) => q.table === 'route_stop').length, 0);
});
