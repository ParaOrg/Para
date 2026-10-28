// What the tiles upload deletes from the bucket (scripts/tiles/old-builds.mjs, called by
// scripts/tiles/upload.sh once current.json has moved). Deleting the file current.json points at
// would blank every commuter's map.
//
//   node --test tests/unit/tiles-old-builds-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { KEEP, buildsToDelete } from '../../scripts/tiles/old-builds.mjs';

const CLI = new URL('../../scripts/tiles/old-builds.mjs', import.meta.url).pathname;
const key = (file) => `tiles/${file}`;

test('the bucket keeps three builds: the new one and the two newest before it', () => {
  assert.equal(KEEP, 3);
  const files = [
    'parapo-2026-07-03-11.pmtiles',
    'parapo-2026-08-03-22.pmtiles',
    'parapo-2026-09-03-33.pmtiles',
    'parapo-2026-10-03-44.pmtiles',
    'parapo-2026-11-03-55.pmtiles',
  ];
  assert.deepEqual(buildsToDelete(files.map(key), ['parapo-2026-11-03-55.pmtiles']), [
    key(files[0]),
    key(files[1]),
  ]);
});

test('never the file current.json points at, nor the one it pointed at before, however old', () => {
  const files = [
    'parapo-2026-01-03-1.pmtiles',
    'parapo-2026-02-03-2.pmtiles',
    'parapo-2026-03-03-3.pmtiles',
    'parapo-2026-04-03-4.pmtiles',
  ];
  // The previous build is the oldest in the bucket, and stays; one slot is left for the newest other.
  const gone = buildsToDelete(files.map(key), [
    'parapo-2026-04-03-4.pmtiles',
    'parapo-2026-01-03-1.pmtiles',
  ]);
  assert.deepEqual(gone, [key(files[1])]);
  for (const kept of ['parapo-2026-04-03-4.pmtiles', 'parapo-2026-01-03-1.pmtiles']) {
    assert.ok(!gone.includes(key(kept)), `${kept} is kept`);
  }
});

test('oldest first by date, a name without a run id before one with, then by run id', () => {
  const files = [
    'parapo-2026-10-03-40.pmtiles',
    'parapo-2026-10-03.pmtiles',
    'parapo-2026-10-03-5.pmtiles',
    'parapo-2026-09-30-999.pmtiles',
    'parapo-2026-12-01-1.pmtiles',
  ];
  assert.deepEqual(buildsToDelete(files.map(key), ['parapo-2026-12-01-1.pmtiles']), [
    key('parapo-2026-09-30-999.pmtiles'),
    key('parapo-2026-10-03.pmtiles'),
  ]);
});

test('nothing that is not a build file under tiles/ is ever chosen', () => {
  const keys = [
    'tiles/current.json',
    'tiles/parapo-junk.pmtiles',
    'assets/parapo-2026-01-01-1.pmtiles',
    'tiles/parapo-2026-01-01-1.pmtiles.bak',
    'None',
    ...['01', '02', '03', '04'].map((m) => key(`parapo-2026-${m}-01-1.pmtiles`)),
  ];
  assert.deepEqual(buildsToDelete(keys, ['parapo-2026-04-01-1.pmtiles']), [
    key('parapo-2026-01-01-1.pmtiles'),
  ]);
});

test('a bucket with no more builds than it keeps loses none', () => {
  assert.deepEqual(buildsToDelete([], ['parapo-2026-04-01-1.pmtiles']), []);
  const two = ['parapo-2026-03-01-1.pmtiles', 'parapo-2026-04-01-1.pmtiles'];
  assert.deepEqual(buildsToDelete(two.map(key), [two[1]]), []);
});

/** Runs the command as upload.sh does: the bucket's listing on stdin. */
function run(listing, uploaded, pointerFile, previousFile) {
  const dir = mkdtempSync(join(tmpdir(), 'old-builds-'));
  const pointer = join(dir, 'current.json');
  writeFileSync(pointer, JSON.stringify({ file: pointerFile }));
  const args = [CLI, uploaded, pointer];
  if (previousFile !== undefined) {
    const previous = join(dir, 'previous.json');
    writeFileSync(previous, JSON.stringify({ file: previousFile }));
    args.push(previous);
  }
  return spawnSync(process.execPath, args, { input: listing, encoding: 'utf8' });
}

test("the command reads the bucket's tab-separated listing and prints a key per line", () => {
  const files = ['01', '02', '03', '04', '05'].map((m) => `parapo-2026-${m}-01-1.pmtiles`);
  const listing = files.map(key).join('\t') + '\n';
  const answer = run(listing, files[4], files[4], files[0]);
  assert.equal(answer.status, 0);
  assert.equal(answer.stdout, `${key(files[1])}\n${key(files[2])}\n`);
});

test('the command keeps the file current.json points at even when it is not the one uploaded', () => {
  const files = ['01', '02', '03', '04'].map((m) => `parapo-2026-${m}-01-1.pmtiles`);
  const answer = run(files.map(key).join('\t'), files[3], files[0]);
  assert.equal(answer.status, 0);
  assert.ok(!answer.stdout.includes(files[0]), answer.stdout);
});

test('an empty bucket listing ("None") deletes nothing', () => {
  const answer = run('None\n', 'parapo-2026-04-01-1.pmtiles', 'parapo-2026-04-01-1.pmtiles');
  assert.equal(answer.status, 0);
  assert.equal(answer.stdout, '');
});

test('a previous current.json that names no build file stops it, deleting nothing', () => {
  const files = ['01', '02', '03', '04'].map((m) => `parapo-2026-${m}-01-1.pmtiles`);
  const answer = run(files.map(key).join('\t'), files[3], files[3], 'evil.pmtiles');
  assert.equal(answer.status, 1);
  assert.equal(
    answer.stdout,
    '::error::The previous current.json names "evil.pmtiles", which is not a build file. Nothing was deleted.\n',
  );
});
