// Whether a tag may go out as a release of the contributor app
// (scripts/publish/release-guard.mjs), before anything is built or the signing key is touched:
// it is on main, CI passed for it, and it is one step above the last release.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/release-guard-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  REQUIRED_CHECKS,
  checksFor,
  releaseRefusal,
} from '../../scripts/publish/release-guard.mjs';

const green = Object.fromEntries(REQUIRED_CHECKS.map((name) => [name, 'success']));
/** A release that may go out: 0.4.0 after 0.3.0, on main, CI green. */
const good = { tag: 'app-v0.4.0', isOnMain: true, checks: green, released: ['app-v0.3.0'] };

test('a tag on main, CI green, one step above the last release, may go out', () => {
  assert.equal(releaseRefusal(good), null);
  // The three steps: the next patch, the next minor, the next major.
  for (const tag of ['app-v0.3.1', 'app-v0.4.0', 'app-v1.0.0'])
    assert.equal(releaseRefusal({ ...good, tag }), null, tag);
});

test('a tag that is not a commit of main is refused', () => {
  assert.match(releaseRefusal({ ...good, isOnMain: false }), /is not on main/);
});

test('a tag whose commit CI did not pass is refused, and so is one CI never ran on', () => {
  const red = releaseRefusal({ ...good, checks: { ...green, 'The editor': 'failure' } });
  assert.match(red, /"The editor" did not pass \(failure\)/);
  const none = releaseRefusal({ ...good, checks: {} });
  assert.match(none, /"Build and the public map" has not run/);
});

test('a version at or under the last release is refused', () => {
  assert.match(
    releaseRefusal({ ...good, tag: 'app-v0.2.9' }),
    /0\.2\.9 is not newer than the last release, 0\.3\.0/,
  );
  assert.match(
    releaseRefusal({ ...good, tag: 'app-v0.3.0', released: ['app-v0.3.1', 'app-v0.3.0'] }),
    /0\.3\.0 is not newer than the last release, 0\.3\.1/,
  );
});

test('a bump of more than one step is refused: a typo would strand every later release', () => {
  for (const tag of [
    'app-v0.40.0',
    'app-v0.5.0',
    'app-v0.3.2',
    'app-v2.0.0',
    'app-v0.4.1',
    'app-v1.1.0',
  ])
    assert.match(releaseRefusal({ ...good, tag }), /is not one step after 0\.3\.0/, tag);
  assert.match(releaseRefusal({ ...good, tag: 'app-v0.40.0' }), /0\.3\.1, 0\.4\.0 or 1\.0\.0/);
});

test('the last release is the highest version released, whatever order they come in', () => {
  const released = ['app-v0.2.0', 'test-latest', 'app-v0.3.0', 'app-v0.1.5', 'not-a-version'];
  assert.equal(releaseRefusal({ ...good, released }), null);
  assert.match(releaseRefusal({ ...good, tag: 'app-v0.2.1', released }), /not newer/);
});

test('the same tag run again is the same release, not a new one', () => {
  assert.equal(
    releaseRefusal({ ...good, tag: 'app-v0.4.0', released: ['app-v0.4.0', 'app-v0.3.0'] }),
    null,
  );
});

test('with no release yet, the first may carry any version', () => {
  assert.equal(releaseRefusal({ ...good, tag: 'app-v0.1.0', released: [] }), null);
  assert.equal(releaseRefusal({ ...good, tag: 'app-v1.0.0', released: ['test-latest'] }), null);
});

test('a tag that is not app-v<major>.<minor>.<patch> is refused', () => {
  for (const tag of ['app-v0.4', 'v0.4.0', 'app-v0.4.0-beta', 'app-v9999.0.0'])
    assert.match(releaseRefusal({ ...good, tag }), /is not app-v/, tag);
});

// ------------------------------------------------- the nightly publishes on main's tip
/** A nightly publish: the published map's files alone, and no CI. */
const publish = { files: ['public/data/index.v5.json', 'public/data/lines/a.json'], checks: {} };
/** The release's own commit: code, and CI's verdict. */
const release = (checks) => ({ files: ['src/app/contribute/main.tsx', 'package.json'], checks });

test("a tag on a nightly publish reads CI's result off the release under it", () => {
  assert.deepEqual(checksFor([publish, release(green)]), green);
  assert.deepEqual(checksFor([publish, publish, publish, release(green)]), green);
  assert.equal(releaseRefusal({ ...good, checks: checksFor([publish, release(green)]) }), null);
});

test('a red release under a nightly publish is still refused', () => {
  const red = { ...green, 'Build and the public map': 'failure' };
  assert.match(
    releaseRefusal({ ...good, checks: checksFor([publish, release(red)]) }),
    /"Build and the public map" did not pass \(failure\)/,
  );
});

test('only a commit of the published map alone is stepped over', () => {
  // Code with no CI result is not stepped over to a green commit under it.
  assert.deepEqual(checksFor([release({}), release(green)]), {});
  const mixed = { files: ['public/data/index.v5.json', 'src/main.ts'], checks: {} };
  assert.deepEqual(checksFor([mixed, release(green)]), {});
  // Nor is a commit that names no file at all.
  assert.deepEqual(checksFor([{ files: [], checks: {} }, release(green)]), {});
  assert.match(releaseRefusal({ ...good, checks: checksFor([release({})]) }), /has not run/);
});

test('a publish commit that did run CI speaks for itself', () => {
  const ran = { ...publish, checks: { ...green, 'The editor': 'failure' } };
  assert.equal(checksFor([ran, release(green)])['The editor'], 'failure');
});

test('nothing but publishes as far back as was read: no result, and refused', () => {
  assert.deepEqual(checksFor([publish, publish]), {});
  assert.match(releaseRefusal({ ...good, checks: checksFor([publish, publish]) }), /has not run/);
});
