// A pull request in a merge queue gets CI's verdict before it lands (.github/workflows/ci.yml):
// the workflow runs on the queue's event, runs every suite there, keeps the queue off the live
// services, and still holds the list of long files to shrinking.
//
//   node --test tests/unit/merge-queue-test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const WORKFLOW = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
/** The workflow without its comment lines, so a word in a comment proves nothing. */
const CODE = WORKFLOW.split('\n')
  .filter((line) => !line.trim().startsWith('#'))
  .join('\n');

test('CI runs on a merge queue’s commit, beside pushes and pull requests', () => {
  const on = /^on:\n((?: .*\n|\n)+)/m.exec(CODE)[1];
  for (const trigger of ['push', 'pull_request', 'merge_group', 'workflow_dispatch', 'schedule']) {
    assert.match(on, new RegExp(`^  ${trigger}:`, 'm'), `on: has ${trigger}`);
  }
});

test('only a pull request narrows what runs: a merge queue’s run selects every suite', () => {
  const everything = /if \[ "\$EVENT" != "pull_request" \]; then\n([\s\S]*?)exit 0/.exec(CODE);
  assert.ok(everything, 'the changes job runs everything for any event but a pull request');
  for (const output of ['public', 'studio', 'contribute', 'build', 'drawing']) {
    assert.ok(everything[1].includes(`echo "${output}=true"`), `${output} is on`);
  }
  assert.ok(everything[1].includes('preview=$ALL_PREVIEWS'), 'every built-app suite is on');
});

test('a merge queue’s run, like a pull request’s, reaches no live service', () => {
  const live = /^ {2}PARA_LIVE_SERVICES: (.+)$/m.exec(CODE)[1];
  assert.equal(
    live,
    "${{ github.event_name != 'pull_request' && github.event_name != 'merge_group' && '1' || '' }}",
  );
});

test('the long-files list may only shrink in a merge queue too: its base is the queue’s', () => {
  assert.ok(
    CODE.includes(
      'BASE: ${{ github.event.pull_request.base.sha || github.event.merge_group.base_sha }}',
    ),
  );
});

test('the three checks a ruleset requires are still jobs of this workflow, by those names', () => {
  for (const name of ['What changed', 'Build and the public map', 'The editor']) {
    assert.ok(CODE.includes(`    name: ${name}\n`), `a job named "${name}"`);
  }
});
