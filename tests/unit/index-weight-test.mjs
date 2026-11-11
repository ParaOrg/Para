// How heavy the published index is (scripts/publish/index-weight.mjs): its bytes, raw and
// gzipped, what each direction costs, which part of it weighs most, and when the publish says
// it has grown past its soft maximum.
//
//   node --test tests/unit/index-weight-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';

import {
  INDEX_SOFT_MAX_GZ_KB,
  indexWeight,
  indexWeightWarning,
} from '../../scripts/publish/index-weight.mjs';

const index = {
  schema: 5,
  published_at: '2026-11-11T00:00:00Z',
  variants: [{ id: 'a', overview: 'x'.repeat(600) }, { id: 'b' }],
  stops: [{ id: 's', name: 'y'.repeat(300) }],
  links: [{ route_variant_id: 'a', stop_id: 's', stop_sequence: 1 }],
};
const text = JSON.stringify(index);

test("the index's bytes, raw and gzipped, and what a direction costs", () => {
  const weight = indexWeight(text);
  assert.equal(weight.rawBytes, Buffer.byteLength(text));
  assert.equal(weight.gzippedBytes, gzipSync(Buffer.from(text)).length);
  assert.equal(weight.directions, 2);
  assert.equal(weight.gzippedBytesPerDirection, weight.gzippedBytes / 2);
});

test('each part as its share of the raw bytes: directions, hotspots, links', () => {
  const { shares } = indexWeight(text);
  assert.ok(shares.variants > shares.stops && shares.stops > shares.links, JSON.stringify(shares));
  const total = shares.variants + shares.stops + shares.links;
  assert.ok(total > 0.9 && total <= 1, `the three parts are nearly all of it: ${total}`);
});

test('an index with no directions costs nothing per direction, and does not divide by zero', () => {
  const empty = indexWeight(JSON.stringify({ schema: 5, variants: [], stops: [], links: [] }));
  assert.equal(empty.directions, 0);
  assert.equal(empty.gzippedBytesPerDirection, 0);
});

test('the publish warns only above the soft maximum, in words a person can act on', () => {
  const atMax = INDEX_SOFT_MAX_GZ_KB * 1024;
  assert.equal(indexWeightWarning(atMax), null);
  assert.equal(indexWeightWarning(41_000), null);
  const warning = indexWeightWarning(atMax + 1);
  assert.match(warning, /^::warning::/);
  assert.match(warning, new RegExp(`${INDEX_SOFT_MAX_GZ_KB} kB`));
});
