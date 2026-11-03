// The fare as the upload sends it (uploadedFare in src/features/contribute/api/upload-fare.ts)
// and as the payload schema holds it: what the database would refuse, and with it the whole ride,
// never goes up.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/uploaded-fare-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { uploadedFare } from '../../src/features/contribute/api/upload-fare.ts';
import { contributionPayloadSchema } from '../../src/features/contribute/api/contribution-payload-schema.ts';

test('a fare from 0 to 2000 goes up in whole centavos', () => {
  assert.equal(uploadedFare(0), 0);
  assert.equal(uploadedFare(13), 13);
  assert.equal(uploadedFare(45.5), 45.5);
  assert.equal(uploadedFare(12.345), 12.35);
  assert.equal(uploadedFare(2000), 2000);
  assert.equal(uploadedFare(2000.004), 2000);
});

test('no fare, or one the database would refuse, is left out: the ride still goes', () => {
  for (const fare of [undefined, null, -0.01, -5, 2000.01, 5000, Number.NaN, Infinity]) {
    assert.equal(uploadedFare(fare), null, String(fare));
  }
});

test('the payload schema holds the database bounds: 0 to 2000, whole centavos, or none', () => {
  const fareOk = (fare) => contributionPayloadSchema.shape.fare_php.safeParse(fare).success;
  for (const fare of [undefined, null, 0, 13, 45.5, 12.35, 2000])
    assert.ok(fareOk(fare), String(fare));
  for (const fare of [-1, 2000.01, 12.345, Number.NaN, '45'])
    assert.ok(!fareOk(fare), String(fare));
});
