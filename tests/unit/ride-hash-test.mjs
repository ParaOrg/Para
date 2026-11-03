// The ride screen's hash (src/features/contribute/navigation/screen-routes.ts): `#ride/<id>`.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/ride-hash-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  orderOf,
  rideHashOf,
  rideIdOf,
  screenHashOf,
} from '../../src/features/contribute/navigation/screen-routes.ts';

const ID = '3f2b8c1e-6d4a-4f7b-9a2e-1c5d8e9f0a1b';

test('a ride hash round-trips its id', () => {
  assert.equal(rideHashOf(ID), `#ride/${ID}`);
  assert.equal(rideIdOf(rideHashOf(ID)), ID);
});

test('a hash that is not a ride, or names no recording, opens none', () => {
  assert.equal(rideIdOf('#history'), null);
  assert.equal(rideIdOf('#ride'), null);
  assert.equal(rideIdOf('#ride/'), null);
  assert.equal(rideIdOf('#ride/not-an-id'), null);
  assert.equal(rideIdOf(`#rides/${ID}`), null);
});

test('a ride hash is the ride screen, past History and short of Account', () => {
  assert.equal(screenHashOf(rideHashOf(ID)), '#ride');
  assert.equal(screenHashOf('#history'), '#history');
  assert.ok(orderOf(rideHashOf(ID)) > orderOf('#history'));
  assert.ok(orderOf(rideHashOf(ID)) < orderOf('#profile'));
});
