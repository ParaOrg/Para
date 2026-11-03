// The studio's name for an upload's vehicle (src/features/studio/contributors/contribution-format.ts):
// every kind the database's contribution.vehicle check allows has a label of its own, so the
// Contributors map never shows a raw value such as e_jeep.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/vehicle-name-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

import { vehicleName } from '../../src/features/studio/contributors/contribution-format.ts';

const MIGRATIONS = new URL('../../supabase/migrations/', import.meta.url);

/** The kinds in the last migration that adds contribution_vehicle_check. */
function allowedVehicles() {
  const files = readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  let kinds = null;
  for (const name of files) {
    const sql = readFileSync(new URL(name, MIGRATIONS), 'utf8');
    const check = sql.match(
      /contribution_vehicle_check\s+check\s*\(\s*vehicle\s+in\s*\(([^)]*)\)/i,
    );
    if (check) kinds = [...check[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  }
  assert.ok(kinds, 'a migration adds contribution_vehicle_check');
  return kinds;
}

test('every kind the database allows has a label, not its raw value', () => {
  const kinds = allowedVehicles();
  assert.ok(kinds.includes('e_jeep') && kinds.includes('uv_express'), kinds.join(', '));
  for (const kind of kinds) assert.notEqual(vehicleName(kind), kind, kind);
});

test('the two newest kinds read as the account screen names them', () => {
  assert.equal(vehicleName('e_jeep'), 'E-Jeep');
  assert.equal(vehicleName('uv_express'), 'UV Express');
});

test('no vehicle is Not said; a kind the studio does not know shows as stored', () => {
  assert.equal(vehicleName(null), 'Not said');
  assert.equal(vehicleName('kalesa'), 'kalesa');
  assert.equal(vehicleName('toString'), 'toString');
});
