// The publish's deploy key can push straight to main, so it is never on the
// runner's disk while third-party code runs: the checkout keeps no
// credential, the install runs no package's scripts, and only the step that
// checks the key is set and the step that pushes ever read the secret
// (.github/workflows/publish-map.yml).
//
//   node --test tests/unit/publish-workflow-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const WORKFLOW = readFileSync(
  new URL('../../.github/workflows/publish-map.yml', import.meta.url),
  'utf8',
);

/** The publish job's steps as text, each from its `- ` to the next, comments left out. */
const STEPS = WORKFLOW.slice(WORKFLOW.indexOf('    steps:\n'))
  .split('\n')
  .filter((line) => !line.trim().startsWith('#'))
  .join('\n')
  .split(/\n(?= {6}- )/)
  .slice(1);

const stepNamed = (name) => STEPS.find((step) => step.includes(`name: ${name}\n`));

test('the checkout keeps no credential and is given no key', () => {
  const checkout = STEPS.find((step) => step.includes('uses: actions/checkout@'));
  assert.ok(checkout, 'there is a checkout');
  assert.match(checkout, /persist-credentials: false/);
  assert.doesNotMatch(checkout, /ssh-key|token:/);
});

test('the install runs no package scripts', () => {
  const install = stepNamed('Install the runtime dependencies');
  assert.ok(install, 'there is an install step');
  assert.match(install, /npm ci --omit=dev --ignore-scripts/);
});

test('only the key check and the commit step read the deploy key', () => {
  const readers = STEPS.filter((step) => step.includes('secrets.PUBLISH_DEPLOY_KEY')).map(
    (step) => step.match(/name: (.+)/)?.[1],
  );
  assert.deepEqual(readers, ['Check the deploy key is set', 'Commit if the map changed']);
});

test('the commit step deletes the key however the step ends', () => {
  const commit = stepNamed('Commit if the map changed');
  assert.ok(commit, 'there is a commit step');
  assert.match(commit, /trap 'rm -f "\$key"[^']*' EXIT/);
  assert.match(commit, /GIT_SSH_COMMAND=/);
  assert.match(commit, /StrictHostKeyChecking=yes/);
});
