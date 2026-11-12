// The two checks a pull request shows (.github/workflows/ci.yml, "Build and the public map" and
// "The editor") pass only on results they know: the change detection succeeded, and every job
// under them succeeded or was not needed. Any other word for a result fails the check: the list of
// words a runner can give is not ours to keep, so the checks name the two that mean "fine".
//
//   node --test tests/unit/ci-summary-jobs-test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const WORKFLOW = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');

/** A summary job, by the name the pull request shows: what it needs, and its one step's script. */
const summaryJob = (name) => {
  const from = WORKFLOW.indexOf(`    name: ${name}\n`);
  assert.ok(from > 0, `ci.yml has a job named "${name}"`);
  const job = WORKFLOW.slice(from).split(/\n\n/)[0];
  const needs = /needs: \[([^\]]+)\]/.exec(job)[1].split(', ');
  const results = /RESULTS: (.+)\n/.exec(job)[1];
  const lines = job.slice(job.indexOf('        run: |\n')).split('\n').slice(1);
  return { job, needs, results, script: lines.map((line) => line.slice(10)).join('\n') };
};
/** The step run as the runner runs it, with the results its needs gave. */
const passes = (script, results) =>
  spawnSync('bash', ['-e', '-c', script], { env: { ...process.env, RESULTS: results } }).status ===
  0;

for (const name of ['Build and the public map', 'The editor']) {
  test(`"${name}" reads the result of every job it needs, the change detection first`, () => {
    const { job, needs, results } = summaryJob(name);
    assert.match(job, /\n {4}if: always\(\)\n/);
    assert.equal(needs[0], 'changes');
    assert.equal(results, needs.map((need) => `\${{ needs.${need}.result }}`).join(' '));
  });

  test(`"${name}" passes when everything under it passed or was not needed`, () => {
    const { script, needs } = summaryJob(name);
    const all = (result) => needs.map(() => result).join(' ');
    assert.equal(passes(script, all('success')), true);
    // A change to the docs alone: the change detection ran and nothing else was needed.
    assert.equal(passes(script, `success ${all('skipped').slice(8)}`), true);
    assert.equal(passes(script, `success success ${all('skipped').slice(16)}`), true);
  });

  test(`"${name}" fails on a failure, a cancellation, and any result it does not know`, () => {
    const { script, needs } = summaryJob(name);
    const rest = needs.slice(1);
    const withOne = (result) =>
      ['success', result, ...rest.slice(1).map(() => 'success')].join(' ');
    for (const result of ['failure', 'cancelled', 'abandoned', 'timed_out', '']) {
      assert.equal(passes(script, withOne(result)), false, `a job under it "${result}"`);
    }
  });

  test(`"${name}" fails when the change detection did not succeed, whatever the rest say`, () => {
    const { script, needs } = summaryJob(name);
    const skipped = needs.slice(1).map(() => 'skipped');
    for (const changes of ['abandoned', 'skipped', 'failure', 'cancelled']) {
      assert.equal(passes(script, [changes, ...skipped].join(' ')), false, `changes "${changes}"`);
    }
  });
}
