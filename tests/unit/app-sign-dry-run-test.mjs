// Which jobs of the contributor app's workflow run for which trigger
// (.github/workflows/contributor-app.yml, ADR 0006). A release tag builds, signs, lays out and
// publishes. A dry run, "Run workflow" on main with its box ticked, builds and signs and stops
// there: it publishes nothing, and from any other branch it never reaches the job that holds
// the key.
//
//   node --test tests/unit/app-sign-dry-run-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const WORKFLOW = readFileSync(
  new URL('../../.github/workflows/contributor-app.yml', import.meta.url),
  'utf8',
);
/** The workflow with its comment lines left out. */
const TEXT = WORKFLOW.split('\n')
  .filter((line) => !line.trim().startsWith('#'))
  .join('\n');

/** Each job's own text, by its key: the lines from `  key:` to the next job. */
const JOBS = Object.fromEntries(
  TEXT.slice(TEXT.indexOf('\njobs:\n'))
    .split(/\n(?= {2}[\w-]+:\n)/)
    .slice(1)
    .map((job) => [/^ {2}([\w-]+):/.exec(job)[1], job]),
);

/** A job's own `if:`, as GitHub reads it, or null when it has none. */
const condition = (job) => {
  const line = /^ {4}if: (.+)$/m.exec(JOBS[job])?.[1].trim();
  return line ? line.replace(/^\$\{\{\s*|\s*\}\}$/g, '') : null;
};
/** The jobs a job waits on. */
const needs = (job) => {
  const line = /^ {4}needs: (.+)$/m.exec(JOBS[job])?.[1].trim() ?? '';
  return line
    .replace(/[[\]]/g, '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
};
/**
 * Whether a job runs for a trigger: its own `if:` holds and every job it waits on ran. The
 * conditions here use only what JavaScript reads the same way: ==, !, && and ||, quoted text and
 * startsWith.
 */
const runs = (job, trigger) => {
  const own = condition(job);
  const holds =
    own === null ||
    Boolean(
      runInNewContext(own, {
        github: { ref: trigger.ref, event_name: trigger.event },
        inputs: trigger.inputs ?? {},
        startsWith: (text, start) => String(text).startsWith(start),
      }),
    );
  return holds && needs(job).every((needed) => runs(needed, trigger));
};

const RELEASE = { ref: 'refs/tags/app-v0.4.1', event: 'push' };
const DRY_RUN = {
  ref: 'refs/heads/main',
  event: 'workflow_dispatch',
  inputs: { sign_dry_run: true },
};
const dryRunFrom = (ref) => ({ ...DRY_RUN, ref });
const NOT_A_RELEASE = [
  ['a push to staging', { ref: 'refs/heads/staging', event: 'push' }],
  ['a pull request', { ref: 'refs/pull/970/merge', event: 'pull_request' }],
  ['"Run workflow" on main, the box not ticked', { ...DRY_RUN, inputs: { sign_dry_run: false } }],
  ['"Run workflow" on staging, the box ticked', dryRunFrom('refs/heads/staging')],
  ['"Run workflow" on a branch, the box ticked', dryRunFrom('refs/heads/claude/some-branch')],
  ['"Run workflow" on another tag, the box ticked', dryRunFrom('refs/tags/test-latest')],
];
const DEBUG_JOBS = ['debug', 'emulator-ride', 'emulator-notification'];

test('the workflow has the jobs this check knows', () => {
  assert.deepEqual(Object.keys(JOBS), [
    ...DEBUG_JOBS,
    'test-latest',
    'build-release',
    'sign',
    'release-files',
    'publish',
  ]);
});

test('a release tag builds, signs, lays out and publishes, and builds no debug APK', () => {
  for (const job of ['build-release', 'sign', 'release-files', 'publish']) {
    assert.equal(runs(job, RELEASE), true, job);
  }
  for (const job of [...DEBUG_JOBS, 'test-latest']) assert.equal(runs(job, RELEASE), false, job);
});

test('a dry run on main builds and signs, and stops there: nothing is laid out or published', () => {
  assert.equal(runs('build-release', DRY_RUN), true);
  assert.equal(runs('sign', DRY_RUN), true);
  assert.equal(runs('release-files', DRY_RUN), false);
  assert.equal(runs('publish', DRY_RUN), false);
  for (const job of [...DEBUG_JOBS, 'test-latest']) assert.equal(runs(job, DRY_RUN), false, job);
});

test('nothing else reaches the release jobs: no other branch, tag or trigger, box ticked or not', () => {
  for (const [name, trigger] of NOT_A_RELEASE) {
    for (const job of ['build-release', 'sign', 'release-files', 'publish']) {
      assert.equal(runs(job, trigger), false, `${job} for ${name}`);
    }
  }
});

test("the job that holds the key carries the guard itself: a dry run's code is main's", () => {
  // Its own condition, not only the build's it waits on: the two say the same.
  assert.equal(condition('sign'), condition('build-release'));
  assert.match(condition('sign'), /inputs\.sign_dry_run && github\.ref == 'refs\/heads\/main'/);
  // Only `sign` names the environment that holds the passphrase, and only it names the secret.
  for (const [job, text] of Object.entries(JOBS)) {
    assert.equal(/environment: app-release/.test(text), job === 'sign', `${job}: the environment`);
    assert.equal(/secrets\.PARAPO_KEY_PASSPHRASE/.test(text), job === 'sign', `${job}: the secret`);
  }
});

test('the box is off unless ticked, and a dry run keeps no signed APK', () => {
  const input = /\n {2}workflow_dispatch:\n {4}inputs:\n {6}sign_dry_run:\n((?: {8}.+\n)+)/.exec(
    TEXT,
  )?.[1];
  assert.ok(input, 'workflow_dispatch has the sign_dry_run input');
  assert.match(input, /^ {8}type: boolean$/m);
  assert.match(input, /^ {8}default: false$/m);
  // The signed APK is handed on for a release tag only.
  const upload = /\n {6}- uses: actions\/upload-artifact@[^\n]+\n((?: {8}.+\n)+)/.exec(
    JOBS.sign,
  )?.[1];
  assert.ok(upload, '`sign` uploads its APK');
  assert.match(upload, /^ {8}if: startsWith\(github\.ref, 'refs\/tags\/app-v'\)$/m);
  assert.match(upload, /name: signed-apk/);
});

test('with the debug jobs as they were for every other trigger', () => {
  for (const [name, trigger] of NOT_A_RELEASE) {
    for (const job of DEBUG_JOBS) assert.equal(runs(job, trigger), true, `${job} for ${name}`);
  }
  assert.equal(runs('test-latest', NOT_A_RELEASE[0][1]), true, 'test-latest on staging');
  assert.equal(runs('test-latest', NOT_A_RELEASE[1][1]), false, 'test-latest on a pull request');
});
