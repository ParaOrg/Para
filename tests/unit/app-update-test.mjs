// The app's update check (src/features/contribute/app-update/): the release file's shape, the
// version arithmetic and what the installed app does about each answer; and the file the release
// workflow writes (scripts/publish/app-release-file.mjs), which must be one the app reads.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/app-update-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { updateOf } from '../../src/features/contribute/app-update/app-version.ts';
import { versionCodeOf } from '../../src/features/contribute/app-update/version-code.ts';
import { readLatestRelease } from '../../src/features/contribute/app-update/fetch-latest-release.ts';
import { textOfResponse } from '../../src/features/contribute/app-update/response-text.ts';
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

test("the version code stays inside Android's limit and is read strictly", () => {
  assert.equal(versionCodeOf('2100.999.999'), 2100999999);
  assert.ok(versionCodeOf('2100.999.999') < 2147483647);
  assert.equal(versionCodeOf('2101.0.0'), null);
  assert.equal(versionCodeOf('1.1000.0'), null);
  assert.equal(versionCodeOf('1.0.1000'), null);
  assert.equal(versionCodeOf('12345.0.0'), null);
  assert.equal(versionCodeOf('1.2.3\n'), null);
  assert.equal(versionCodeOf(' 1.2.3'), null);
  assert.equal(versionCodeOf('1.2.3-dev'), null);
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
    { ...RELEASE, minVersion: '2101.0.0' },
    { ...RELEASE, url: 'http://github.com/o/r/releases/latest/download/parapo-contributor.apk' },
    { ...RELEASE, url: 'javascript:alert(1)' },
    { ...RELEASE, url: 'intent://github.com/#Intent;scheme=https;end' },
    { ...RELEASE, url: 'https://evil.example/parapo-contributor.apk' },
    { ...RELEASE, url: 'https://github.com.evil.example/parapo-contributor.apk' },
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

test('a native answer is text only when it is a 2xx answer with a text body', () => {
  assert.equal(textOfResponse({ status: 200, data: '{}' }), '{}');
  assert.equal(textOfResponse({ status: 299, data: 'x' }), 'x');
  assert.throws(() => textOfResponse({ status: 404, data: 'Not Found' }), /HTTP 404/);
  assert.throws(() => textOfResponse({ status: 302, data: '' }), /HTTP 302/);
  assert.throws(() => textOfResponse({ status: 500, data: '' }), /HTTP 500/);
  assert.throws(() => textOfResponse({ status: 200, data: { a: 1 } }), /not text/);
});

test('the release file is read from what the phone answers; only a bad file is warned about', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const url = RELEASE.url;
  const reads = (text) => readLatestRelease(url, async () => text);

  assert.deepEqual(await reads(JSON.stringify(RELEASE)), RELEASE);
  assert.equal(warn.mock.callCount(), 0);

  // Offline, or a non-2xx answer: the read fails and says nothing.
  await assert.rejects(
    readLatestRelease(url, async () => textOfResponse({ status: 404, data: 'Not Found' })),
    /HTTP 404/,
  );
  await assert.rejects(
    readLatestRelease(url, async () => {
      throw new Error('offline');
    }),
    /offline/,
  );
  assert.equal(warn.mock.callCount(), 0);

  // Reached, but not a release file: it fails and warns.
  await assert.rejects(reads('<html>not json</html>'), /not JSON/);
  assert.equal(warn.mock.callCount(), 1);
  await assert.rejects(reads(JSON.stringify({ ...RELEASE, versionCode: 'x' })), /not a release/);
  assert.equal(warn.mock.callCount(), 2);
});
