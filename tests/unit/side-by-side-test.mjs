// CI's build job runs its checks at once (scripts/checks/side-by-side.mjs): every check runs to
// its end whatever the others do, each one's output is printed under its verdict, every failure
// is named, and one failure fails the step.
//
//   node --test tests/unit/side-by-side-test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseCheck, report, runAll } from '../../scripts/checks/side-by-side.mjs';

const SCRIPT = fileURLToPath(new URL('../../scripts/checks/side-by-side.mjs', import.meta.url));
const node = (code) => `node -e "${code}"`;
const PASSES = `passes::${node("console.log('fine')")}`;
const FAILS = `fails::${node("console.error('broken'); process.exit(3)")}`;
const ALSO_FAILS = `also fails::${node('process.exit(1)')}`;

test('an argument is name::command; anything else is refused', () => {
  assert.deepEqual(parseCheck('Lint::npm run lint -- --format x'), {
    name: 'Lint',
    command: 'npm run lint -- --format x',
  });
  for (const bad of ['npm run lint', '::npm run lint', 'Lint::', 'Lint:npm run lint']) {
    assert.throws(() => parseCheck(bad), /not name::command/);
  }
});

test('every check runs to its end, and the results come back in the order given', async () => {
  const results = await runAll([FAILS, PASSES, ALSO_FAILS].map(parseCheck));
  assert.deepEqual(
    results.map(({ name, code }) => [name, code]),
    [
      ['fails', 3],
      ['passes', 0],
      ['also fails', 1],
    ],
  );
  assert.match(results[0].output, /broken/);
  assert.match(results[1].output, /fine/);
});

test('the checks run at once: two that each wait take about as long as one', async () => {
  const wait = node('setTimeout(() => {}, 1500)');
  const started = Date.now();
  await runAll([parseCheck(`a::${wait}`), parseCheck(`b::${wait}`)]);
  assert.ok(Date.now() - started < 2800, 'two 1.5 s checks took under 2.8 s together');
});

test('the report prints each check’s output under its verdict and names every failure', async () => {
  const results = await runAll([FAILS, PASSES, ALSO_FAILS].map(parseCheck));
  const text = report(results, false);
  assert.match(text, /=== FAIL {2}fails {2}\(\d+\.\d s\)\n\$ node -e .*\nbroken/);
  assert.match(text, /=== PASS {2}passes {2}\(\d+\.\d s\)\n\$ node -e .*\nfine/);
  assert.match(text, /FAILED {2}fails \(exit 3\)\nFAILED {2}also fails \(exit 1\)/);
  assert.match(text, /2 of 3 checks failed: fails, also fails\.$/);
  const onARunner = report(results, true);
  assert.match(onARunner, /::group::FAIL {2}fails/);
  assert.match(
    onARunner,
    /::error::fails failed \(exit 3\)\n::error::also fails failed \(exit 1\)/,
  );
});

test('run as CI runs it: one failure fails the step, and all passing passes it', () => {
  const failed = spawnSync('node', [SCRIPT, PASSES, FAILS], { encoding: 'utf8' });
  assert.equal(failed.status, 1);
  assert.match(failed.stdout, /fine/);
  assert.match(failed.stdout, /1 of 2 checks failed: fails\./);
  const passed = spawnSync('node', [SCRIPT, PASSES, PASSES.replace('passes', 'passes too')], {
    encoding: 'utf8',
  });
  assert.equal(passed.status, 0);
  assert.match(passed.stdout, /All 2 checks passed\./);
});

const WORKFLOW = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
/** One job of the workflow, from its id to the blank line that ends it. */
const jobOf = (id) => WORKFLOW.slice(WORKFLOW.indexOf(`\n  ${id}:\n`)).split(/\n\n/)[0];
/** The commands a job's side-by-side step runs, in the order given. */
const sideBySide = (job) => {
  const lines = job.slice(job.indexOf('node scripts/checks/side-by-side.mjs')).split('\n');
  const last = lines.findIndex((line, i) => i > 0 && !line.endsWith('\\'));
  return lines
    .slice(1, last + 1)
    .map((line) => parseCheck(line.trim().replace(/ \\$/, '').slice(1, -1)).command);
};

test('the build job’s step runs four of the six checks the job ran one by one before', () => {
  assert.deepEqual(sideBySide(jobOf('build')), [
    'npm run lint -- --format ./scripts/checks/eslint-formatter.mjs',
    'node scripts/checks/long-files.mjs --base \\"$RUNNER_TEMP/long-files-base.json\\" --base-ref \\"$BASE\\"',
    'npm run docs:architecture:check',
    'npm run build',
  ]);
});

test('the other two, formatting and the unit checks, run in a job apart, under both summary checks', () => {
  const workflow = WORKFLOW;
  const job = jobOf('unit');
  assert.ok(
    job.includes("\n    if: needs.changes.outputs.build == 'true'\n"),
    'on with the build job',
  );
  assert.deepEqual(sideBySide(job), ['npm run format:check', 'npm run test:unit']);
  for (const command of ['npm run format:check', 'npm run test:unit']) {
    assert.equal(workflow.split(command).length - 1, 1, `"${command}" runs nowhere else`);
  }
  for (const summary of ['Build and the public map', 'The editor']) {
    const from = workflow.indexOf(`    name: ${summary}\n    needs: [`);
    assert.ok(from > 0, `"${summary}" is a job with needs`);
    const needs = workflow.slice(workflow.indexOf('[', from) + 1, workflow.indexOf(']', from));
    assert.ok(needs.split(', ').includes('unit'), `"${summary}" needs it`);
  }
});
