// What a pull request runs when the branch it would merge into has a merge queue
// (.github/workflows/ci.yml, the `changes` job): the build job's checks alone, since the queue
// runs every suite on the commit the merge would make. With no queue, or when GitHub's rules
// cannot be read, a pull request runs every suite its files select, as it always did; and a
// queue's own run, like a push, runs everything.
//
// The job's script is run here as the runner runs it, with `git` and `gh` answered by the test.
//
//   node --test tests/unit/queue-narrows-pull-request-test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const WORKFLOW = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');

/** The `changes` job's selecting step: its script, as the runner would run it. */
const SCRIPT = (() => {
  const step = WORKFLOW.slice(WORKFLOW.indexOf('      - id: scope\n')).split(/\n\n/)[0];
  const lines = step.slice(step.indexOf('        run: |\n')).split('\n').slice(1);
  return lines.map((line) => line.slice(10)).join('\n');
})();

const RULES = ['deletion', 'non_fast_forward', 'pull_request', 'required_status_checks'];
const WITH_QUEUE = [...RULES, 'merge_queue'];

/**
 * The step's outputs for an event. `files` is what the pull request changed; `rules` is what
 * GitHub answers for the base branch's rules, or null when the request fails. `asked` says
 * whether the rules were asked for at all.
 */
function selected({ event = 'pull_request', files = [], rules = RULES, base = 'staging' }) {
  const answer =
    rules === null ? 'return 1' : `printf '%s\\n' ${rules.map((rule) => `'${rule}'`).join(' ')}`;
  const prelude = [
    `EVENT='${event}'; BASE=aaa; HEAD=bbb; BASE_REF='${base}'; REPO=ParaOrg/Para`,
    // The outputs go to a file, as on a runner, and are printed when the step ends.
    'GITHUB_OUTPUT=$(mktemp)',
    // The step silences gh's own errors, so the stand-in says what it was asked on a copy of stderr.
    'exec 3>&2',
    `trap 'cat "$GITHUB_OUTPUT"; rm -f "$GITHUB_OUTPUT"' EXIT`,
    `git() { printf '%s\\n' ${files.map((file) => `'${file}'`).join(' ')}; }`,
    `gh() { echo "asked: $2" >&3; ${answer}; }`,
  ].join('\n');
  const run = spawnSync('bash', ['-e', '-c', `${prelude}\n${SCRIPT}`], { encoding: 'utf8' });
  assert.equal(run.status, 0, `the step succeeds\n${run.stdout}\n${run.stderr}`);
  const outputs = Object.fromEntries(
    [...run.stdout.matchAll(/^([a-z]+)=(\S+)$/gm)].map((match) => [match[1], match[2]]),
  );
  return { ...outputs, asked: /asked: (\S+)/.exec(run.stderr)?.[1] ?? null, said: run.stdout };
}

const SUITES = ['public', 'studio', 'contribute', 'drawing', 'storybook'];
const EDITOR_AND_SHARED = ['src/features/studio/drawing/use-drawing.ts', 'src/shared/ui/toast.tsx'];

test('with no merge queue on the branch, a pull request runs every suite its files select', () => {
  const run = selected({ files: EDITOR_AND_SHARED });
  for (const output of [...SUITES, 'build']) assert.equal(run[output], 'true', output);
  assert.match(run.preview, /pwa-test.*handover-test.*contribute-offline-test/);
  assert.equal(run.asked, 'repos/ParaOrg/Para/rules/branches/staging');
  assert.match(run.said, /staging has no merge queue/);
});

test('with a merge queue on the branch, a pull request runs the build job alone', () => {
  const run = selected({ files: EDITOR_AND_SHARED, rules: WITH_QUEUE });
  for (const output of SUITES) assert.equal(run[output], 'false', output);
  assert.equal(run.preview, '[]');
  assert.equal(run.build, 'true', 'the build job still runs: formatting, lint, build, unit checks');
  assert.match(run.said, /staging has a merge queue/);
});

test('the queue is the base branch’s own: a pull request into a branch without one is not narrowed', () => {
  // `main` asked about, and answering with no queue, while `staging` has one.
  const run = selected({ files: EDITOR_AND_SHARED, base: 'main', rules: RULES });
  assert.equal(run.asked, 'repos/ParaOrg/Para/rules/branches/main');
  for (const output of [...SUITES, 'build']) assert.equal(run[output], 'true', output);
});

test('when GitHub’s rules cannot be read, a pull request runs every suite its files select', () => {
  const run = selected({ files: EDITOR_AND_SHARED, rules: null });
  for (const output of [...SUITES, 'build']) assert.equal(run[output], 'true', output);
  assert.match(run.said, /has no merge queue/);
});

test('a rule that only looks like a queue narrows nothing', () => {
  const run = selected({ files: EDITOR_AND_SHARED, rules: [...RULES, 'merge_queue_draft'] });
  for (const output of SUITES) assert.equal(run[output], 'true', output);
});

test('under a queue the files still decide whether the build job runs', () => {
  const docs = selected({ files: ['docs/agents/how-we-work.md', 'README.md'], rules: WITH_QUEUE });
  assert.equal(docs.build, 'false', 'a change to the docs alone needs no build');
  const unit = selected({ files: ['tests/unit/routes-test.mjs'], rules: WITH_QUEUE });
  assert.equal(unit.build, 'true', 'a unit check’s change runs the build job');
  for (const output of SUITES) assert.equal(unit[output], 'false', output);
});

for (const event of ['merge_group', 'push', 'schedule', 'workflow_dispatch']) {
  test(`a ${event} run selects everything and never asks about a queue`, () => {
    const run = selected({ event, rules: WITH_QUEUE });
    for (const output of [...SUITES, 'build']) assert.equal(run[output], 'true', output);
    assert.match(run.preview, /pwa-test.*handover-test.*contribute-offline-test/);
    assert.equal(run.asked, null, 'the queue’s own run is never narrowed by the queue');
  });
}

test('Storybook plays runs on its own output, so a queue can take it over', () => {
  const job = WORKFLOW.slice(WORKFLOW.indexOf('\n  storybook:\n')).split(/\n\n/)[0];
  assert.match(job, /\n {4}if: needs\.changes\.outputs\.storybook == 'true'\n/);
  assert.ok(WORKFLOW.includes('      storybook: ${{ steps.scope.outputs.storybook }}\n'));
});

test('the step reads the rules with the run’s own token, for the pull request’s base branch', () => {
  const step = WORKFLOW.slice(WORKFLOW.indexOf('      - id: scope\n')).split(/\n\n/)[0];
  assert.ok(step.includes('BASE_REF: ${{ github.event.pull_request.base.ref }}'));
  assert.ok(step.includes('GH_TOKEN: ${{ github.token }}'));
  assert.ok(step.includes('gh api "repos/$REPO/rules/branches/$BASE_REF"'));
});
