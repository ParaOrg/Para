// The app's update check (src/features/contribute/app-update/): the release file's shape, the
// version arithmetic and what the installed app does about each answer; and the file the release
// workflow writes (scripts/publish/app-release-file.mjs), which must be one the app reads.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/app-update-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { updateOf, versionCodeOf } from '../../src/features/contribute/app-update/app-version.ts';
import { latestReleaseSchema } from '../../src/features/contribute/app-update/latest-release-schema.ts';
import { latestReleaseText } from '../../scripts/publish/app-release-file.mjs';

const RELEASE = {
  version: '1.2.3',
  versionCode: 1002003,
  url: 'https://github.com/o/r/releases/latest/download/parapo-contributor.apk',
  minVersion: '1.0.0',
};

test('a version name gives the code the workflow gives the APK', () => {
  assert.equal(versionCodeOf('1.2.3'), 1002003);
  assert.equal(versionCodeOf('0.0.1'), 1);
  assert.equal(versionCodeOf('2.10.0'), 2010000);
  assert.equal(versionCodeOf('0.0.0-dev'), null);
  assert.equal(versionCodeOf('1.2'), null);
});

test('the installed app is current, behind, or below the minimum', () => {
  assert.equal(updateOf(1002003, RELEASE), 'current');
  assert.equal(updateOf(1003000, RELEASE), 'current');
  assert.equal(updateOf(1001000, RELEASE), 'available');
  assert.equal(updateOf(1000000, RELEASE), 'available');
  assert.equal(updateOf(999999, RELEASE), 'required');
  assert.equal(updateOf(1, { ...RELEASE, minVersion: '0.0.0' }), 'available');
  assert.equal(updateOf(1002003, { ...RELEASE, minVersion: '1.2.3' }), 'current');
});

test('the release file is read with Zod and anything else is refused', () => {
  assert.ok(latestReleaseSchema.safeParse(RELEASE).success);
  for (const bad of [
    null,
    {},
    { ...RELEASE, versionCode: '1002003' },
    { ...RELEASE, versionCode: 0 },
    { ...RELEASE, versionCode: 1.5 },
    { ...RELEASE, url: 'not a url' },
    { ...RELEASE, minVersion: 'latest' },
    { ...RELEASE, version: '' },
  ]) {
    assert.equal(latestReleaseSchema.safeParse(bad).success, false, JSON.stringify(bad));
  }
});

test('the workflow writes a file the app reads, and refuses a contradictory one', () => {
  const input = {
    version: '1.2.3',
    versionCode: 1002003,
    minVersion: '1.0.0',
    apkUrl: 'https://github.com/o/r/releases/latest/download/parapo-contributor.apk',
  };
  assert.deepEqual(JSON.parse(latestReleaseText(input)), RELEASE);
  assert.throws(() => latestReleaseText({ ...input, versionCode: 5 }), /has code 1002003/);
  assert.throws(() => latestReleaseText({ ...input, minVersion: '2.0.0' }), /newer than/);
  assert.throws(() => latestReleaseText({ ...input, apkUrl: 'nope' }), /not a release file/);
});
