// Para's copy of the Philippines extract (scripts/osm-mirror, .scratch/extract-mirror/plan.md):
// where it is and comes from, and the record beside it that the builds read their dates from.
//
//   node --test tests/unit/osm-mirror-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MIRROR_KEYS,
  MIRROR_SOURCES,
  MIRROR_URL,
  mirrorRecord,
  readMirrorRecord,
} from '../../scripts/osm-mirror/mirror-file.mjs';

const GOOD = {
  source: 'https://download.geofabrik.de/asia/philippines/philippines-latest.osm.pbf',
  lastModified: 'Mon, 23 Nov 2026 21:48:10 GMT',
  extractAt: '2026-11-22T21:20:48Z',
  bytes: 614_820_870,
  md5: '0123456789abcdef0123456789abcdef',
  copiedAt: '2026-11-24T04:25:07Z',
};

test('the copy is the bucket para-osm through its own domain, Geofabrik first, then openstreetmap.fr', () => {
  assert.equal(MIRROR_URL, 'https://osm.para-commute.org');
  assert.deepEqual(MIRROR_KEYS, {
    extract: 'philippines-latest.osm.pbf',
    md5: 'philippines-latest.osm.pbf.md5',
    record: 'philippines-latest.json',
  });
  assert.deepEqual(
    MIRROR_SOURCES.map(({ name }) => name),
    ['Geofabrik', 'openstreetmap.fr'],
  );
  for (const { extract, md5 } of MIRROR_SOURCES) {
    assert.match(extract, /^https:\/\/[^/]+\/.+\.osm\.pbf$/);
    assert.equal(md5, `${extract}.md5`);
  }
});

test('a record carries both dates in ISO form, the size and md5, and the licence; it reads back', () => {
  const text = mirrorRecord(GOOD);
  const record = readMirrorRecord(text);
  assert.equal(record.last_modified, '2026-11-23T21:48:10.000Z');
  assert.equal(record.extract_at, '2026-11-22T21:20:48.000Z');
  assert.equal(record.bytes, GOOD.bytes);
  assert.equal(record.license, 'ODbL-1.0');
  assert.equal(record.attribution, '© OpenStreetMap contributors');
});

test('a record a build could not trust is refused', () => {
  const bad = [
    { source: 'https://evil.example/philippines.osm.pbf' },
    { lastModified: 'yesterday-ish' },
    { extractAt: '' },
    { bytes: 1_000 },
    { md5: 'not-an-md5' },
  ];
  for (const change of bad)
    assert.throws(() => mirrorRecord({ ...GOOD, ...change }), JSON.stringify(change));
  assert.throws(() => readMirrorRecord('{"schema":2}'));
});
